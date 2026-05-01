import express from "express";
import { ObjectId } from "mongodb";
import { SignJWT, createRemoteJWKSet, jwtVerify } from "jose";
import clientPromise from "../lib/db";

const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

const googleIssuers = ["https://accounts.google.com", "accounts.google.com"];

function getAllowedGoogleAudiences(): string[] {
  const fromList = (process.env.GOOGLE_MOBILE_CLIENT_IDS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  /** Same client as Expo `webClientId`; ID tokens often use this `aud` even on Android/iOS. */
  const mobileWeb = process.env.GOOGLE_MOBILE_WEB_CLIENT_ID?.trim();
  const webClientId = process.env.AUTH_GOOGLE_ID?.trim();
  const merged = [...fromList, mobileWeb, webClientId].filter(
    (v): v is string => Boolean(v)
  );
  return [...new Set(merged)];
}

function tokenAudiences(payload: { aud?: unknown }): string[] {
  const { aud } = payload;
  if (aud == null) return [];
  if (Array.isArray(aud)) return aud.map((a) => String(a));
  return [String(aud)];
}

async function verifyGoogleIdToken(idToken: string, allowedClientIds: string[]) {
  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: googleIssuers,
  });
  const tokenAuds = tokenAudiences(payload);
  if (!tokenAuds.some((a) => allowedClientIds.includes(a))) {
    throw new Error("Google ID token audience is not allowed for this app");
  }
  return payload;
}

function getJwtSecret() {
  const secret = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'Missing JWT secret. Set "MOBILE_JWT_SECRET" (or fallback "AUTH_SECRET").'
    );
  }
  return new TextEncoder().encode(secret);
}

async function issueMobileAccessToken(user: {
  id: string;
  email: string;
  name?: string | null;
}) {
  const secret = getJwtSecret();
  return await new SignJWT({ email: user.email, name: user.name || null })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("vetrivel-api")
    .setAudience("vetrivel-mobile")
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export const mobileAuthRouter = express.Router();

mobileAuthRouter.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body ?? {};
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "idToken is required" });
    }

    const audiences = getAllowedGoogleAudiences();
    if (audiences.length === 0) {
      return res.status(500).json({
        error:
          "Server auth is not configured. Set AUTH_GOOGLE_ID and/or GOOGLE_MOBILE_CLIENT_IDS (and GOOGLE_MOBILE_WEB_CLIENT_ID if it differs from AUTH_GOOGLE_ID).",
      });
    }

    const payload = await verifyGoogleIdToken(idToken, audiences);

    const googleSub =
      typeof payload.sub === "string" ? payload.sub : undefined;
    const email = typeof payload.email === "string" ? payload.email : undefined;
    const name = typeof payload.name === "string" ? payload.name : null;
    const image = typeof payload.picture === "string" ? payload.picture : null;
    const emailVerified = payload.email_verified ? new Date() : null;

    if (!googleSub || !email) {
      return res.status(401).json({ error: "Invalid Google token payload" });
    }

    const client = await clientPromise;
    const db = client.db();
    const users = db.collection("users");
    const accounts = db.collection("accounts");

    const existingAccount = await accounts.findOne({
      provider: "google",
      providerAccountId: googleSub,
    });

    let userDoc:
      | { _id: ObjectId; email: string; name?: string; image?: string }
      | null = null;

    if (existingAccount?.userId) {
      const userId =
        existingAccount.userId instanceof ObjectId
          ? existingAccount.userId
          : new ObjectId(String(existingAccount.userId));
      userDoc = (await users.findOne({
        _id: userId,
      })) as typeof userDoc;
    }

    if (!userDoc) {
      const existingUserByEmail = (await users.findOne({
        email,
      })) as typeof userDoc;

      if (existingUserByEmail) {
        userDoc = existingUserByEmail;
      } else {
        const now = new Date();
        const created = await users.insertOne({
          name,
          email,
          image,
          emailVerified,
          createdAt: now,
          updatedAt: now,
        });
        userDoc = {
          _id: created.insertedId,
          email,
          name: name || undefined,
          image: image || undefined,
        };
      }
    }

    const linkedAccount = await accounts.findOne({
      provider: "google",
      providerAccountId: googleSub,
    });

    if (!linkedAccount) {
      await accounts.insertOne({
        userId: userDoc._id,
        type: "oauth",
        provider: "google",
        providerAccountId: googleSub,
      });
    }

    const accessToken = await issueMobileAccessToken({
      id: userDoc._id.toHexString(),
      email: userDoc.email,
      name: userDoc.name || null,
    });

    res.json({
      accessToken,
      tokenType: "Bearer",
      expiresIn: 60 * 60 * 24 * 7,
      user: {
        id: userDoc._id.toHexString(),
        email: userDoc.email,
        name: userDoc.name || null,
        image: userDoc.image || null,
      },
    });
  } catch (error) {
    console.error("Mobile Google auth failed:", error);
    res.status(401).json({ error: "Google authentication failed" });
  }
});
