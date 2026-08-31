import clientPromise from "./db";

export const TEMPLE_ADMIN_ROLE = "temple_admin";
export const PLATFORM_ADMIN_ROLE = "platform_admin";

const PLATFORM_ADMIN_EMAILS = new Set(
  [
    process.env.PLATFORM_ADMIN_EMAIL,
    "admin@vetrivel.app",
    "sanjeevm.menon@gmail.com",
  ]
    .filter(Boolean)
    .map((e) => String(e).toLowerCase().trim())
);

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function isPlatformAdmin(email: string): boolean {
  return PLATFORM_ADMIN_EMAILS.has(normalizeEmail(email));
}

export async function getUserRoles(email: string): Promise<string[]> {
  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection("users").findOne({ email: normalizeEmail(email) });
  const roles = user?.roles;
  return Array.isArray(roles) ? roles.filter((r) => typeof r === "string") : [];
}

export async function userHasRole(email: string, role: string): Promise<boolean> {
  const roles = await getUserRoles(email);
  return roles.includes(role);
}

export async function ensureUserRole(email: string, role: string): Promise<void> {
  const client = await clientPromise;
  const db = client.db();
  const normalized = normalizeEmail(email);
  await db.collection("users").updateOne(
    { email: normalized },
    {
      $addToSet: { roles: role },
      $set: { updatedAt: new Date() },
      $setOnInsert: { email: normalized, createdAt: new Date() },
    },
    { upsert: true }
  );
}

export async function isTempleAdminForPlace(email: string, placeId: string): Promise<boolean> {
  if (isPlatformAdmin(email)) return true;
  const client = await clientPromise;
  const db = client.db();
  const assignment = await db.collection("temple_admins").findOne({
    userEmail: normalizeEmail(email),
    placeId,
    status: "active",
  });
  return !!assignment;
}

export async function getAdministeredTemples(email: string) {
  if (isPlatformAdmin(email)) {
    const client = await clientPromise;
    const db = client.db();
    return await db
      .collection("temple_admins")
      .find({ status: "active" })
      .sort({ templeName: 1 })
      .toArray();
  }
  const client = await clientPromise;
  const db = client.db();
  return await db
    .collection("temple_admins")
    .find({ userEmail: normalizeEmail(email), status: "active" })
    .sort({ templeName: 1 })
    .toArray();
}
