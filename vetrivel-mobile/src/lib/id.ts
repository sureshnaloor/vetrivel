/** Stable string id from Mongo `_id` (string, or legacy `{ $oid }` in JSON). */
export function normalizeDocumentId(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null && "$oid" in raw) {
    const oid = (raw as { $oid: unknown }).$oid;
    return oid != null ? String(oid) : null;
  }
  return String(raw);
}
