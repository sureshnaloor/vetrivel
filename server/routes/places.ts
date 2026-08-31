import express from "express";
import { Db, ObjectId } from "mongodb";
import clientPromise from "../lib/db";
import { requireUser } from "../middleware/requireUser";

export const placesRouter = express.Router();

placesRouter.use(requireUser);

const NEARBY_MAX_RADIUS_M = 50_000;
const NEARBY_LOCAL_1KM_M = 1_000;
const NEARBY_LOCAL_5KM_M = 5_000;
const AUTO_FOLLOW_DISTANCE_KM = 50;

type Coordinates = { lat: number; lng: number };

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

type NearbyTempleResult = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  vicinity?: string;
  rating?: number;
  userRatingsTotal?: number;
  distanceMeters: number;
};

async function fetchNearbyTemples(
  lat: number,
  lng: number,
  radiusMeters: number,
  keyword?: string
): Promise<{ results: NearbyTempleResult[]; radiusMeters: number; center: Coordinates }> {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Nearby search is not configured (set GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_API_KEY)"
    );
  }

  const radius = Math.min(
    Number.isFinite(radiusMeters) && radiusMeters > 0 ? radiusMeters : NEARBY_MAX_RADIUS_M,
    NEARBY_MAX_RADIUS_M
  );
  const center = { lat, lng };

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
    throw new Error(data.error_message || data.status || "Google Places request failed");
  }

  const raw = data.results || [];
  const results = raw
    .map((r) => {
      const templeLat = r.geometry?.location?.lat ?? 0;
      const templeLng = r.geometry?.location?.lng ?? 0;
      const distanceMeters = Math.round(
        getDistanceKm(center, { lat: templeLat, lng: templeLng }) * 1000
      );
      return {
        placeId: r.place_id || "",
        name: r.name || "Temple",
        lat: templeLat,
        lng: templeLng,
        vicinity: r.vicinity,
        rating: r.rating,
        userRatingsTotal: r.user_ratings_total,
        distanceMeters,
      };
    })
    .filter(
      (r) =>
        r.placeId &&
        Number.isFinite(r.lat) &&
        Number.isFinite(r.lng) &&
        r.lat !== 0 &&
        r.lng !== 0 &&
        r.distanceMeters <= radius
    )
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 20);

  return { results, radiusMeters: radius, center };
}

