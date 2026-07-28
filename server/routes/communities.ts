import express from "express";
import { ObjectId, type Db } from "mongodb";
import clientPromise from "../lib/db";
import { requireUser } from "../middleware/requireUser";

export const communitiesRouter = express.Router();

communitiesRouter.use(requireUser);

function oid(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

async function getSpace(db: Db, spaceId: string) {
  const id = oid(spaceId);
  if (!id) return null;
  return db.collection("user_locations").findOne({ _id: id });
}

async function isMember(db: Db, spaceId: string, userEmail: string) {
  const m = await db.collection("community_members").findOne({ spaceId, userEmail });
  return !!m;
}

async function requireMembership(db: Db, spaceId: string, userEmail: string) {
  return isMember(db, spaceId, userEmail);
}

function displayName(user: { name?: string; email: string }) {
  return user.name || user.email.split("@")[0];
}

// GET /api/communities
// Browse published spaces (+ membership / interest flags for current user)
communitiesRouter.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const client = await clientPromise;
    const db = client.db();

    const published = await db
      .collection("user_locations")
      .find({ visibility: "published" })
      .sort({ publishedAt: -1, createdAt: -1 })
      .toArray();

    const spaceIds = published.map((s) => String(s._id));

    const [myMemberships, myPending, memberCounts] = await Promise.all([
      db
        .collection("community_members")
        .find({ userEmail: user.email, spaceId: { $in: spaceIds } })
        .toArray(),
      db
        .collection("community_interest_requests")
        .find({
          fromEmail: user.email,
          status: "pending",
          spaceId: { $in: spaceIds },
        })
        .toArray(),
      spaceIds.length
        ? db
            .collection("community_members")
            .aggregate([
              { $match: { spaceId: { $in: spaceIds } } },
              { $group: { _id: "$spaceId", count: { $sum: 1 } } },
            ])
            .toArray()
        : Promise.resolve([] as Array<{ _id: string; count: number }>),
    ]);

    const memberSet = new Set(myMemberships.map((m) => String(m.spaceId)));
    const pendingSet = new Set(myPending.map((p) => String(p.spaceId)));
    const countMap = new Map(
      memberCounts.map((c) => [String(c._id), c.count as number])
    );

    const list = published.map((s) => {
      const spaceId = String(s._id);
      const isOwner = s.userEmail === user.email;
      return {
        _id: spaceId,
        name: s.name,
        address: s.address || "",
        coordinates: s.coordinates,
        purpose: s.purpose || "",
        ownerEmail: s.userEmail,
        ownerName: isOwner ? displayName(user) : s.userEmail?.split("@")[0] || "Host",
        publishedAt: s.publishedAt || s.createdAt,
        memberCount: countMap.get(spaceId) || 0,
        isOwner,
        isMember: memberSet.has(spaceId) || isOwner,
        interestStatus: memberSet.has(spaceId) || isOwner
          ? "joined"
          : pendingSet.has(spaceId)
            ? "pending"
            : "none",
      };
    });

    // Enrich owner names from memberships where possible
    const ownerEmails = [...new Set(list.map((l) => l.ownerEmail).filter(Boolean))];
    const ownerMembers = await db
      .collection("community_members")
      .find({ role: "owner", userEmail: { $in: ownerEmails } })
      .toArray();
    const ownerNameMap = new Map(
      ownerMembers.map((m) => [String(m.userEmail), String(m.userName || m.userEmail)])
    );
    for (const item of list) {
      if (ownerNameMap.has(item.ownerEmail)) {
        item.ownerName = ownerNameMap.get(item.ownerEmail)!;
      }
    }

    res.json(list);
  } catch (error) {
    console.error("Error browsing communities:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/communities/mine
// Spaces I own that are published + communities I joined
communitiesRouter.get("/mine", async (req, res) => {
  try {
    const user = (req as any).user;
    const client = await clientPromise;
    const db = client.db();

    const memberships = await db
      .collection("community_members")
      .find({ userEmail: user.email })
      .sort({ joinedAt: -1 })
      .toArray();

    res.json(memberships);
  } catch (error) {
    console.error("Error fetching my communities:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/communities/interests/incoming — owner reviews interest
communitiesRouter.get("/interests/incoming", async (req, res) => {
  try {
    const user = (req as any).user;
    const client = await clientPromise;
    const db = client.db();

    const requests = await db
      .collection("community_interest_requests")
      .find({ ownerEmail: user.email, status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(requests);
  } catch (error) {
    console.error("Error fetching incoming interests:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/communities/interests/sent
communitiesRouter.get("/interests/sent", async (req, res) => {
  try {
    const user = (req as any).user;
    const client = await clientPromise;
    const db = client.db();

    const requests = await db
      .collection("community_interest_requests")
      .find({ fromEmail: user.email })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(requests);
  } catch (error) {
    console.error("Error fetching sent interests:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/communities/:spaceId/interest
communitiesRouter.post("/:spaceId/interest", async (req, res) => {
  try {
    const user = (req as any).user;
    const { spaceId } = req.params;
    const message =
      typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 500) : "";

    const client = await clientPromise;
    const db = client.db();
    const space = await getSpace(db, spaceId);

    if (!space || space.visibility !== "published") {
      return res.status(404).json({ error: "Published community not found" });
    }
    if (space.userEmail === user.email) {
      return res.status(400).json({ error: "You already host this community" });
    }

    const existingMember = await db.collection("community_members").findOne({
      spaceId,
      userEmail: user.email,
    });
    if (existingMember) {
      return res.status(409).json({ error: "You are already a member" });
    }

    const pending = await db.collection("community_interest_requests").findOne({
      spaceId,
      fromEmail: user.email,
      status: "pending",
    });
    if (pending) {
      return res.status(409).json({ error: "Interest already pending" });
    }

    // Reuse rejected request → pending again
    const rejected = await db.collection("community_interest_requests").findOne({
      spaceId,
      fromEmail: user.email,
      status: "rejected",
    });

    if (rejected) {
      await db.collection("community_interest_requests").updateOne(
        { _id: rejected._id },
        {
          $set: {
            status: "pending",
            message,
            fromName: displayName(user),
            spaceName: space.name,
            updatedAt: new Date(),
          },
        }
      );
      return res.json({
        _id: rejected._id,
        spaceId,
        spaceName: space.name,
        ownerEmail: space.userEmail,
        fromEmail: user.email,
        fromName: displayName(user),
        message,
        status: "pending",
      });
    }

    const doc = {
      spaceId,
      spaceName: space.name || "",
      ownerEmail: space.userEmail,
      fromEmail: user.email,
      fromName: displayName(user),
      message,
      status: "pending" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection("community_interest_requests").insertOne(doc);
    res.json({ _id: result.insertedId, ...doc });
  } catch (error) {
    console.error("Error sending community interest:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/communities/interests/:id/accept
communitiesRouter.patch("/interests/:id/accept", async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const requestId = oid(id);
    if (!requestId) return res.status(400).json({ error: "Invalid request id" });

    const client = await clientPromise;
    const db = client.db();

    const interest = await db.collection("community_interest_requests").findOne({
      _id: requestId,
      ownerEmail: user.email,
      status: "pending",
    });
    if (!interest) {
      return res.status(404).json({ error: "Interest request not found" });
    }

    await db.collection("community_interest_requests").updateOne(
      { _id: requestId },
      { $set: { status: "accepted", updatedAt: new Date() } }
    );

    await db.collection("community_members").updateOne(
      { spaceId: interest.spaceId, userEmail: interest.fromEmail },
      {
        $set: {
          spaceId: String(interest.spaceId),
          spaceName: interest.spaceName || "",
          userEmail: interest.fromEmail,
          userName: interest.fromName || interest.fromEmail,
          role: "member",
          joinedVia: "interest_request",
          updatedAt: new Date(),
        },
        $setOnInsert: { joinedAt: new Date() },
      },
      { upsert: true }
    );

    // System-ish board note
    await db.collection("community_messages").insertOne({
      spaceId: String(interest.spaceId),
      userEmail: "system",
      userName: "Community",
      body: `${interest.fromName || interest.fromEmail} joined the community.`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error accepting interest:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/communities/interests/:id/reject
communitiesRouter.patch("/interests/:id/reject", async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const requestId = oid(id);
    if (!requestId) return res.status(400).json({ error: "Invalid request id" });

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("community_interest_requests").findOneAndUpdate(
      { _id: requestId, ownerEmail: user.email, status: "pending" },
      { $set: { status: "rejected", updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    const doc =
      result && typeof result === "object" && "value" in result
        ? (result as { value: unknown }).value
        : result;

    if (!doc) {
      return res.status(404).json({ error: "Interest request not found" });
    }

    res.json(doc);
  } catch (error) {
    console.error("Error rejecting interest:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/communities/:spaceId/members
communitiesRouter.get("/:spaceId/members", async (req, res) => {
  try {
    const user = (req as any).user;
    const { spaceId } = req.params;
    const client = await clientPromise;
    const db = client.db();

    const space = await getSpace(db, spaceId);
    if (!space) return res.status(404).json({ error: "Space not found" });

    const canView =
      space.userEmail === user.email ||
      space.visibility === "published" ||
      (await isMember(db, spaceId, user.email));
    if (!canView) {
      return res.status(403).json({ error: "Not allowed to view members" });
    }

    const members = await db
      .collection("community_members")
      .find({ spaceId })
      .sort({ role: 1, joinedAt: 1 })
      .toArray();

    res.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/communities/:spaceId/members/me — leave community
communitiesRouter.delete("/:spaceId/members/me", async (req, res) => {
  try {
    const user = (req as any).user;
    const { spaceId } = req.params;
    const client = await clientPromise;
    const db = client.db();

    const member = await db.collection("community_members").findOne({
      spaceId,
      userEmail: user.email,
    });
    if (!member) {
      return res.status(404).json({ error: "Not a member" });
    }
    if (member.role === "owner") {
      return res.status(400).json({
        error: "Hosts cannot leave. Unpublish the space instead.",
      });
    }

    await db.collection("community_members").deleteOne({ _id: member._id });
    res.json({ success: true });
  } catch (error) {
    console.error("Error leaving community:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/communities/:spaceId/messages — board (members only)
communitiesRouter.get("/:spaceId/messages", async (req, res) => {
  try {
    const user = (req as any).user;
    const { spaceId } = req.params;
    const client = await clientPromise;
    const db = client.db();

    const space = await getSpace(db, spaceId);
    if (!space) return res.status(404).json({ error: "Space not found" });

    const allowed =
      space.userEmail === user.email || (await requireMembership(db, spaceId, user.email));
    if (!allowed) {
      return res.status(403).json({ error: "Join this community to view the board" });
    }

    // Ensure owner is always a member record
    if (space.userEmail === user.email) {
      await db.collection("community_members").updateOne(
        { spaceId, userEmail: user.email },
        {
          $set: {
            spaceId,
            spaceName: space.name || "",
            userEmail: user.email,
            userName: displayName(user),
            role: "owner",
            joinedVia: "publish",
            updatedAt: new Date(),
          },
          $setOnInsert: { joinedAt: new Date() },
        },
        { upsert: true }
      );
    }

    const messages = await db
      .collection("community_messages")
      .find({ spaceId })
      .sort({ createdAt: 1 })
      .limit(200)
      .toArray();

    res.json(messages);
  } catch (error) {
    console.error("Error fetching community messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/communities/:spaceId/messages
communitiesRouter.post("/:spaceId/messages", async (req, res) => {
  try {
    const user = (req as any).user;
    const { spaceId } = req.params;
    const body =
      typeof req.body?.body === "string" ? req.body.body.trim().slice(0, 4000) : "";

    if (!body) {
      return res.status(400).json({ error: "Message body is required" });
    }

    const client = await clientPromise;
    const db = client.db();
    const space = await getSpace(db, spaceId);
    if (!space) return res.status(404).json({ error: "Space not found" });

    const allowed =
      space.userEmail === user.email || (await requireMembership(db, spaceId, user.email));
    if (!allowed) {
      return res.status(403).json({ error: "Join this community to post on the board" });
    }

    const doc = {
      spaceId,
      userEmail: user.email,
      userName: displayName(user),
      body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection("community_messages").insertOne(doc);
    res.json({ _id: result.insertedId, ...doc });
  } catch (error) {
    console.error("Error posting community message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/communities/:spaceId/messages/:messageId
communitiesRouter.delete("/:spaceId/messages/:messageId", async (req, res) => {
  try {
    const user = (req as any).user;
    const { spaceId, messageId } = req.params;
    const mid = oid(messageId);
    if (!mid) return res.status(400).json({ error: "Invalid message id" });

    const client = await clientPromise;
    const db = client.db();
    const space = await getSpace(db, spaceId);
    if (!space) return res.status(404).json({ error: "Space not found" });

    const message = await db.collection("community_messages").findOne({
      _id: mid,
      spaceId,
    });
    if (!message) return res.status(404).json({ error: "Message not found" });

    const isOwner = space.userEmail === user.email;
    const isAuthor = message.userEmail === user.email;
    if (!isOwner && !isAuthor) {
      return res.status(403).json({ error: "Not allowed to delete this message" });
    }

    await db.collection("community_messages").deleteOne({ _id: mid });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting community message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
