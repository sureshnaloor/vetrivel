import express from "express";
import { ObjectId } from "mongodb";
import clientPromise from "../lib/db";
import { requireUser } from "../middleware/requireUser";

export const locationsRouter = express.Router();

locationsRouter.use(requireUser);

function normalizeId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

// GET /api/locations
locationsRouter.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const client = await clientPromise;
    const db = client.db();
    const locations = await db.collection("user_locations").find({ userEmail: user.email }).toArray();
    res.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/locations
locationsRouter.post("/", async (req, res) => {
  const { name, coordinates, address } = req.body;
  if (!name || !coordinates) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const user = (req as any).user;
    const client = await clientPromise;
    const db = client.db();

    const existingSpacesCount = await db.collection("user_locations").countDocuments({ userEmail: user.email });
    if (existingSpacesCount >= 10) {
      return res.status(403).json({ error: "Free plan allows up to 10 spaces." });
    }

    const newLocation = {
      userEmail: user.email,
      name,
      coordinates,
      address: address || "",
      visibility: "private" as const,
      purpose: "",
      publishedAt: null as Date | null,
      createdAt: new Date(),
    };

    const result = await db.collection("user_locations").insertOne(newLocation);
    res.json({ _id: result.insertedId, ...newLocation });
  } catch (error) {
    console.error("Error saving location:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/locations/:id
// Update name/address or publish / unpublish as a community space
locationsRouter.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const locationId = normalizeId(id);
    if (!locationId) {
      return res.status(400).json({ error: "Invalid location id" });
    }

    const { name, address, visibility, purpose } = req.body;
    const updateDoc: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof name === "string" && name.trim()) {
      updateDoc.name = name.trim();
    }
    if (typeof address === "string") {
      updateDoc.address = address.trim();
    }
    if (typeof purpose === "string") {
      updateDoc.purpose = purpose.trim().slice(0, 2000);
    }

    let publishing = false;
    if (visibility === "published" || visibility === "private") {
      updateDoc.visibility = visibility;
      if (visibility === "published") {
        publishing = true;
        updateDoc.publishedAt = new Date();
      } else {
        updateDoc.publishedAt = null;
      }
    }

    if (Object.keys(updateDoc).length <= 1) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("user_locations").findOneAndUpdate(
      { _id: locationId, userEmail: user.email },
      { $set: updateDoc },
      { returnDocument: "after" }
    );

    const doc =
      result && typeof result === "object" && "value" in result
        ? (result as { value: unknown }).value
        : result;

    if (!doc) {
      return res.status(404).json({ error: "Location not found" });
    }

    const loc = doc as { _id: ObjectId; name?: string };

    if (publishing) {
      await db.collection("community_members").updateOne(
        { spaceId: String(loc._id), userEmail: user.email },
        {
          $set: {
            spaceId: String(loc._id),
            spaceName: loc.name || "",
            userEmail: user.email,
            userName: user.name || user.email.split("@")[0],
            role: "owner",
            joinedVia: "publish",
            updatedAt: new Date(),
          },
          $setOnInsert: { joinedAt: new Date() },
        },
        { upsert: true }
      );
    }

    res.json(doc);
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/locations/:id
locationsRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("user_locations").deleteOne({
      _id: new ObjectId(id),
      userEmail: user.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    await Promise.all([
      db.collection("community_members").deleteMany({ spaceId: id }),
      db.collection("community_interest_requests").deleteMany({ spaceId: id }),
      db.collection("community_messages").deleteMany({ spaceId: id }),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting location:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
