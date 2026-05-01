import express from "express";
import { ObjectId } from "mongodb";
import clientPromise from "../lib/db";
import { requireUser } from "../middleware/requireUser";

export const placesRouter = express.Router();

placesRouter.use(requireUser);

const NEARBY_MAX_RADIUS_M = 50_000;

// GET /api/places/nearby
// Proxy Google Places Nearby Search (hindu_temple), same idea as web dashboard map.
placesRouter.get("/nearby", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusRaw = Number(req.query.radius);
  const keyword =
    typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: "Query params lat and lng are required" });
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "Nearby search is not configured (set GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_API_KEY)",
    });
  }

  const radius = Math.min(
    Number.isFinite(radiusRaw) && radiusRaw > 0 ? radiusRaw : NEARBY_MAX_RADIUS_M,
    NEARBY_MAX_RADIUS_M
  );

  try {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    );
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", String(radius));
    url.searchParams.set("type", "hindu_temple");
    if (keyword) {
      url.searchParams.set("keyword", keyword);
    }
    url.searchParams.set("key", apiKey);

    const gRes = await fetch(url.toString());
    const data = (await gRes.json()) as {
      status: string;
      results?: Array<{
        place_id?: string;
        name?: string;
        geometry?: { location?: { lat: number; lng: number } };
        vicinity?: string;
        rating?: number;
        user_ratings_total?: number;
      }>;
      error_message?: string;
    };

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("[places/nearby] Google status:", data.status, data.error_message);
      return res.status(502).json({
        error: data.error_message || data.status || "Google Places request failed",
      });
    }

    const raw = data.results || [];
    const results = raw.slice(0, 20).map((r) => ({
      placeId: r.place_id || "",
      name: r.name || "Temple",
      lat: r.geometry?.location?.lat ?? 0,
      lng: r.geometry?.location?.lng ?? 0,
      vicinity: r.vicinity,
      rating: r.rating,
      userRatingsTotal: r.user_ratings_total,
    }));

    res.json({ results });
  } catch (e) {
    console.error("Error in /api/places/nearby:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

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
    const { category, status, locationId } = req.body;
    const user = (req as any).user;
    
    const client = await clientPromise;
    const db = client.db();
    
    const updateDoc: any = {};
    if (category) updateDoc.category = category;
    if (status) updateDoc.status = status;
    if (locationId !== undefined) updateDoc.locationId = locationId || null;
    updateDoc.updatedAt = new Date();
    
    const result = await db.collection("user_places").findOneAndUpdate(
      { _id: new ObjectId(id), userEmail: user.email },
      { $set: updateDoc },
      { returnDocument: "after" }
    );
    
    const doc = result && typeof result === "object" && "value" in result
      ? (result as { value: unknown }).value
      : result;

    if (!doc) {
      return res.status(404).json({ error: "Place not found" });
    }
    
    res.json(doc);
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
