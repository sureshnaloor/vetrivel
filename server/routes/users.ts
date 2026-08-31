import express from "express";
import { requireUser } from "../middleware/requireUser";
import {
  getUserRoles,
  getAdministeredTemples,
  isPlatformAdmin,
  TEMPLE_ADMIN_ROLE,
} from "../lib/userRoles";

export const usersRouter = express.Router();

usersRouter.get("/me", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const roles = await getUserRoles(user.email);
    const administeredTemples = await getAdministeredTemples(user.email);
    const isTempleAdmin =
      roles.includes(TEMPLE_ADMIN_ROLE) || isPlatformAdmin(user.email) || administeredTemples.length > 0;

    res.json({
      email: user.email,
      name: user.name ?? null,
      roles,
      isTempleAdmin,
      isPlatformAdmin: isPlatformAdmin(user.email),
      administeredTemples: administeredTemples.map((t) => ({
        placeId: t.placeId,
        templeName: t.templeName ?? "",
        templeAddress: t.templeAddress ?? "",
      })),
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
