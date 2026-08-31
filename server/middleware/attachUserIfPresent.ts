import type express from "express";
import { getSession } from "@auth/express";
import { authConfig } from "../auth.config";

/** Attach user to request when session exists; never rejects. */
export async function attachUserIfPresent(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction
) {
  try {
    const session = await getSession(req, authConfig);
    if (session?.user?.email) {
      (req as express.Request & { user?: { email: string; name?: string | null } }).user = {
        email: session.user.email,
        name: session.user.name ?? null,
      };
    }
  } catch {
    /* ignore */
  }
  next();
}
