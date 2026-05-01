import type express from "express";
import { getSession } from "@auth/express";
import { jwtVerify } from "jose";
import { authConfig } from "../auth.config";

export type AuthenticatedUser = {
  id?: string;
  email: string;
  name?: string | null;
};

function getJwtSecret() {
  const secret = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'Missing JWT secret. Set "MOBILE_JWT_SECRET" (or fallback "AUTH_SECRET").'
    );
  }
  return new TextEncoder().encode(secret);
}

async function getUserFromBearerToken(
  req: express.Request
): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: "vetrivel-api",
      audience: "vetrivel-mobile",
    });

    const email = typeof payload.email === "string" ? payload.email : null;
    if (!email) return null;

    return {
      id: typeof payload.sub === "string" ? payload.sub : undefined,
      email,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch {
    return null;
  }
}

export const requireUser = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const bearerUser = await getUserFromBearerToken(req);
  if (bearerUser) {
    (req as any).user = bearerUser;
    return next();
  }

  const session = await getSession(req, authConfig);
  if (!session || !session.user || !session.user.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  (req as any).user = {
    email: session.user.email,
    name: session.user.name || null,
  } satisfies AuthenticatedUser;
  next();
};
