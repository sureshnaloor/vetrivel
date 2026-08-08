import express from "express";
import { ObjectId } from "mongodb";
import clientPromise from "../lib/db";
import { requireUser } from "../middleware/requireUser";

export const divyadesamRouter = express.Router();

divyadesamRouter.use(requireUser);

function normalizeId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

// GET /api/divyadesam
// Fetch global templates, published community lists, and the user's own lists.
divyadesamRouter.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const client = await clientPromise;
    const db = client.db();

    // Find user's own lists, or lists that are global templates, or published community lists
    const query = {
      $or: [
        { creatorEmail: user.email },
        { isGlobalTemplate: true },
        { isPublished: true }
      ]
    };

    const lists = await db.collection("divyadesam").find(query).sort({ createdAt: -1 }).toArray();
    res.json(lists);
  } catch (error) {
    console.error("Error fetching divyadesam lists:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/divyadesam/:id
// Get a specific list
divyadesamRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const listId = normalizeId(id);
    if (!listId) {
      return res.status(400).json({ error: "Invalid list id" });
    }

    const client = await clientPromise;
    const db = client.db();

    const list = await db.collection("divyadesam").findOne({ _id: listId });
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    res.json(list);
  } catch (error) {
    console.error("Error fetching divyadesam list:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/divyadesam
// Create a new curated list (or admin template)
divyadesamRouter.post("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, description, isGlobalTemplate, isPublished, temples } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Only allow admin (or certain logic) to create global templates. For now, we trust the UI/user or just allow it for testing.
    // In production, we'd check if user.email is admin.
    const isAdmin = user.email === 'admin@vetrivel.app' || user.email === 'sanjeevm.menon@gmail.com' || true; // Allowing for now based on prompt

    const newList = {
      name: name.trim(),
      description: description?.trim() || "",
      creatorEmail: user.email,
      isGlobalTemplate: isAdmin ? Boolean(isGlobalTemplate) : false,
      isPublished: Boolean(isPublished),
      parentListId: null,
      temples: Array.isArray(temples) ? temples : [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("divyadesam").insertOne(newList);
    res.json({ _id: result.insertedId, ...newList });
  } catch (error) {
    console.error("Error creating divyadesam list:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/divyadesam/:id/clone
// Clone an existing template or published list for the user
divyadesamRouter.post("/:id/clone", async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const parentListId = normalizeId(id);

    if (!parentListId) {
      return res.status(400).json({ error: "Invalid list id" });
    }

    const client = await clientPromise;
    const db = client.db();

    const parentList = await db.collection("divyadesam").findOne({ _id: parentListId });
    if (!parentList) {
      return res.status(404).json({ error: "Parent list not found" });
    }

    if (!parentList.isGlobalTemplate && !parentList.isPublished && parentList.creatorEmail !== user.email) {
      return res.status(403).json({ error: "You do not have permission to clone this list" });
    }

    // Check if user already cloned this list
    const existingClone = await db.collection("divyadesam").findOne({
      creatorEmail: user.email,
      parentListId: String(parentList._id)
    });

    if (existingClone) {
      return res.status(400).json({ error: "You have already adopted this list", existingId: existingClone._id });
    }

    const clonedList = {
      name: parentList.name,
      description: parentList.description,
      creatorEmail: user.email,
      isGlobalTemplate: false,
      isPublished: false, // user copies are private by default
      parentListId: String(parentList._id),
      temples: parentList.temples || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("divyadesam").insertOne(clonedList);
    // Convert ObjectId to string for client consumption
    const insertedId = result.insertedId.toHexString();
    res.json({ _id: insertedId, ...clonedList });
  } catch (error) {
    console.error("Error cloning divyadesam list:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/divyadesam/:id
// Update a user's own list (name, description, add/remove temples)
divyadesamRouter.patch("/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const listId = normalizeId(id);

    if (!listId) {
      return res.status(400).json({ error: "Invalid list id" });
    }

    const { name, description, isPublished, temples } = req.body;

    const updateDoc: any = { updatedAt: new Date() };
    if (name !== undefined) updateDoc.name = name.trim();
    if (description !== undefined) updateDoc.description = description.trim();
    if (isPublished !== undefined) updateDoc.isPublished = Boolean(isPublished);
    if (temples !== undefined && Array.isArray(temples)) updateDoc.temples = temples;

    if (Object.keys(updateDoc).length <= 1) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("divyadesam").findOneAndUpdate(
      { _id: listId, creatorEmail: user.email },
      { $set: updateDoc },
      { returnDocument: "after" }
    );

    const doc = result && typeof result === "object" && "value" in result
      ? (result as { value: unknown }).value
      : result;

    if (!doc) {
      return res.status(404).json({ error: "List not found or unauthorized" });
    }

    res.json(doc);
  } catch (error) {
    console.error("Error updating divyadesam list:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/divyadesam/:id
// Delete a user's list
divyadesamRouter.delete("/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const listId = normalizeId(id);

    if (!listId) {
      return res.status(400).json({ error: "Invalid list id" });
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("divyadesam").deleteOne({
      _id: listId,
      creatorEmail: user.email
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "List not found or unauthorized" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting divyadesam list:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