async function handleNearbyRequest(
  req: express.Request,
  res: express.Response,
  fixedRadiusMeters?: number
) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusRaw = Number(req.query.radius);
  const keyword =
    typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: "Query params lat and lng are required" });
  }

  const radiusMeters =
    fixedRadiusMeters ??
    (Number.isFinite(radiusRaw) && radiusRaw > 0 ? radiusRaw : NEARBY_MAX_RADIUS_M);

  try {
    const payload = await fetchNearbyTemples(lat, lng, radiusMeters, keyword || undefined);
    res.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal Server Error";
    if (message.includes("not configured")) {
      return res.status(503).json({ error: message });
    }
    if (message.includes("Google")) {
      return res.status(502).json({ error: message });
    }
    console.error("Error in nearby temples search:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// GET /api/places/nearby
// Proxy Google Places Nearby Search (hindu_temple), same idea as web dashboard map.
placesRouter.get("/nearby", async (req, res) => {
  await handleNearbyRequest(req, res);
});

// GET /api/places/nearby/1km?lat=&lng= — temples within 1 km of user's coordinates
placesRouter.get("/nearby/1km", async (req, res) => {
  await handleNearbyRequest(req, res, NEARBY_LOCAL_1KM_M);
});

// GET /api/places/nearby/5km?lat=&lng= — temples within 5 km of user's coordinates
placesRouter.get("/nearby/5km", async (req, res) => {
  await handleNearbyRequest(req, res, NEARBY_LOCAL_5KM_M);
});

// GET /api/places/search?q=...&lat=...&lng=...
// Google Places Text Search — powers the "Search" tab in mobile AddTempleModal
placesRouter.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) return res.status(400).json({ error: "q is required" });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Google Maps API Key not configured" });

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    url.searchParams.set("query", q);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      url.searchParams.set("location", `${lat},${lng}`);
      url.searchParams.set("radius", "50000"); // 50km location bias
    }
    url.searchParams.set("key", apiKey);

    const gRes = await fetch(url.toString());
    const data = await gRes.json() as any;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return res.status(502).json({ error: data.error_message || data.status });
    }

    const results = (data.results || []).slice(0, 10).map((r: any) => ({
      placeId: r.place_id || "",
      name: r.name || "",
      address: r.formatted_address || r.vicinity || "",
      lat: r.geometry?.location?.lat ?? 0,
      lng: r.geometry?.location?.lng ?? 0,
    }));

    res.json({ results });
  } catch (e) {
    console.error("Error in /api/places/search:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/places/resolve-link
// Resolves a Google/Apple Maps link and returns parsed place info.
placesRouter.post("/resolve-link", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Google Maps API Key not configured" });

  // ── Helper: extract coords + name from a fully-expanded URL ────────────────
  function parseExpandedUrl(u: string): { name: string; lat: number; lng: number; placeId: string } {
    let name = "";
    let lat = 0;
    let lng = 0;
    let placeId = "";

    // Place ID directly in URL: /maps/place/...?...&ftid=0x...  or ChIJ... in pb= param
    const ftidMatch = u.match(/[?&]ftid=([^&]+)/);
    if (ftidMatch) placeId = decodeURIComponent(ftidMatch[1]);

    // Name from /place/<name>/ path segment
    const placePathMatch = u.match(/\/place\/([^/@?]+)/);
    if (placePathMatch) {
      name = decodeURIComponent(placePathMatch[1].replace(/\+/g, " "));
    }

    // Coordinates from @lat,lng,zoom pattern
    const atMatch = u.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) { lat = parseFloat(atMatch[1]); lng = parseFloat(atMatch[2]); }

    // Coordinates from !3d!4d pattern (very common in Android Google Maps links)
    if (!lat || !lng) {
      const ddMatch = u.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
      if (ddMatch) { lat = parseFloat(ddMatch[1]); lng = parseFloat(ddMatch[2]); }
    }

    // q= parameter (Apple Maps / some Google links)
    if (!name) {
      const qMatch = u.match(/[?&]q=([^&]+)/);
      if (qMatch) name = decodeURIComponent(qMatch[1].replace(/\+/g, " ")).split(",")[0].trim();
    }

    // ll= parameter (Apple Maps)
    if (!lat || !lng) {
      const llMatch = u.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (llMatch) { lat = parseFloat(llMatch[1]); lng = parseFloat(llMatch[2]); }
    }

    return { name, lat, lng, placeId };
  }

  // ── Helper: extract from HTML ───────────────────────────────────────────────
  function parseHtml(html: string, finalUrl: string): { name: string; lat: number; lng: number } {
    let name = "";
    let lat = 0;
    let lng = 0;

    // og:title
    const ogTitle = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i);
    if (ogTitle?.[1]) {
      name = decodeURIComponent(ogTitle[1].replace(/&#x27;/g, "'").replace(/&amp;/g, "&").trim());
      name = name.replace(/ - Google Maps$/i, "").trim();
      if (name === "Google Maps" || name === "Maps") name = "";
    }

    // og:image has center=lat,lng
    const ogImage = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i);
    if (ogImage?.[1]) {
      const imgUrl = decodeURIComponent(ogImage[1].replace(/&amp;/g, "&"));
      const centerMatch = imgUrl.match(/center=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (centerMatch) { lat = parseFloat(centerMatch[1]); lng = parseFloat(centerMatch[2]); }
    }

    // Fallback name from q= in HTML body
    if (!name) {
      const qHtml = html.match(/[?&]q=([^&"]+)/);
      if (qHtml?.[1]) {
        name = decodeURIComponent(qHtml[1].replace(/\+/g, " ").replace(/&amp;/g, "&"));
        name = name.replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,3}\s+/, "").split(",")[0].trim();
      }
    }

    // Fallback coords from expanded URL
    if (!lat || !lng) {
      const parsed = parseExpandedUrl(finalUrl);
      if (!lat && parsed.lat) lat = parsed.lat;
      if (!lng && parsed.lng) lng = parsed.lng;
      if (!name && parsed.name) name = parsed.name;
    }

    return { name, lat, lng };
  }

  try {
    // ── Strategy 1: try to expand short URL with multiple UA options ─────────
    const USER_AGENTS = [
      "facebookexternalhit/1.1",      // returns OG meta — best for iOS Apple Maps & Google Maps
      "Googlebot/2.1",                 // sometimes bypasses bot-check differently
      "WhatsApp/2.23 A",               // mobile UA — Google serves different redirect
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124",
    ];

    let html = "";
    let finalUrl = url;

    for (const ua of USER_AGENTS) {
      try {
        const resp = await fetch(url, {
          headers: { "User-Agent": ua, "Accept-Language": "en-US,en;q=0.9" },
          redirect: "follow",
        });
        finalUrl = resp.url;
        html = await resp.text();
        // Stop if we got a real Maps page (not a CAPTCHA/bot-check page)
        if (finalUrl.includes("google.com/maps") || finalUrl.includes("maps.apple.com")) break;
      } catch {
        // try next UA
      }
    }

    // ── Strategy 2: parse fully expanded URL for coords + name + placeId ─────
    const fromUrl = parseExpandedUrl(finalUrl);

    // ── Strategy 3: parse HTML for og:title + og:image coords ────────────────
    const fromHtml = html ? parseHtml(html, finalUrl) : { name: "", lat: 0, lng: 0 };

    // Merge: prefer HTML name (usually cleaner), URL coords (more reliable)
    const extractedName = fromHtml.name || fromUrl.name;
    const extractedLat  = fromUrl.lat  || fromHtml.lat;
    const extractedLng  = fromUrl.lng  || fromHtml.lng;
    const extractedPlaceId = fromUrl.placeId;

    // ── Strategy 4: if we have a Place ID directly, use Places Details API ───
    if (extractedPlaceId && extractedPlaceId.startsWith("ChIJ")) {
      const detailUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      detailUrl.searchParams.set("place_id", extractedPlaceId);
      detailUrl.searchParams.set("fields", "name,geometry,formatted_address");
      detailUrl.searchParams.set("key", apiKey);
      const detailRes = await fetch(detailUrl.toString());
      const detailData = await detailRes.json() as any;
      if (detailData.status === "OK" && detailData.result) {
        const r = detailData.result;
        return res.json({
          placeId: extractedPlaceId,
          name: r.name || extractedName,
          coordinates: r.geometry?.location || { lat: extractedLat, lng: extractedLng },
          address: r.formatted_address || "",
        });
      }
    }

    if (!extractedName && !extractedLat) {
      return res.status(400).json({
        error: `Could not parse this map link. Try using the Search tab instead. (Debug: final URL was ${finalUrl.substring(0, 120)})`,
      });
    }

    // ── Strategy 5: Google Places Text Search to get Place ID + clean name ───
    if (extractedName && (extractedLat || extractedLng)) {
      const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
      searchUrl.searchParams.set("query", extractedName);
      searchUrl.searchParams.set("location", `${extractedLat},${extractedLng}`);
      searchUrl.searchParams.set("radius", "2000");
      searchUrl.searchParams.set("key", apiKey);

      const searchRes = await fetch(searchUrl.toString());
      const searchData = await searchRes.json() as any;
      if (searchData.status === "OK" && searchData.results?.length > 0) {
        const top = searchData.results[0];
        return res.json({
          placeId: top.place_id || "",
          name: top.name || extractedName,
          coordinates: top.geometry?.location || { lat: extractedLat, lng: extractedLng },
          address: top.formatted_address || top.vicinity || "",
        });
      }
    }

    // ── Final fallback: return whatever we have ───────────────────────────────
    return res.json({
      placeId: extractedPlaceId || "",
      name: extractedName || "Unknown Place",
      coordinates: { lat: extractedLat, lng: extractedLng },
      address: "",
    });

  } catch (error) {
    console.error("Error resolving link:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/places/details?placeId=...
// Google Place Details (JSON) for mobile — mirrors web RightRail PlacesService.getDetails fields.
placesRouter.get("/details", async (req, res) => {
  const placeId =
    typeof req.query.placeId === "string" ? req.query.placeId.trim() : "";
  if (!placeId) {
    return res
      .status(400)
      .json({ error: "placeId query parameter is required" });
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error:
        "Place details is not configured (set GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_API_KEY)",
    });
  }

  try {
    const fields = [
      "name",
      "formatted_address",
      "formatted_phone_number",
      "website",
      "rating",
      "user_ratings_total",
      "opening_hours",
      "reviews",
      "editorial_summary",
      "photos",
      "url",
    ].join(",");

    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/details/json"
    );
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", fields);
    url.searchParams.set("key", apiKey);

    const gRes = await fetch(url.toString());
    const data = (await gRes.json()) as {
      status: string;
      result?: {
        name?: string;
        formatted_address?: string;
        formatted_phone_number?: string;
        website?: string;
        rating?: number;
        user_ratings_total?: number;
        opening_hours?: { weekday_text?: string[] };
        reviews?: Array<{
          author_name?: string;
          rating?: number;
          text?: string;
        }>;
        editorial_summary?: { overview?: string };
        photos?: Array<{ photo_reference?: string }>;
        url?: string;
      };
      error_message?: string;
    };

    if (data.status !== "OK" || !data.result) {
      console.error(
        "[places/details] Google status:",
        data.status,
        data.error_message
      );
      return res.status(502).json({
        error:
          data.error_message ||
          data.status ||
          "Google Place Details request failed",
      });
    }

    const r = data.result;
    const photoUrls = (r.photos || [])
      .slice(0, 8)
      .map((p) => {
        const ref = p.photo_reference;
        if (!ref) return null;
        const photoUrl = new URL(
          "https://maps.googleapis.com/maps/api/place/photo"
        );
        photoUrl.searchParams.set("maxwidth", "600");
        photoUrl.searchParams.set("photo_reference", ref);
        photoUrl.searchParams.set("key", apiKey);
        return photoUrl.toString();
      })
      .filter((u): u is string => u != null);

    res.json({
      name: r.name,
      formattedAddress: r.formatted_address,
      formattedPhoneNumber: r.formatted_phone_number,
      website: r.website,
      rating: r.rating,
      userRatingsTotal: r.user_ratings_total,
      weekdayText: r.opening_hours?.weekday_text || [],
      reviews: (r.reviews || []).map((rev) => ({
        authorName: rev.author_name,
        rating: rev.rating,
        text: rev.text,
      })),
      editorialOverview: r.editorial_summary?.overview ?? null,
      photoUrls,
      mapsUrl: r.url ?? null,
    });
  } catch (e) {
    console.error("Error in /api/places/details:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/places/routes
// Server-side Google Directions summary for mobile route parity with web.
placesRouter.get("/routes", async (req, res) => {
  const originLat = Number(req.query.originLat);
  const originLng = Number(req.query.originLng);
  const destLat = Number(req.query.destLat);
  const destLng = Number(req.query.destLng);

  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(destLat) ||
    !Number.isFinite(destLng)
  ) {
    return res.status(400).json({
      error: "originLat, originLng, destLat, and destLng are required",
    });
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "Routes are not configured (set GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_API_KEY)",
    });
  }

  const fetchRoute = async (mode: "driving" | "transit" | "walking") => {
    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", `${originLat},${originLng}`);
    url.searchParams.set("destination", `${destLat},${destLng}`);
    url.searchParams.set("mode", mode);
    if (mode === "driving" || mode === "transit") {
      url.searchParams.set("departure_time", "now");
    }
    url.searchParams.set("key", apiKey);

    const gRes = await fetch(url.toString());
    const data = (await gRes.json()) as {
      status: string;
      routes?: Array<{
        legs?: Array<{
          distance?: { text?: string; value?: number };
          duration?: { text?: string; value?: number };
          duration_in_traffic?: { text?: string; value?: number };
        }>;
      }>;
    };

    const leg = data.routes?.[0]?.legs?.[0];
    if (data.status !== "OK" || !leg) return null;
    return {
      distanceText: leg.distance?.text || "",
      durationText:
        mode === "driving"
          ? leg.duration_in_traffic?.text || leg.duration?.text || ""
          : leg.duration?.text || "",
      distanceMeters: leg.distance?.value ?? null,
      durationSeconds:
        mode === "driving"
          ? leg.duration_in_traffic?.value ?? leg.duration?.value ?? null
          : leg.duration?.value ?? null,
    };
  };

  try {
    const [driving, transit, walking] = await Promise.all([
      fetchRoute("driving"),
      fetchRoute("transit"),
      fetchRoute("walking"),
    ]);
    res.json({ driving, transit, walking });
  } catch (e) {
    console.error("Error in /api/places/routes:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/places
// Fetch all saved places for the authenticated user (or a friend's nest if authorized)
placesRouter.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const { locationId } = req.query;
    const client = await clientPromise;
    const db = client.db();
    
    // Default: find user's own places
    let query: any = { userEmail: user.email };

    if (locationId) {
      // Check who owns this location
      const loc = await db.collection("user_locations").findOne({ _id: new ObjectId(locationId as string) });
      
      if (loc) {
        if (loc.userEmail === user.email) {
          // It's the user's own location
          query = { locationId, userEmail: user.email };
        } else {
          // It's someone else's location. Check if they are friends.
          const friendRequest = await db.collection("friend_requests").findOne({
            status: "accepted",
            $or: [
              { fromEmail: user.email, toEmail: loc.userEmail },
              { fromEmail: loc.userEmail, toEmail: user.email }
            ]
          });

          if (friendRequest) {
            const follow = await db.collection("nest_follows").findOne({
              userEmail: user.email,
              nestId: String(loc._id),
            });
            const locCoords = normalizeCoordinates(loc.coordinates);
            const isAutoFollowable = locCoords
              ? await isNestAutoFollowable(db, user.email, locCoords)
              : false;

            if (!follow && !isAutoFollowable) {
              return res.status(403).json({ error: "Follow this nest to view it" });
            }

            // They are friends and this nest is followed/auto-followable.
            query = { locationId, userEmail: loc.userEmail };
          } else {
            return res.status(403).json({ error: "Unauthorized to view this nest" });
          }
        }
      } else {
        return res.status(404).json({ error: "Location not found" });
      }
    } else if (req.query.all === "true") {
      // Fetch ALL places for user
      query = { userEmail: user.email };
    } else {
      // Fetch user's root places (no locationId)
      query = { userEmail: user.email, locationId: { $in: [null, ""] } };
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
    const { category, status, locationId, lastVisitDate } = req.body;
    const user = (req as any).user;
    
    const client = await clientPromise;
    const db = client.db();
    
    const updateDoc: any = {};
    if (category) updateDoc.category = category;
    if (status) updateDoc.status = status;
    if (locationId !== undefined) updateDoc.locationId = locationId || null;
    if (lastVisitDate !== undefined) updateDoc.lastVisitDate = lastVisitDate || null;
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

    // Clean up personal visit logs for this place
    await db.collection("place_visits").deleteMany({
      placeDocId: id,
      userEmail: user.email,
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting place:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
