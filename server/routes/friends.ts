import express from "express";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import clientPromise from "../lib/db";
import { requireUser } from "../middleware/requireUser";

export const friendsRouter = express.Router();

friendsRouter.use(requireUser);

const MAX_FRIENDS_FREE = 20;

// Helper: get the friends collection
async function getFriendsCol() {
  const client = await clientPromise;
  const db = client.db();
  return db.collection("friend_requests");
}

// Helper: get invite links collection
async function getInvitesCol() {
  const client = await clientPromise;
  const db = client.db();
  return db.collection("friend_invites");
}

// Helper: get nest follows collection
async function getNestFollowsCol() {
  const client = await clientPromise;
  const db = client.db();
  return db.collection("nest_follows");
}

// Helper: get user_locations collection
async function getLocationsCol() {
  const client = await clientPromise;
  const db = client.db();
  return db.collection("user_locations");
}

// Helper: get accepted friend emails for a user
async function getFriendEmails(userEmail: string): Promise<string[]> {
  const col = await getFriendsCol();
  const accepted = await col
    .find({
      status: "accepted",
      $or: [{ fromEmail: userEmail }, { toEmail: userEmail }],
    })
    .toArray();

  return accepted.map((doc) =>
    doc.fromEmail === userEmail ? doc.toEmail : doc.fromEmail
  );
}

// Helper: count accepted friends for a user
async function countFriends(email: string): Promise<number> {
  const col = await getFriendsCol();
  return col.countDocuments({
    status: "accepted",
    $or: [{ fromEmail: email }, { toEmail: email }],
  });
}

// ─── GET /api/friends ────────────────────────────────────────────────────────
// List all accepted friends for the current user
friendsRouter.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const col = await getFriendsCol();

    const accepted = await col
      .find({
        status: "accepted",
        $or: [{ fromEmail: user.email }, { toEmail: user.email }],
      })
      .sort({ updatedAt: -1 })
      .toArray();

    // Map to a simple friend object (the *other* person)
    const friends = accepted.map((doc) => {
      const isSender = doc.fromEmail === user.email;
      return {
        _id: doc._id,
        email: isSender ? doc.toEmail : doc.fromEmail,
        name: isSender ? doc.toName || doc.toEmail : doc.fromName || doc.fromEmail,
        since: doc.updatedAt || doc.createdAt,
      };
    });

    res.json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── GET /api/friends/requests ───────────────────────────────────────────────
