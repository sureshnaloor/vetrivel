import express from "express";
import { Db, ObjectId } from "mongodb";
import clientPromise from "../lib/db";
import { requireUser } from "../middleware/requireUser";

export const leaderboardRouter = express.Router();

leaderboardRouter.use(requireUser);

type RankRow = {
  email: string;
  name: string;
  visited: number;
  total: number;
  completionPct: number;
  isSelf: boolean;
};

function displayName(email: string, name?: string | null) {
  if (name && String(name).trim()) return String(name).trim();
  return email.split("@")[0] || email;
}

async function friendEmails(db: Db, userEmail: string): Promise<string[]> {
  const accepted = await db
    .collection("friend_requests")
    .find({
      status: "accepted",
      $or: [{ fromEmail: userEmail }, { toEmail: userEmail }],
    })
    .toArray();

  const emails = new Set<string>();
  for (const r of accepted) {
    if (r.fromEmail === userEmail && r.toEmail) emails.add(String(r.toEmail));
    if (r.toEmail === userEmail && r.fromEmail) emails.add(String(r.fromEmail));
  }
  return [...emails];
}

async function statsForEmails(
  db: Db,
  emails: string[],
  locationId?: string | null
): Promise<Map<string, { visited: number; total: number }>> {
  const match: Record<string, unknown> = {
    userEmail: { $in: emails },
    category: { $in: ["nest", "interest"] },
  };
  if (locationId) {
    match.locationId = locationId;
  }

  const rows = await db
    .collection("user_places")
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: "$userEmail",
          total: { $sum: 1 },
          visited: {
            $sum: {
              $cond: [{ $eq: ["$status", "visited"] }, 1, 0],
            },
          },
        },
      },
    ])
    .toArray();

  const map = new Map<string, { visited: number; total: number }>();
  for (const email of emails) {
    map.set(email, { visited: 0, total: 0 });
  }
  for (const row of rows) {
    map.set(String(row._id), {
      visited: Number(row.visited) || 0,
      total: Number(row.total) || 0,
    });
  }
  return map;
}

async function nameMapForEmails(
  db: Db,
  emails: string[],
  selfEmail: string,
  selfName?: string
) {
  const names = new Map<string, string>();
  names.set(selfEmail, displayName(selfEmail, selfName));

  const friendReqs = await db
    .collection("friend_requests")
    .find({
      status: "accepted",
      $or: [
        { fromEmail: selfEmail, toEmail: { $in: emails } },
        { toEmail: selfEmail, fromEmail: { $in: emails } },
      ],
    })
    .toArray();

  for (const r of friendReqs) {
    if (r.fromEmail !== selfEmail && r.fromName) {
      names.set(String(r.fromEmail), displayName(String(r.fromEmail), r.fromName));
    }
    if (r.toEmail !== selfEmail && r.toName) {
      names.set(String(r.toEmail), displayName(String(r.toEmail), r.toName));
    }
  }

  const members = await db
    .collection("community_members")
    .find({ userEmail: { $in: emails } })
    .toArray();
  for (const m of members) {
    const email = String(m.userEmail);
    if (m.userName) names.set(email, displayName(email, String(m.userName)));
  }

  for (const email of emails) {
    if (!names.has(email)) names.set(email, displayName(email));
  }
  return names;
}

function toRanked(
  emails: string[],
  stats: Map<string, { visited: number; total: number }>,
  names: Map<string, string>,
  selfEmail: string
): RankRow[] {
  const rows: RankRow[] = emails.map((email) => {
    const s = stats.get(email) || { visited: 0, total: 0 };
    const completionPct =
      s.total > 0 ? Math.round((s.visited / s.total) * 100) : 0;
    return {
      email,
      name: names.get(email) || displayName(email),
      visited: s.visited,
      total: s.total,
      completionPct,
      isSelf: email === selfEmail,
    };
  });

  rows.sort((a, b) => {
    if (b.visited !== a.visited) return b.visited - a.visited;
    if (b.completionPct !== a.completionPct) return b.completionPct - a.completionPct;
    return a.name.localeCompare(b.name);
  });
  return rows;
}

// GET /api/leaderboard?scope=overall|space&locationId=
leaderboardRouter.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const scope = typeof req.query.scope === "string" ? req.query.scope : "overall";
    const locationId =
      typeof req.query.locationId === "string" ? req.query.locationId.trim() : "";

    const client = await clientPromise;
    const db = client.db();

    const friends = await friendEmails(db, user.email);
    const emails = [user.email, ...friends];

    if (scope === "space") {
      if (!locationId || !ObjectId.isValid(locationId)) {
        return res.status(400).json({ error: "locationId is required for space scope" });
      }

      const loc = await db.collection("user_locations").findOne({
        _id: new ObjectId(locationId),
      });
      if (!loc) {
        return res.status(404).json({ error: "Space not found" });
      }

      const stats = await statsForEmails(db, emails, locationId);
      const names = await nameMapForEmails(db, emails, user.email, user.name);
      let rankings = toRanked(emails, stats, names, user.email);

      // Keep people with temples in this space, plus always include self + space owner
      rankings = rankings.filter(
        (r) => r.total > 0 || r.isSelf || r.email === loc.userEmail
      );

      return res.json({
        scope: "space",
        locationId,
        spaceName: loc.name || "Sacred space",
        rankings,
      });
    }

    const stats = await statsForEmails(db, emails, null);
    const names = await nameMapForEmails(db, emails, user.email, user.name);
    const rankings = toRanked(emails, stats, names, user.email);

    res.json({
      scope: "overall",
      rankings,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
