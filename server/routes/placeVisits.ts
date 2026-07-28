import express from "express";
import { ObjectId, type Db } from "mongodb";
import { randomUUID } from "crypto";
import clientPromise from "../lib/db";
import { requireUser } from "../middleware/requireUser";

export const placeVisitsRouter = express.Router();

placeVisitsRouter.use(requireUser);

const IMAGE_MAX_BASE64 = 2_800_000; // ~2MB
const VIDEO_MAX_BASE64 = 7_000_000; // under Express 10mb JSON body

type VisitMedia = {
  id: string;
  mediaUrl: string;
  mediaType: string;
  source: "upload" | "camera";
  createdAt: Date;
};

type Coordinates = { lat: number; lng: number };

const AUTO_FOLLOW_DISTANCE_KM = 50;

function normalizeCoordinates(value: unknown): Coordinates | null {
  const coords = value as Partial<Coordinates> | null | undefined;
  const lat = Number(coords?.lat);
  const lng = Number(coords?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function getDistanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

async function isNestAutoFollowable(
  db: Db,
  userEmail: string,
  targetCoords: Coordinates
): Promise<boolean> {
  const userLocations = await db.collection("user_locations").find({ userEmail }).toArray();
  return userLocations.some((loc: { coordinates?: unknown }) => {
    const coords = normalizeCoordinates(loc.coordinates);
    return coords ? getDistanceKm(coords, targetCoords) <= AUTO_FOLLOW_DISTANCE_KM : false;
  });
}

type PlaceAccess = {
  place: { _id: ObjectId; userEmail: string; locationId?: string | null };
  canWrite: boolean;
};

/** Own places: read+write. Friend nests (accepted + followed/auto): read-only. */
async function resolvePlaceVisitAccess(
  db: Db,
  placeDocId: string,
  viewerEmail: string
): Promise<PlaceAccess | null> {
  if (!ObjectId.isValid(placeDocId)) return null;
  const place = await db.collection("user_places").findOne({
    _id: new ObjectId(placeDocId),
  });
  if (!place?.userEmail) return null;

  if (place.userEmail === viewerEmail) {
    return {
      place: {
        _id: place._id as ObjectId,
        userEmail: place.userEmail,
        locationId: place.locationId != null ? String(place.locationId) : null,
      },
      canWrite: true,
    };
  }

  const locationId = place.locationId != null ? String(place.locationId) : "";
  if (!locationId || !ObjectId.isValid(locationId)) return null;

  const loc = await db.collection("user_locations").findOne({
    _id: new ObjectId(locationId),
  });
  if (!loc || loc.userEmail !== place.userEmail) return null;

  const friendRequest = await db.collection("friend_requests").findOne({
    status: "accepted",
    $or: [
      { fromEmail: viewerEmail, toEmail: place.userEmail },
      { fromEmail: place.userEmail, toEmail: viewerEmail },
    ],
  });
  if (!friendRequest) return null;

  const follow = await db.collection("nest_follows").findOne({
    userEmail: viewerEmail,
    nestId: String(loc._id),
  });
  const locCoords = normalizeCoordinates(loc.coordinates);
  const isAutoFollowable = locCoords
    ? await isNestAutoFollowable(db, viewerEmail, locCoords)
    : false;

  if (!follow && !isAutoFollowable) return null;

  return {
    place: {
      _id: place._id as ObjectId,
      userEmail: place.userEmail,
      locationId,
    },
    canWrite: false,
  };
}

async function assertOwnsPlace(
  db: Db,
  placeDocId: string,
  userEmail: string
): Promise<{ _id: ObjectId } | null> {
  const access = await resolvePlaceVisitAccess(db, placeDocId, userEmail);
  if (!access?.canWrite) return null;
  return { _id: access.place._id };
}

function parseVisitDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  // Accept YYYY-MM-DD or full ISO; normalize to YYYY-MM-DD
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return d.toISOString().slice(0, 10);
}

function isVideoMime(mediaType: string): boolean {
  return mediaType.toLowerCase().startsWith("video/");
}

function validateMediaPayload(
  mediaUrl: unknown,
  mediaType: unknown
): { ok: true; mediaUrl: string; mediaType: string } | { ok: false; error: string } {
  if (typeof mediaUrl !== "string" || !mediaUrl) {
    return { ok: false, error: "mediaUrl is required" };
  }
  if (typeof mediaType !== "string" || !mediaType) {
    return { ok: false, error: "mediaType is required" };
  }
  const video = isVideoMime(mediaType);
  const max = video ? VIDEO_MAX_BASE64 : IMAGE_MAX_BASE64;
  if (mediaUrl.length > max) {
    return {
      ok: false,
      error: video
        ? "Video exceeds size limit (~5MB). Shorter clips work best for now."
        : "Photo exceeds 2MB limit",
    };
  }
  if (!mediaType.startsWith("image/") && !mediaType.startsWith("video/")) {
    return { ok: false, error: "Only image and video uploads are supported" };
  }
  return { ok: true, mediaUrl, mediaType };
}

async function markPlaceVisited(db: Db, placeDocId: ObjectId, visitDate: string) {
  await db.collection("user_places").updateOne(
    { _id: placeDocId },
    {
      $set: {
        status: "visited",
        lastVisitDate: visitDate,
        updatedAt: new Date(),
      },
    }
  );
}

// GET /api/place-visits?placeDocId=...
// Owner: full journal. Friends viewing a followed nest: read-only visit logs.
placeVisitsRouter.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const placeDocId =
      typeof req.query.placeDocId === "string" ? req.query.placeDocId.trim() : "";

    if (!placeDocId) {
      return res.status(400).json({ error: "placeDocId query parameter is required" });
    }

    const client = await clientPromise;
    const db = client.db();

    const access = await resolvePlaceVisitAccess(db, placeDocId, user.email);
    if (!access) {
      return res.status(404).json({ error: "Place not found" });
    }

    const visits = await db
      .collection("place_visits")
      .find({ placeDocId, userEmail: access.place.userEmail })
      .sort({ visitDate: -1, createdAt: -1 })
      .toArray();

    res.json(visits);
  } catch (error) {
    console.error("Error fetching place visits:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/place-visits
placeVisitsRouter.post("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const { placeDocId, visitDate, remarks, media } = req.body;

    if (!placeDocId || typeof placeDocId !== "string") {
      return res.status(400).json({ error: "placeDocId is required" });
    }

    const date = parseVisitDate(visitDate) || new Date().toISOString().slice(0, 10);
    const remarksText = typeof remarks === "string" ? remarks.trim() : "";

    const client = await clientPromise;
    const db = client.db();

    const place = await assertOwnsPlace(db, placeDocId, user.email);
    if (!place) {
      return res.status(404).json({ error: "Place not found" });
    }

    const mediaItems: VisitMedia[] = [];
    if (Array.isArray(media)) {
      for (const item of media) {
        const checked = validateMediaPayload(item?.mediaUrl, item?.mediaType);
        if (!checked.ok) {
          return res.status(400).json({ error: checked.error });
        }
        const source =
          item?.source === "camera" || item?.source === "upload"
            ? item.source
            : "upload";
        mediaItems.push({
          id: randomUUID(),
          mediaUrl: checked.mediaUrl,
          mediaType: checked.mediaType,
          source,
          createdAt: new Date(),
        });
      }
    }

    const newVisit = {
      placeDocId,
      userEmail: user.email,
      visitDate: date,
      remarks: remarksText,
      media: mediaItems,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("place_visits").insertOne(newVisit);
    await markPlaceVisited(db, place._id, date);

    res.json({ _id: result.insertedId, ...newVisit });
  } catch (error) {
    console.error("Error creating place visit:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/place-visits/:id
placeVisitsRouter.patch("/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { visitDate, remarks } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid visit id" });
    }

    const updateDoc: Record<string, unknown> = { updatedAt: new Date() };
    if (visitDate !== undefined) {
      const date = parseVisitDate(visitDate);
      if (!date) {
        return res.status(400).json({ error: "Invalid visitDate" });
      }
      updateDoc.visitDate = date;
    }
    if (remarks !== undefined) {
      updateDoc.remarks = typeof remarks === "string" ? remarks.trim() : "";
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("place_visits").findOneAndUpdate(
      { _id: new ObjectId(id), userEmail: user.email },
      { $set: updateDoc },
      { returnDocument: "after" }
    );

    const doc =
      result && typeof result === "object" && "value" in result
        ? (result as { value: unknown }).value
        : result;

    if (!doc) {
      return res.status(404).json({ error: "Visit not found" });
    }

    const visit = doc as { placeDocId?: string; visitDate?: string };
    if (visit.placeDocId && visit.visitDate && ObjectId.isValid(visit.placeDocId)) {
      await markPlaceVisited(db, new ObjectId(visit.placeDocId), visit.visitDate);
    }

    res.json(doc);
  } catch (error) {
    console.error("Error updating place visit:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/place-visits/:id/media
placeVisitsRouter.post("/:id/media", async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { mediaUrl, mediaType, source } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid visit id" });
    }

    const checked = validateMediaPayload(mediaUrl, mediaType);
    if (!checked.ok) {
      return res.status(400).json({ error: checked.error });
    }

    const mediaItem: VisitMedia = {
      id: randomUUID(),
      mediaUrl: checked.mediaUrl,
      mediaType: checked.mediaType,
      source: source === "camera" ? "camera" : "upload",
      createdAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("place_visits").findOneAndUpdate(
      { _id: new ObjectId(id), userEmail: user.email },
      {
        $push: { media: mediaItem },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" }
    );

    const doc =
      result && typeof result === "object" && "value" in result
        ? (result as { value: unknown }).value
        : result;

    if (!doc) {
      return res.status(404).json({ error: "Visit not found" });
    }

    res.json(doc);
  } catch (error) {
    console.error("Error adding visit media:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/place-visits/:id/media/:mediaId
placeVisitsRouter.delete("/:id/media/:mediaId", async (req, res) => {
  try {
    const user = (req as any).user;
    const { id, mediaId } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid visit id" });
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("place_visits").findOneAndUpdate(
      { _id: new ObjectId(id), userEmail: user.email },
      {
        $pull: { media: { id: mediaId } },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" }
    );

    const doc =
      result && typeof result === "object" && "value" in result
        ? (result as { value: unknown }).value
        : result;

    if (!doc) {
      return res.status(404).json({ error: "Visit not found" });
    }

    res.json(doc);
  } catch (error) {
    console.error("Error deleting visit media:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/place-visits/:id
placeVisitsRouter.delete("/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid visit id" });
    }

    const client = await clientPromise;
    const db = client.db();

    const existing = await db.collection("place_visits").findOne({
      _id: new ObjectId(id),
      userEmail: user.email,
    });

    if (!existing) {
      return res.status(404).json({ error: "Visit not found" });
    }

    await db.collection("place_visits").deleteOne({ _id: existing._id });

    // If no visits remain, leave status as visited (user still marked it);
    // refresh lastVisitDate from newest remaining visit if any.
    const placeDocId = existing.placeDocId as string;
    if (placeDocId && ObjectId.isValid(placeDocId)) {
      const latest = await db
        .collection("place_visits")
        .find({ placeDocId, userEmail: user.email })
        .sort({ visitDate: -1, createdAt: -1 })
        .limit(1)
        .toArray();

      if (latest[0]?.visitDate) {
        await db.collection("user_places").updateOne(
          { _id: new ObjectId(placeDocId), userEmail: user.email },
          {
            $set: {
              lastVisitDate: latest[0].visitDate,
              updatedAt: new Date(),
            },
          }
        );
      } else {
        await db.collection("user_places").updateOne(
          { _id: new ObjectId(placeDocId), userEmail: user.email },
          { $unset: { lastVisitDate: "" }, $set: { updatedAt: new Date() } }
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting place visit:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