// List pending incoming friend requests
friendsRouter.get("/requests", async (req, res) => {
  try {
    const user = (req as any).user;
    const col = await getFriendsCol();

    const requests = await col
      .find({ toEmail: user.email, status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(requests);
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── GET /api/friends/sent ───────────────────────────────────────────────────
// List pending outgoing friend requests
friendsRouter.get("/sent", async (req, res) => {
  try {
    const user = (req as any).user;
    const col = await getFriendsCol();

    const sent = await col
      .find({ fromEmail: user.email, status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(sent);
  } catch (error) {
    console.error("Error fetching sent requests:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── POST /api/friends/request ───────────────────────────────────────────────
// Send a friend request by email
friendsRouter.post("/request", async (req, res) => {
  try {
    const user = (req as any).user;
    const { toEmail } = req.body;

    if (!toEmail || typeof toEmail !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedTo = toEmail.trim().toLowerCase();

    // Cannot add yourself
    if (normalizedTo === user.email.toLowerCase()) {
      return res.status(400).json({ error: "You cannot send a friend request to yourself" });
    }

    // Check friend limit
    const friendCount = await countFriends(user.email);
    if (friendCount >= MAX_FRIENDS_FREE) {
      return res.status(403).json({
        error: `Free plan allows up to ${MAX_FRIENDS_FREE} friends.`,
      });
    }

    const col = await getFriendsCol();

    // Check for existing relationship (in either direction)
    const existing = await col.findOne({
      $or: [
        { fromEmail: user.email, toEmail: normalizedTo },
        { fromEmail: normalizedTo, toEmail: user.email },
      ],
    });

    if (existing) {
      if (existing.status === "accepted") {
        return res.status(409).json({ error: "You are already friends" });
      }
      if (existing.status === "pending") {
        return res.status(409).json({ error: "A friend request is already pending" });
      }
      // If rejected, allow re-sending by updating the existing doc
      if (existing.status === "rejected") {
        await col.updateOne(
          { _id: existing._id },
          {
            $set: {
              fromEmail: user.email,
              fromName: user.name || user.email,
              toEmail: normalizedTo,
              status: "pending",
              updatedAt: new Date(),
            },
          }
        );
        const updated = await col.findOne({ _id: existing._id });
        return res.json(updated);
      }
    }

    const newRequest = {
      fromEmail: user.email,
      fromName: user.name || user.email,
      toEmail: normalizedTo,
      toName: "", // will be filled when recipient accepts
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await col.insertOne(newRequest);
    res.json({ _id: result.insertedId, ...newRequest });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── PATCH /api/friends/request/:id/accept ───────────────────────────────────
friendsRouter.patch("/request/:id/accept", async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const col = await getFriendsCol();

    const request = await col.findOne({
      _id: new ObjectId(id),
      toEmail: user.email,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    // Check friend limit for acceptor too
    const friendCount = await countFriends(user.email);
    if (friendCount >= MAX_FRIENDS_FREE) {
      return res.status(403).json({
        error: `Free plan allows up to ${MAX_FRIENDS_FREE} friends.`,
      });
    }

    await col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "accepted",
          toName: user.name || user.email,
          updatedAt: new Date(),
        },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── PATCH /api/friends/request/:id/reject ───────────────────────────────────
friendsRouter.patch("/request/:id/reject", async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const col = await getFriendsCol();

    const request = await col.findOne({
      _id: new ObjectId(id),
      toEmail: user.email,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "rejected", updatedAt: new Date() } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── DELETE /api/friends/:id ─────────────────────────────────────────────────
// Unfriend — removes the accepted friendship
friendsRouter.delete("/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const col = await getFriendsCol();

    const result = await col.deleteOne({
      _id: new ObjectId(id),
      status: "accepted",
      $or: [{ fromEmail: user.email }, { toEmail: user.email }],
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Friendship not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing friend:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── POST /api/friends/invite ────────────────────────────────────────────────
// Generate a single-use shareable invite link token
friendsRouter.post("/invite", async (req, res) => {
  try {
    const user = (req as any).user;
    const col = await getInvitesCol();

    // Always generate a fresh single-use token
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    await col.insertOne({
      email: user.email,
      name: user.name || user.email,
      token,
      expiresAt,
      createdAt: new Date(),
    });

    res.json({ token });
  } catch (error) {
    console.error("Error generating invite:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── POST /api/friends/invite/accept ─────────────────────────────────────────
// Accept an invite link by providing the token
friendsRouter.post("/invite/accept", async (req, res) => {
  try {
    const user = (req as any).user;
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Invite token is required" });
    }

    const invitesCol = await getInvitesCol();
    const invite = await invitesCol.findOne({
      token,
      expiresAt: { $gt: new Date() },
    });

    if (!invite) {
      return res.status(404).json({ error: "Invalid or expired invite link" });
    }

    // Cannot accept your own invite
    if (invite.email.toLowerCase() === user.email.toLowerCase()) {
      return res.status(400).json({ error: "You cannot accept your own invite" });
    }

    const friendsCol = await getFriendsCol();

    // Check if already friends or pending
    const existing = await friendsCol.findOne({
      $or: [
        { fromEmail: user.email, toEmail: invite.email },
        { fromEmail: invite.email, toEmail: user.email },
      ],
    });

    if (existing) {
      if (existing.status === "accepted") {
        return res.status(409).json({ error: "You are already friends" });
      }
      if (existing.status === "pending") {
        // Auto-accept the pending request
        await friendsCol.updateOne(
          { _id: existing._id },
          {
            $set: {
              status: "accepted",
              toName: existing.toEmail === user.email ? (user.name || user.email) : existing.toName,
              updatedAt: new Date(),
            },
          }
        );
        return res.json({ success: true, message: "Friend request accepted via invite" });
      }
    }

    // Check friend limits
    const senderCount = await countFriends(invite.email);
    const acceptorCount = await countFriends(user.email);

    if (senderCount >= MAX_FRIENDS_FREE) {
      return res.status(403).json({ error: "The inviter has reached their friend limit" });
    }
    if (acceptorCount >= MAX_FRIENDS_FREE) {
      return res.status(403).json({
        error: `Free plan allows up to ${MAX_FRIENDS_FREE} friends.`,
      });
    }

    // Create an accepted friendship directly
    const newFriend = {
      fromEmail: invite.email,
      fromName: invite.name || invite.email,
      toEmail: user.email,
      toName: user.name || user.email,
      status: "accepted",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await friendsCol.insertOne(newFriend);

    // Delete the invite token — single use only
    await invitesCol.deleteOne({ _id: invite._id });

    res.json({ success: true, message: "You are now friends!" });
  } catch (error) {
    console.error("Error accepting invite:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── GET /api/friends/nests ──────────────────────────────────────────────────
// Fetch all sacred spaces belonging to accepted friends
friendsRouter.get("/nests", async (req, res) => {
  try {
    const user = (req as any).user;
    const friendEmails = await getFriendEmails(user.email);

    if (friendEmails.length === 0) {
      return res.json([]);
    }

    const locCol = await getLocationsCol();
    const friendLocations = await locCol
      .find({ userEmail: { $in: friendEmails } })
      .toArray();

    // Attach owner info from friend_requests
    const col = await getFriendsCol();
    const friendDocs = await col
      .find({
        status: "accepted",
        $or: [{ fromEmail: user.email }, { toEmail: user.email }],
      })
      .toArray();

    // Build a map of email -> name
    const nameMap: Record<string, string> = {};
    friendDocs.forEach((doc) => {
      if (doc.fromEmail === user.email) {
        nameMap[doc.toEmail] = doc.toName || doc.toEmail;
      } else {
        nameMap[doc.fromEmail] = doc.fromName || doc.fromEmail;
      }
    });

    const nests = friendLocations.map((loc) => ({
      _id: loc._id,
      name: loc.name,
      coordinates: loc.coordinates,
      address: loc.address || "",
      ownerEmail: loc.userEmail,
      ownerName: nameMap[loc.userEmail] || loc.userEmail,
    }));

    res.json(nests);
  } catch (error) {
    console.error("Error fetching friend nests:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── GET /api/friends/nests/following ─────────────────────────────────────────
// Get nest IDs the user has explicitly followed
friendsRouter.get("/nests/following", async (req, res) => {
  try {
    const user = (req as any).user;
    const col = await getNestFollowsCol();
    const follows = await col.find({ userEmail: user.email }).toArray();
    res.json(follows.map((f) => f.nestId));
  } catch (error) {
    console.error("Error fetching followed nests:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── POST /api/friends/nests/follow ──────────────────────────────────────────
// Follow a specific friend's nest
friendsRouter.post("/nests/follow", async (req, res) => {
  try {
    const user = (req as any).user;
    const { nestId } = req.body;

    if (!nestId) {
      return res.status(400).json({ error: "nestId is required" });
    }

    const col = await getNestFollowsCol();

    // Prevent duplicates
    const existing = await col.findOne({ userEmail: user.email, nestId });
    if (existing) {
      return res.json({ success: true, message: "Already following" });
    }

    await col.insertOne({
      userEmail: user.email,
      nestId,
      createdAt: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error following nest:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── DELETE /api/friends/nests/follow/:nestId ────────────────────────────────
// Unfollow a friend's nest
friendsRouter.delete("/nests/follow/:nestId", async (req, res) => {
  try {
    const user = (req as any).user;
    const { nestId } = req.params;
    const col = await getNestFollowsCol();

    await col.deleteOne({ userEmail: user.email, nestId });
    res.json({ success: true });
  } catch (error) {
    console.error("Error unfollowing nest:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
