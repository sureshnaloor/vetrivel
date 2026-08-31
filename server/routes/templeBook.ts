import express from "express";
import { ObjectId } from "mongodb";
import clientPromise from "../lib/db";
import { requireUser } from "../middleware/requireUser";
import { requireTempleAdminForPlace } from "../middleware/requireTempleAdmin";
import { attachUserIfPresent } from "../middleware/attachUserIfPresent";
import {
  ensureUserRole,
  getAdministeredTemples,
  isPlatformAdmin,
  isTempleAdminForPlace,
  normalizeEmail,
  TEMPLE_ADMIN_ROLE,
  userHasRole,
} from "../lib/userRoles";

export const templeBookRouter = express.Router();

const MAX_MEDIA_BASE64 = 2_800_000;

type MediaItem = { url: string; caption?: string; title?: string };
type BankDetails = {
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  branch?: string;
};

function normalizePlaceId(raw: string): string | null {
  const id = raw?.trim();
  if (!id) return null;
  return id;
}

// ─── Profile / directory ─────────────────────────────────────────────────────

templeBookRouter.get("/my-temples", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const temples = await getAdministeredTemples(user.email);
    const client = await clientPromise;
    const db = client.db();
    const placeIds = temples.map((t) => t.placeId);
    const pages = placeIds.length
      ? await db.collection("temple_pages").find({ placeId: { $in: placeIds } }).toArray()
      : [];
    const pageMap = new Map(pages.map((p) => [p.placeId, p]));

    res.json(
      temples.map((t) => ({
        placeId: t.placeId,
        templeName: t.templeName ?? "",
        templeAddress: t.templeAddress ?? "",
        page: pageMap.get(t.placeId) ?? null,
      }))
    );
  } catch (error) {
    console.error("Error listing admin temples:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Published temple directory for devotees
templeBookRouter.get("/pages", async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db();
    const pages = await db
      .collection("temple_pages")
      .find({ isPublished: true })
      .sort({ updatedAt: -1 })
      .limit(100)
      .toArray();
    res.json(pages);
  } catch (error) {
    console.error("Error listing temple pages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Public or admin preview
templeBookRouter.get("/pages/:placeId", attachUserIfPresent, async (req, res) => {
  try {
    const placeId = normalizePlaceId(req.params.placeId);
    if (!placeId) return res.status(400).json({ error: "Invalid place id" });

    const client = await clientPromise;
    const db = client.db();
    const page = await db.collection("temple_pages").findOne({ placeId });

    if (!page) {
      return res.status(404).json({ error: "Temple page not found" });
    }

    const user = (req as any).user;
    const isAdmin = user?.email ? await isTempleAdminForPlace(user.email, placeId) : false;
    if (!page.isPublished && !isAdmin) {
      return res.status(404).json({ error: "Temple page not found" });
    }

    const offerings = await db
      .collection("temple_offerings")
      .find({ placeId, isActive: true })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({ page, offerings, isAdmin });
  } catch (error) {
    console.error("Error fetching temple page:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create or update temple page (admin)
templeBookRouter.put("/pages/:placeId", requireUser, async (req, res) => {
  try {
    const placeId = normalizePlaceId(req.params.placeId);
    if (!placeId) return res.status(400).json({ error: "Invalid place id" });

    if (!(await requireTempleAdminForPlace(req, res, placeId))) return;

    const user = (req as any).user;
    const {
      name,
      address,
      coordinates,
      descriptionHtml,
      images,
      videos,
      audio,
      payment,
      isPublished,
    } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Temple name is required" });
    }

    const sanitizeMedia = (items: unknown, label: string): MediaItem[] => {
      if (!Array.isArray(items)) return [];
      return items
        .filter((item) => item && typeof item.url === "string" && item.url.trim())
        .map((item) => ({
          url: item.url.trim(),
          caption: typeof item.caption === "string" ? item.caption.trim() : undefined,
          title: typeof item.title === "string" ? item.title.trim() : undefined,
        }))
        .filter((item) => item.url.length <= MAX_MEDIA_BASE64);
    };

    const paymentDoc: Record<string, unknown> = {};
    if (payment && typeof payment === "object") {
      const p = payment as Record<string, unknown>;
      if (typeof p.upiId === "string") paymentDoc.upiId = p.upiId.trim();
      if (typeof p.upiQrImageUrl === "string" && p.upiQrImageUrl.length <= MAX_MEDIA_BASE64) {
        paymentDoc.upiQrImageUrl = p.upiQrImageUrl;
      }
      if (p.bankDetails && typeof p.bankDetails === "object") {
        const b = p.bankDetails as BankDetails;
        paymentDoc.bankDetails = {
          accountName: b.accountName?.trim() ?? "",
          accountNumber: b.accountNumber?.trim() ?? "",
          ifsc: b.ifsc?.trim() ?? "",
          bankName: b.bankName?.trim() ?? "",
          branch: b.branch?.trim() ?? "",
        };
      }
    }

    const doc = {
      placeId,
      name: name.trim(),
      address: typeof address === "string" ? address.trim() : "",
      coordinates:
        coordinates &&
        typeof coordinates.lat === "number" &&
        typeof coordinates.lng === "number"
          ? { lat: coordinates.lat, lng: coordinates.lng }
          : null,
      descriptionHtml: typeof descriptionHtml === "string" ? descriptionHtml : "",
      images: sanitizeMedia(images, "image"),
      videos: sanitizeMedia(videos, "video"),
      audio: sanitizeMedia(audio, "audio"),
      payment: paymentDoc,
      isPublished: Boolean(isPublished),
      updatedByEmail: user.email,
      updatedAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db();

    await db.collection("temple_pages").updateOne(
      { placeId },
      {
        $set: doc,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    const saved = await db.collection("temple_pages").findOne({ placeId });
    res.json(saved);
  } catch (error) {
    console.error("Error upserting temple page:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── Offerings (puja, donation, prasad) ──────────────────────────────────────

templeBookRouter.post("/pages/:placeId/offerings", requireUser, async (req, res) => {
  try {
    const placeId = normalizePlaceId(req.params.placeId);
    if (!placeId) return res.status(400).json({ error: "Invalid place id" });
    if (!(await requireTempleAdminForPlace(req, res, placeId))) return;

    const { type, title, description, price, currency, requiresBooking, slots } = req.body;
    const validTypes = ["puja", "donation", "prasad", "other"];
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "title is required" });
    }
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(", ")}` });
    }

    const offering = {
      placeId,
      type,
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : "",
      price: typeof price === "number" && price >= 0 ? price : null,
      currency: typeof currency === "string" ? currency : "INR",
      requiresBooking: Boolean(requiresBooking),
      slots: Array.isArray(slots)
        ? slots.filter((s: unknown) => typeof s === "string").map((s: string) => s.trim())
        : [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("temple_offerings").insertOne(offering);
    res.json({ _id: result.insertedId, ...offering });
  } catch (error) {
    console.error("Error creating offering:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

templeBookRouter.patch("/offerings/:id", requireUser, async (req, res) => {
  try {
    const offeringId = ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null;
    if (!offeringId) return res.status(400).json({ error: "Invalid offering id" });

    const client = await clientPromise;
    const db = client.db();
    const existing = await db.collection("temple_offerings").findOne({ _id: offeringId });
    if (!existing) return res.status(404).json({ error: "Offering not found" });

    if (!(await requireTempleAdminForPlace(req, res, existing.placeId))) return;

    const update: Record<string, unknown> = { updatedAt: new Date() };
    const { title, description, price, requiresBooking, slots, isActive, type } = req.body;
    if (typeof title === "string") update.title = title.trim();
    if (typeof description === "string") update.description = description.trim();
    if (typeof price === "number") update.price = price >= 0 ? price : null;
    if (typeof requiresBooking === "boolean") update.requiresBooking = requiresBooking;
    if (typeof isActive === "boolean") update.isActive = isActive;
    if (Array.isArray(slots)) {
      update.slots = slots.filter((s: unknown) => typeof s === "string").map((s: string) => s.trim());
    }
    if (typeof type === "string") update.type = type;

    const result = await db.collection("temple_offerings").findOneAndUpdate(
      { _id: offeringId },
      { $set: update },
      { returnDocument: "after" }
    );

    const doc =
      result && typeof result === "object" && "value" in result
        ? (result as { value: unknown }).value
        : result;

    res.json(doc);
  } catch (error) {
    console.error("Error updating offering:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

templeBookRouter.delete("/offerings/:id", requireUser, async (req, res) => {
  try {
    const offeringId = ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null;
    if (!offeringId) return res.status(400).json({ error: "Invalid offering id" });

    const client = await clientPromise;
    const db = client.db();
    const existing = await db.collection("temple_offerings").findOne({ _id: offeringId });
    if (!existing) return res.status(404).json({ error: "Offering not found" });

    if (!(await requireTempleAdminForPlace(req, res, existing.placeId))) return;

    await db.collection("temple_offerings").deleteOne({ _id: offeringId });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting offering:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── Bookings (devotee requests) ─────────────────────────────────────────────

templeBookRouter.post("/bookings", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { placeId, offeringId, preferredDate, preferredSlot, notes, donorName, donorPhone } =
      req.body;

    if (!placeId || !offeringId) {
      return res.status(400).json({ error: "placeId and offeringId are required" });
    }

    const client = await clientPromise;
    const db = client.db();

    const page = await db.collection("temple_pages").findOne({ placeId, isPublished: true });
    if (!page) return res.status(404).json({ error: "Temple is not available for booking" });

    const offeringOid = ObjectId.isValid(offeringId) ? new ObjectId(offeringId) : null;
    if (!offeringOid) return res.status(400).json({ error: "Invalid offering id" });

    const offering = await db.collection("temple_offerings").findOne({
      _id: offeringOid,
      placeId,
      isActive: true,
    });
    if (!offering) return res.status(404).json({ error: "Offering not found" });

    const booking = {
      placeId,
      offeringId: String(offering._id),
      offeringTitle: offering.title,
      offeringType: offering.type,
      userEmail: user.email,
      userName: user.name || user.email.split("@")[0],
      donorName: typeof donorName === "string" ? donorName.trim() : user.name || "",
      donorPhone: typeof donorPhone === "string" ? donorPhone.trim() : "",
      preferredDate: typeof preferredDate === "string" ? preferredDate : null,
      preferredSlot: typeof preferredSlot === "string" ? preferredSlot : null,
      notes: typeof notes === "string" ? notes.trim() : "",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("temple_bookings").insertOne(booking);
    res.json({ _id: result.insertedId, ...booking });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

templeBookRouter.get("/pages/:placeId/bookings", requireUser, async (req, res) => {
  try {
    const placeId = normalizePlaceId(req.params.placeId);
    if (!placeId) return res.status(400).json({ error: "Invalid place id" });
    if (!(await requireTempleAdminForPlace(req, res, placeId))) return;

    const client = await clientPromise;
    const db = client.db();
    const bookings = await db
      .collection("temple_bookings")
      .find({ placeId })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    res.json(bookings);
  } catch (error) {
    console.error("Error listing bookings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

templeBookRouter.patch("/bookings/:id", requireUser, async (req, res) => {
  try {
    const bookingId = ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null;
    if (!bookingId) return res.status(400).json({ error: "Invalid booking id" });

    const client = await clientPromise;
    const db = client.db();
    const booking = await db.collection("temple_bookings").findOne({ _id: bookingId });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (!(await requireTempleAdminForPlace(req, res, booking.placeId))) return;

    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
    }

    const result = await db.collection("temple_bookings").findOneAndUpdate(
      { _id: bookingId },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    const doc =
      result && typeof result === "object" && "value" in result
        ? (result as { value: unknown }).value
        : result;

    res.json(doc);
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── Temple admin assignments (platform admin) ───────────────────────────────

templeBookRouter.get("/admins", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!isPlatformAdmin(user.email)) {
      return res.status(403).json({ error: "Platform admin only" });
    }

    const client = await clientPromise;
    const db = client.db();
    const admins = await db
      .collection("temple_admins")
      .find({})
      .sort({ templeName: 1 })
      .toArray();
    res.json(admins);
  } catch (error) {
    console.error("Error listing temple admins:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

templeBookRouter.post("/admins", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!isPlatformAdmin(user.email)) {
      return res.status(403).json({ error: "Platform admin only" });
    }

    const { userEmail, placeId, templeName, templeAddress } = req.body;
    if (!userEmail || !placeId || !templeName) {
      return res.status(400).json({ error: "userEmail, placeId, and templeName are required" });
    }

    const normalizedEmail = normalizeEmail(userEmail);
    await ensureUserRole(normalizedEmail, TEMPLE_ADMIN_ROLE);

    const assignment = {
      userEmail: normalizedEmail,
      placeId: String(placeId).trim(),
      templeName: String(templeName).trim(),
      templeAddress: typeof templeAddress === "string" ? templeAddress.trim() : "",
      status: "active",
      assignedBy: user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db();

    await db.collection("temple_admins").updateOne(
      { userEmail: normalizedEmail, placeId: assignment.placeId },
      { $set: assignment },
      { upsert: true }
    );

    res.json(assignment);
  } catch (error) {
    console.error("Error assigning temple admin:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

templeBookRouter.delete("/admins/:placeId/:email", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!isPlatformAdmin(user.email)) {
      return res.status(403).json({ error: "Platform admin only" });
    }

    const placeId = normalizePlaceId(req.params.placeId);
    const email = normalizeEmail(req.params.email);
    if (!placeId || !email) return res.status(400).json({ error: "Invalid parameters" });

    const client = await clientPromise;
    const db = client.db();
    await db.collection("temple_admins").updateOne(
      { userEmail: email, placeId },
      { $set: { status: "revoked", updatedAt: new Date() } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error revoking temple admin:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Self-claim flow: temple admin role users can link a Google Place to themselves (one-time setup)
templeBookRouter.post("/claim-temple", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const hasRole = await userHasRole(user.email, TEMPLE_ADMIN_ROLE);
    if (!hasRole && !isPlatformAdmin(user.email)) {
      return res.status(403).json({ error: "Temple admin role required. Contact platform support." });
    }

    const { placeId, templeName, templeAddress, coordinates } = req.body;
    if (!placeId || !templeName) {
      return res.status(400).json({ error: "placeId and templeName are required" });
    }

    const assignment = {
      userEmail: normalizeEmail(user.email),
      placeId: String(placeId).trim(),
      templeName: String(templeName).trim(),
      templeAddress: typeof templeAddress === "string" ? templeAddress.trim() : "",
      status: "active",
      assignedBy: user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db();

    const existing = await db.collection("temple_admins").findOne({
      placeId: assignment.placeId,
      status: "active",
      userEmail: { $ne: assignment.userEmail },
    });
    if (existing) {
      return res.status(400).json({ error: "This temple already has an active admin" });
    }

    await db.collection("temple_admins").updateOne(
      { userEmail: assignment.userEmail, placeId: assignment.placeId },
      { $set: assignment },
      { upsert: true }
    );

    await ensureUserRole(user.email, TEMPLE_ADMIN_ROLE);

  // Seed empty page if missing
    await db.collection("temple_pages").updateOne(
      { placeId: assignment.placeId },
      {
        $setOnInsert: {
          placeId: assignment.placeId,
          name: assignment.templeName,
          address: assignment.templeAddress,
          coordinates:
            coordinates &&
            typeof coordinates.lat === "number" &&
            typeof coordinates.lng === "number"
              ? { lat: coordinates.lat, lng: coordinates.lng }
              : null,
          descriptionHtml: "",
          images: [],
          videos: [],
          audio: [],
          payment: {},
          isPublished: false,
          updatedByEmail: user.email,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    res.json(assignment);
  } catch (error) {
    console.error("Error claiming temple:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
