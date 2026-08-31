import type express from "express";
import { isTempleAdminForPlace } from "../lib/userRoles";

export async function requireTempleAdminForPlace(
  req: express.Request,
  res: express.Response,
  placeId: string
): Promise<boolean> {
  const user = (req as express.Request & { user?: { email: string } }).user;
  if (!user?.email) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const allowed = await isTempleAdminForPlace(user.email, placeId);
  if (!allowed) {
    res.status(403).json({ error: "You are not an admin for this temple" });
    return false;
  }
  return true;
}
