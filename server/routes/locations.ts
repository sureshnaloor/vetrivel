import express from "express";
import { getSession } from "@auth/express";
import { ObjectId } from "mongodb";
import clientPromise from "../lib/db";
import { authConfig } from "../auth.config";

export const locationsRouter = express.Router();

// Middleware to check authentication
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const session = await getSession(req, authConfig);
  if (!session || !session.user || !session.user.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  (req as any).user = session.user;
  next();
};

locationsRouter.use(requireAuth);

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
      createdAt: new Date()
    };
    
    const result = await db.collection("user_locations").insertOne(newLocation);
    res.json({ _id: result.insertedId, ...newLocation });
  } catch (error) {
    console.error("Error saving location:", error);
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
      userEmail: user.email 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Location not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting location:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
