import express from "express";
import { getSession } from "@auth/express";
import { ObjectId } from "mongodb";
import clientPromise from "../lib/db";
import { authConfig } from "../auth.config";

export const templeContentRouter = express.Router();

// Middleware to check authentication
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const session = await getSession(req, authConfig);
  if (!session || !session.user || !session.user.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  (req as any).user = session.user;
  next();
};

// GET /api/temple-content?templeKey=X
// Public read — anyone can view community content
templeContentRouter.get("/", async (req, res) => {
  try {
    const { templeKey } = req.query;
    if (!templeKey || typeof templeKey !== "string") {
      return res.status(400).json({ error: "templeKey query parameter is required" });
    }

    const client = await clientPromise;
    const db = client.db();

    const entries = await db
      .collection("temple_content")
      .find({ templeKey })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(entries);
  } catch (error) {
    console.error("Error fetching temple content:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/temple-content
// Create a new content entry (requires auth)
templeContentRouter.post("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { templeKey, tab, content, mediaUrl, mediaType } = req.body;

    if (!templeKey || !tab || !content) {
      return res.status(400).json({ error: "templeKey, tab, and content are required" });
    }

    const validTabs = ["info", "pooja", "media", "qa"];
    if (!validTabs.includes(tab)) {
      return res.status(400).json({ error: `tab must be one of: ${validTabs.join(", ")}` });
    }

    // For media tab, enforce size limit (~2MB base64)
    if (tab === "media" && mediaUrl && mediaUrl.length > 2_800_000) {
      return res.status(400).json({ error: "Photo exceeds 2MB limit" });
    }

    const client = await clientPromise;
    const db = client.db();

    const newEntry = {
      templeKey,
      userEmail: user.email,
      userName: user.name || user.email.split("@")[0],
      tab,
      content,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("temple_content").insertOne(newEntry);
    res.json({ _id: result.insertedId, ...newEntry });
  } catch (error) {
    console.error("Error creating temple content:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/temple-content/:id
// Edit own content entry (requires auth)
templeContentRouter.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { content, mediaUrl, mediaType } = req.body;

    if (!content && !mediaUrl) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const client = await clientPromise;
    const db = client.db();

    const updateDoc: any = { updatedAt: new Date() };
    if (content) updateDoc.content = content;
    if (mediaUrl !== undefined) updateDoc.mediaUrl = mediaUrl;
    if (mediaType !== undefined) updateDoc.mediaType = mediaType;

    const result = await db.collection("temple_content").findOneAndUpdate(
      { _id: new ObjectId(id), userEmail: user.email },
      { $set: updateDoc },
      { returnDocument: "after" }
    );

    const doc = result && typeof result === "object" && "value" in result
      ? (result as { value: unknown }).value
      : result;

    if (!doc) {
      return res.status(404).json({ error: "Content not found or not yours" });
    }

    res.json(doc);
  } catch (error) {
    console.error("Error updating temple content:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/temple-content/:id
// Delete own content entry (requires auth)
templeContentRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("temple_content").deleteOne({
      _id: new ObjectId(id),
      userEmail: user.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Content not found or not yours" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting temple content:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
