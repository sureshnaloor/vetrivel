import express from "express";
import { getSession } from "@auth/express";
import { ObjectId } from "mongodb";
import clientPromise from "../lib/db";
import { authConfig } from "../auth.config";

export const placesRouter = express.Router();

// Middleware to check authentication
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const session = await getSession(req, authConfig);
  if (!session || !session.user || !session.user.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // Attach user to req for downstream usage
  (req as any).user = session.user;
  next();
};

placesRouter.use(requireAuth);

// GET /api/places
// Fetch all saved places for the authenticated user
placesRouter.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const { locationId } = req.query;
    const client = await clientPromise;
    const db = client.db();
    
    const query: any = { userEmail: user.email };
    if (locationId) {
      query.locationId = locationId;
    } else {
      query.locationId = { $in: [null, ""] };
    }
    
    const places = await db.collection("user_places").find(query).toArray();
    
    res.json(places);
  } catch (error) {
    console.error("Error fetching places:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/places
// Add a new place (Nest/Interest)
placesRouter.post("/", async (req, res) => {
    const { placeId, name, coordinates, category, status, locationId } = req.body;
    
    if (!name || !coordinates || !category || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    try {
      const user = (req as any).user;
      const client = await clientPromise;
      const db = client.db();
      
      const newPlace = {
        userEmail: user.email,
        placeId: placeId || null,
        locationId: locationId || null,
        name,
        coordinates,
        category, // 'nest' | 'interest'
        status, // 'planned' | 'visited' | 'recommended' | 'wishlist' | 'place of interest'
        createdAt: new Date()
      };
    
    // Check if it already exists to avoid duplicates
    const query: any = { userEmail: user.email, name };
    if (placeId) { query.placeId = placeId; }
    
    const existingPlace = await db.collection("user_places").findOne(query);
    if (existingPlace) {
      // If it exists, update it instead
      await db.collection("user_places").updateOne({ _id: existingPlace._id }, { $set: newPlace });
      return res.json({ ...existingPlace, ...newPlace });
    }
    
    const result = await db.collection("user_places").insertOne(newPlace);
    res.json({ _id: result.insertedId, ...newPlace });
  } catch (error) {
    console.error("Error adding place:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/places/:id
// Update place status/category
placesRouter.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { category, status } = req.body;
    const user = (req as any).user;
    
    const client = await clientPromise;
    const db = client.db();
    
    const updateDoc: any = {};
    if (category) updateDoc.category = category;
    if (status) updateDoc.status = status;
    updateDoc.updatedAt = new Date();
    
    const result = await db.collection("user_places").findOneAndUpdate(
      { _id: new ObjectId(id), userEmail: user.email },
      { $set: updateDoc },
      { returnDocument: "after" }
    );
    
    if (!result) {
      return res.status(404).json({ error: "Place not found" });
    }
    
    res.json(result);
  } catch (error) {
    console.error("Error updating place:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/places/:id
// Remove a place
placesRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    const client = await clientPromise;
    const db = client.db();
    
    const result = await db.collection("user_places").deleteOne({ 
      _id: new ObjectId(id), 
      userEmail: user.email 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Place not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting place:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
