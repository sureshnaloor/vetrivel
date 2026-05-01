import express from "express";
import clientPromise from "../lib/db";
import { requireUser } from "../middleware/requireUser";

export const customTemplesRouter = express.Router();

// GET /api/custom-temples
// Fetch all user-contributed custom temples to display on the map
customTemplesRouter.get("/", async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // We fetch all custom temples. In a massive scale app we'd filter by viewport bounds.
    const customTemples = await db.collection("custom_temples").find({}).toArray();
    
    res.json(customTemples);
  } catch (error) {
    console.error("Error fetching custom temples:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/custom-temples
// Add a new custom crowd-sourced temple
customTemplesRouter.post("/", requireUser, async (req, res) => {
  const { name, coordinates, description } = req.body;
  
  if (!name || !coordinates) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  try {
    const user = (req as any).user;
    
    const client = await clientPromise;
    const db = client.db();
    
    const newTemple = {
      name,
      coordinates,
      description: description || "",
      creatorEmail: user.email,
      creatorName: user.name || "Anonymous Devotee",
      createdByIp: req.ip || req.headers['x-forwarded-for'] || "unknown",
      createdAt: new Date(),
      status: 'active'
    };
    
    const result = await db.collection("custom_temples").insertOne(newTemple);
    res.json({ _id: result.insertedId, ...newTemple });
  } catch (error) {
    console.error("Error adding custom temple:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
