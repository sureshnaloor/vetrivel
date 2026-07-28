import axios, { isAxiosError } from "axios";
import { Platform } from "react-native";
import type { MobileAuthSession } from "./auth";
import { normalizeLatLng, type LatLng } from "./lib/geo";
import { normalizeDocumentId } from "./lib/id";

/** Stable key shared with web `getTempleKey` for `/api/temple-content`. */
export function getTempleKey(
  placeId?: string | null,
  name?: string
): string {
  if (placeId) return placeId;
  return (name || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

declare const process: {
  env: Record<string, string | undefined>;
};

const API_BASE_URL =
  (Platform.OS === "android"
    ? process.env.EXPO_PUBLIC_API_URL_ANDROID
    : process.env.EXPO_PUBLIC_API_URL_IOS) ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export function getApiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error && typeof data.error === "string") return data.error;
    if (typeof error.message === "string" && error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Request failed";
}

export type UserLocation = {
  _id: string;
  name: string;
  coordinates: LatLng;
  address?: string;
  visibility?: "private" | "published";
  purpose?: string;
  publishedAt?: string | null;
};

export type Friend = {
  _id: string;
  email: string;
  name: string;
  since: string;
};

export type FriendRequest = {
  _id: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
};

export type FriendNest = {
  _id: string;
  name: string;
  coordinates: LatLng;
  address?: string;
  ownerEmail: string;
  ownerName: string;
  distanceKm: number | null;
  followStatus: "auto" | "manual" | "available";
  canOpen: boolean;
};

export type UserPlaceCategory = "nest" | "interest" | "pin";

export type UserPlace = {
  _id: string;
  placeId?: string | null;
  locationId?: string | null;
  name: string;
  coordinates: LatLng;
  category: UserPlaceCategory;
  status: string;
  lastVisitDate?: string | null;
};

export async function exchangeGoogleIdToken(
  idToken: string
): Promise<MobileAuthSession> {
  try {
    const { data } = await api.post("/api/mobile/auth/google", { idToken });
    return data as MobileAuthSession;
  } catch (e) {
    throw new Error(getApiErrorMessage(e));
  }
}

export type AppleSignInProfile = {
  givenName?: string;
  familyName?: string;
};

export async function exchangeAppleIdentityToken(
  identityToken: string,
  profile?: AppleSignInProfile
): Promise<MobileAuthSession> {
  try {
    const { data } = await api.post("/api/mobile/auth/apple", {
      identityToken,
      givenName: profile?.givenName,
      familyName: profile?.familyName,
    });
    return data as MobileAuthSession;
  } catch (e) {
    throw new Error(getApiErrorMessage(e));
  }
}

function mapLocationRow(row: Record<string, unknown>): UserLocation | null {
  const id = normalizeDocumentId(row._id);
  if (!id) return null;
  const coords = normalizeLatLng(row.coordinates);
  if (!coords) return null;
  return {
    _id: id,
    name: String(row.name ?? ""),
    coordinates: coords,
    address: row.address != null ? String(row.address) : undefined,
    visibility: row.visibility === "published" ? "published" : "private",
    purpose: row.purpose != null ? String(row.purpose) : "",
    publishedAt:
      row.publishedAt != null && row.publishedAt !== ""
        ? String(row.publishedAt)
        : null,
  };
}

export type CreateLocationInput = {
  name: string;
  coordinates: LatLng;
  address?: string;
};

/** Create a saved space (same contract as web `saveLocation`). */
export async function createLocation(
  accessToken: string,
  input: CreateLocationInput
): Promise<UserLocation> {
  const { data } = await api.post(
    "/api/locations",
    {
      name: input.name.trim(),
      coordinates: input.coordinates,
      address: input.address?.trim() ?? "",
    },
    { headers: authHeaders(accessToken) }
  );
  const row = data as Record<string, unknown>;
  const loc = mapLocationRow(row);
  if (!loc) {
    throw new Error("Invalid location response from server");
  }
  return loc;
}

/** Saved spaces (maps / nests) for the signed-in user. */
export async function getLocations(accessToken: string): Promise<UserLocation[]> {
  const { data } = await api.get("/api/locations", {
    headers: authHeaders(accessToken),
  });
  const rows = data as Record<string, unknown>[];
  const out: UserLocation[] = [];
  for (const row of rows) {
    const loc = mapLocationRow(row);
    if (loc) out.push(loc);
  }
  return out;
}

function mapFriendNestRow(row: Record<string, unknown>): FriendNest | null {
  const id = normalizeDocumentId(row._id);
  if (!id) return null;
  const coords = normalizeLatLng(row.coordinates);
  if (!coords) return null;
  const status = row.followStatus;
  const followStatus: FriendNest["followStatus"] =
    status === "auto" || status === "manual" || status === "available"
      ? status
      : "available";
  return {
    _id: id,
    name: String(row.name ?? ""),
    coordinates: coords,
    address: row.address != null ? String(row.address) : undefined,
    ownerEmail: String(row.ownerEmail ?? ""),
    ownerName: String(row.ownerName ?? row.ownerEmail ?? ""),
    distanceKm:
      typeof row.distanceKm === "number" && Number.isFinite(row.distanceKm)
        ? row.distanceKm
        : null,
    followStatus,
    canOpen: Boolean(row.canOpen),
  };
}

export async function getFriends(accessToken: string): Promise<Friend[]> {
  const { data } = await api.get("/api/friends", {
    headers: authHeaders(accessToken),
  });
  return data as Friend[];
}

export async function getIncomingFriendRequests(
  accessToken: string
): Promise<FriendRequest[]> {
  const { data } = await api.get("/api/friends/requests", {
    headers: authHeaders(accessToken),
  });
  return data as FriendRequest[];
}

export async function getSentFriendRequests(
  accessToken: string
): Promise<FriendRequest[]> {
  const { data } = await api.get("/api/friends/sent", {
    headers: authHeaders(accessToken),
  });
  return data as FriendRequest[];
}

export async function sendFriendRequest(
  accessToken: string,
  toEmail: string
): Promise<FriendRequest> {
  const { data } = await api.post(
    "/api/friends/request",
    { toEmail },
    { headers: authHeaders(accessToken) }
  );
  return data as FriendRequest;
}

export async function acceptFriendRequest(
  accessToken: string,
  requestId: string
): Promise<void> {
  await api.patch(`/api/friends/request/${requestId}/accept`, undefined, {
    headers: authHeaders(accessToken),
  });
}

export async function rejectFriendRequest(
  accessToken: string,
  requestId: string
): Promise<void> {
  await api.patch(`/api/friends/request/${requestId}/reject`, undefined, {
    headers: authHeaders(accessToken),
  });
}

export async function createFriendInvite(
  accessToken: string,
  toEmail: string
): Promise<string> {
  const { data } = await api.post(
    "/api/friends/invite",
    { toEmail },
    { headers: authHeaders(accessToken) }
  );
  return String((data as { token: string }).token);
}

export async function acceptFriendInvite(
  accessToken: string,
  token: string
): Promise<string> {
  const { data } = await api.post(
    "/api/friends/invite/accept",
    { token },
    { headers: authHeaders(accessToken) }
  );
  return String((data as { message?: string }).message ?? "You are now friends!");
}

export async function getFriendNests(accessToken: string): Promise<FriendNest[]> {
  const { data } = await api.get("/api/friends/nests", {
    headers: authHeaders(accessToken),
  });
  const rows = data as Record<string, unknown>[];
  const out: FriendNest[] = [];
  for (const row of rows) {
    const nest = mapFriendNestRow(row);
    if (nest) out.push(nest);
  }
  return out;
}

export async function followFriendNest(
  accessToken: string,
  nestId: string
): Promise<void> {
  await api.post(
    "/api/friends/nests/follow",
    { nestId },
    { headers: authHeaders(accessToken) }
  );
}

export async function unfollowFriendNest(
  accessToken: string,
  nestId: string
): Promise<void> {
  await api.delete(`/api/friends/nests/follow/${nestId}`, {
    headers: authHeaders(accessToken),
  });
}

function mapPlaceRow(row: Record<string, unknown>): UserPlace | null {
  const id = normalizeDocumentId(row._id);
  if (!id) return null;
  const coords = normalizeLatLng(row.coordinates);
  if (!coords) return null;
  const cat = row.category;
  const category: UserPlaceCategory =
    cat === "nest" || cat === "interest" || cat === "pin" ? cat : "interest";
  return {
    _id: id,
    placeId: row.placeId != null ? String(row.placeId) : null,
    locationId:
      row.locationId != null && row.locationId !== ""
        ? String(row.locationId)
        : null,
    name: String(row.name ?? ""),
    coordinates: coords,
    category,
    status: String(row.status ?? ""),
    lastVisitDate:
      row.lastVisitDate != null && row.lastVisitDate !== ""
        ? String(row.lastVisitDate)
        : null,
  };
}

/**
 * Places tied to a saved space (`locationId` matches a `user_locations` document).
 * Matches web `fetchPlaces(activeLocationId)`.
 */
export async function getPlacesForLocation(
  accessToken: string,
  locationId: string
): Promise<UserPlace[]> {
  const { data } = await api.get("/api/places", {
    params: { locationId },
    headers: authHeaders(accessToken),
  });
  const rows = data as Record<string, unknown>[];
  const out: UserPlace[] = [];
  for (const row of rows) {
    const p = mapPlaceRow(row);
    if (p) out.push(p);
  }
  return out;
}

/**
 * Places with no `locationId` (orphan / global rows). Same as web `GET /api/places` with no query.
 */
export async function getUnscopedPlaces(accessToken: string): Promise<UserPlace[]> {
  const { data } = await api.get("/api/places", {
    headers: authHeaders(accessToken),
  });
  const rows = data as Record<string, unknown>[];
  const out: UserPlace[] = [];
  for (const row of rows) {
    const p = mapPlaceRow(row);
    if (p) out.push(p);
  }
  return out;
}

export type NearbyTemple = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  vicinity?: string;
  rating?: number;
  userRatingsTotal?: number;
};

/** Google Places nearby hindu_temple (server proxy). Matches web dashboard search. */
export async function searchNearbyTemples(
  accessToken: string,
  params: { lat: number; lng: number; radiusMeters?: number; keyword?: string }
): Promise<NearbyTemple[]> {
  const { data } = await api.get("/api/places/nearby", {
    headers: authHeaders(accessToken),
    params: {
      lat: params.lat,
      lng: params.lng,
      radius: params.radiusMeters ?? 50_000,
      ...(params.keyword ? { keyword: params.keyword } : {}),
    },
  });
  const results = (data as { results?: NearbyTemple[] }).results;
  return Array.isArray(results) ? results : [];
}

export type CreatePlaceInput = {
  name: string;
  coordinates: LatLng;
  category: "nest" | "interest";
  status: string;
  placeId?: string | null;
  locationId: string;
};

export async function createPlace(
  accessToken: string,
  input: CreatePlaceInput
): Promise<UserPlace> {
  const { data } = await api.post("/api/places", input, {
    headers: authHeaders(accessToken),
  });
  const row = data as Record<string, unknown>;
  const p = mapPlaceRow(row);
  if (!p) {
    throw new Error("Invalid place response from server");
  }
  return p;
}

export type GooglePlaceDetails = {
  name?: string;
  formattedAddress?: string;
  formattedPhoneNumber?: string;
  website?: string;
  rating?: number;
  userRatingsTotal?: number;
  weekdayText?: string[];
  reviews?: Array<{ authorName?: string; rating?: number; text?: string }>;
  editorialOverview?: string | null;
  photoUrls?: string[];
  mapsUrl?: string | null;
};

export type RouteLegSummary = {
  distanceText: string;
  durationText: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
};

export type TempleRoutes = {
  driving: RouteLegSummary | null;
  transit: RouteLegSummary | null;
  walking: RouteLegSummary | null;
};

export async function getTempleRoutes(
  accessToken: string,
  params: {
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
  }
): Promise<TempleRoutes> {
  const { data } = await api.get("/api/places/routes", {
    headers: authHeaders(accessToken),
    params,
  });
  return data as TempleRoutes;
}

/** Google Place Details via server proxy (requires auth). */
export async function getPlaceDetails(
  accessToken: string,
  placeId: string
): Promise<GooglePlaceDetails> {
  const { data } = await api.get("/api/places/details", {
    headers: authHeaders(accessToken),
    params: { placeId },
  });
  return data as GooglePlaceDetails;
}

export type TempleContentTab = "info" | "pooja" | "media" | "qa";

export type TempleContent = {
  _id: string;
  templeKey: string;
  userEmail: string;
  userName: string;
  tab: TempleContentTab;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function mapTempleContentRow(row: Record<string, unknown>): TempleContent | null {
  const id = normalizeDocumentId(row._id);
  if (!id) return null;
  const tab = row.tab;
  const t: TempleContentTab =
    tab === "info" || tab === "pooja" || tab === "media" || tab === "qa"
      ? tab
      : "info";
  return {
    _id: id,
    templeKey: String(row.templeKey ?? ""),
    userEmail: String(row.userEmail ?? ""),
    userName: String(row.userName ?? ""),
    tab: t,
    content: String(row.content ?? ""),
    mediaUrl: row.mediaUrl != null ? String(row.mediaUrl) : null,
    mediaType: row.mediaType != null ? String(row.mediaType) : null,
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
    updatedAt: row.updatedAt != null ? String(row.updatedAt) : undefined,
  };
}

/** Public read — no token required. */
export async function fetchTempleContent(
  templeKey: string
): Promise<TempleContent[]> {
  const { data } = await api.get("/api/temple-content", {
    params: { templeKey },
  });
  const rows = data as Record<string, unknown>[];
  const out: TempleContent[] = [];
  for (const row of rows) {
    const c = mapTempleContentRow(row);
    if (c) out.push(c);
  }
  return out;
}

export type NewTempleContent = {
  templeKey: string;
  tab: TempleContentTab;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
};

export async function createTempleContent(
  accessToken: string,
  entry: NewTempleContent
): Promise<TempleContent> {
  const { data } = await api.post("/api/temple-content", entry, {
    headers: authHeaders(accessToken),
  });
  const row = data as Record<string, unknown>;
  const c = mapTempleContentRow(row);
  if (!c) throw new Error("Invalid temple content response");
  return c;
}

export async function updateTempleContent(
  accessToken: string,
  id: string,
  updates: Partial<Pick<TempleContent, "content" | "mediaUrl" | "mediaType">>
): Promise<TempleContent> {
  const { data } = await api.patch(`/api/temple-content/${id}`, updates, {
    headers: authHeaders(accessToken),
  });
  const row = data as Record<string, unknown>;
  const c = mapTempleContentRow(row);
  if (!c) throw new Error("Invalid temple content response");
  return c;
}

export async function deleteTempleContent(
  accessToken: string,
  id: string
): Promise<boolean> {
  const { status } = await api.delete(`/api/temple-content/${id}`, {
    headers: authHeaders(accessToken),
  });
  return status === 200;
}

// ----------------------------------------
// Place visit logs (personal journal)
// ----------------------------------------

export type VisitMediaSource = "upload" | "camera";

export type VisitMedia = {
  id: string;
  mediaUrl: string;
  mediaType: string;
  source: VisitMediaSource;
  createdAt?: string;
};

export type PlaceVisit = {
  _id: string;
  placeDocId: string;
  userEmail?: string;
  visitDate: string;
  remarks: string;
  media: VisitMedia[];
  createdAt?: string;
  updatedAt?: string;
};

function mapVisitRow(row: Record<string, unknown>): PlaceVisit | null {
  const id = normalizeDocumentId(row._id);
  if (!id) return null;
  const mediaRaw = Array.isArray(row.media) ? row.media : [];
  const media: VisitMedia[] = [];
  for (const m of mediaRaw) {
    if (!m || typeof m !== "object") continue;
    const item = m as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.mediaUrl !== "string") continue;
    media.push({
      id: item.id,
      mediaUrl: item.mediaUrl,
      mediaType: String(item.mediaType ?? "image/jpeg"),
      source: item.source === "camera" ? "camera" : "upload",
      createdAt: item.createdAt != null ? String(item.createdAt) : undefined,
    });
  }
  return {
    _id: id,
    placeDocId: String(row.placeDocId ?? ""),
    userEmail: row.userEmail != null ? String(row.userEmail) : undefined,
    visitDate: String(row.visitDate ?? ""),
    remarks: String(row.remarks ?? ""),
    media,
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
    updatedAt: row.updatedAt != null ? String(row.updatedAt) : undefined,
  };
}

export async function getPlaceVisits(
  accessToken: string,
  placeDocId: string
): Promise<PlaceVisit[]> {
  const { data } = await api.get("/api/place-visits", {
    params: { placeDocId },
    headers: authHeaders(accessToken),
  });
  const rows = data as Record<string, unknown>[];
  const out: PlaceVisit[] = [];
  for (const row of rows) {
    const v = mapVisitRow(row);
    if (v) out.push(v);
  }
  return out;
}

export async function createPlaceVisit(
  accessToken: string,
  input: {
    placeDocId: string;
    visitDate: string;
    remarks?: string;
    media?: Array<{
      mediaUrl: string;
      mediaType: string;
      source?: VisitMediaSource;
    }>;
  }
): Promise<PlaceVisit> {
  const { data } = await api.post("/api/place-visits", input, {
    headers: authHeaders(accessToken),
  });
  const v = mapVisitRow(data as Record<string, unknown>);
  if (!v) throw new Error("Invalid visit response");
  return v;
}

export async function addVisitMedia(
  accessToken: string,
  visitId: string,
  media: {
    mediaUrl: string;
    mediaType: string;
    source?: VisitMediaSource;
  }
): Promise<PlaceVisit> {
  const { data } = await api.post(`/api/place-visits/${visitId}/media`, media, {
    headers: authHeaders(accessToken),
  });
  const v = mapVisitRow(data as Record<string, unknown>);
  if (!v) throw new Error("Invalid visit response");
  return v;
}

export async function deletePlaceVisit(
  accessToken: string,
  id: string
): Promise<boolean> {
  const { status } = await api.delete(`/api/place-visits/${id}`, {
    headers: authHeaders(accessToken),
  });
  return status === 200;
}

export async function deleteVisitMedia(
  accessToken: string,
  visitId: string,
  mediaId: string
): Promise<PlaceVisit> {
  const { data } = await api.delete(
    `/api/place-visits/${visitId}/media/${mediaId}`,
    { headers: authHeaders(accessToken) }
  );
  const v = mapVisitRow(data as Record<string, unknown>);
  if (!v) throw new Error("Invalid visit response");
  return v;
}

export function todayDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatVisitDate(isoDate: string): string {
  if (!isoDate) return "";
  const d = new Date(isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Update / publish a sacred space */
export async function updateLocation(
  accessToken: string,
  id: string,
  updates: {
    name?: string;
    address?: string;
    visibility?: "private" | "published";
    purpose?: string;
  }
): Promise<UserLocation> {
  const { data } = await api.patch(`/api/locations/${id}`, updates, {
    headers: authHeaders(accessToken),
  });
  const loc = mapLocationRow(data as Record<string, unknown>);
  if (!loc) throw new Error("Invalid location response");
  return loc;
}

// ----------------------------------------
// Communities (published spaces)
// ----------------------------------------

export type PublishedCommunity = {
  _id: string;
  name: string;
  address: string;
  purpose: string;
  ownerEmail: string;
  ownerName: string;
  memberCount: number;
  isOwner: boolean;
  isMember: boolean;
  interestStatus: "none" | "pending" | "joined";
  coordinates: LatLng;
};

export type CommunityInterestRequest = {
  _id: string;
  spaceId: string;
  spaceName: string;
  ownerEmail: string;
  fromEmail: string;
  fromName: string;
  message?: string;
  status: "pending" | "accepted" | "rejected";
};

export type CommunityMessage = {
  _id: string;
  spaceId: string;
  userEmail: string;
  userName: string;
  body: string;
  createdAt?: string;
};

export type CommunityMember = {
  _id?: string;
  spaceId: string;
  userEmail: string;
  userName: string;
  role: "owner" | "member";
};

export async function getPublishedCommunities(
  accessToken: string
): Promise<PublishedCommunity[]> {
  const { data } = await api.get("/api/communities", {
    headers: authHeaders(accessToken),
  });
  const rows = data as Record<string, unknown>[];
  return rows.map((row) => {
    const coords = normalizeLatLng(row.coordinates) || { lat: 0, lng: 0 };
    return {
      _id: normalizeDocumentId(row._id) || String(row._id),
      name: String(row.name ?? ""),
      address: String(row.address ?? ""),
      purpose: String(row.purpose ?? ""),
      ownerEmail: String(row.ownerEmail ?? ""),
      ownerName: String(row.ownerName ?? ""),
      memberCount: Number(row.memberCount ?? 0),
      isOwner: Boolean(row.isOwner),
      isMember: Boolean(row.isMember),
      interestStatus:
        row.interestStatus === "pending" || row.interestStatus === "joined"
          ? row.interestStatus
          : "none",
      coordinates: coords,
    };
  });
}

export async function getIncomingCommunityInterests(
  accessToken: string
): Promise<CommunityInterestRequest[]> {
  const { data } = await api.get("/api/communities/interests/incoming", {
    headers: authHeaders(accessToken),
  });
  return (data as Record<string, unknown>[]).map((row) => ({
    _id: normalizeDocumentId(row._id) || String(row._id),
    spaceId: String(row.spaceId ?? ""),
    spaceName: String(row.spaceName ?? ""),
    ownerEmail: String(row.ownerEmail ?? ""),
    fromEmail: String(row.fromEmail ?? ""),
    fromName: String(row.fromName ?? ""),
    message: row.message != null ? String(row.message) : undefined,
    status: "pending",
  }));
}

export async function sendCommunityInterest(
  accessToken: string,
  spaceId: string,
  message?: string
): Promise<void> {
  await api.post(
    `/api/communities/${spaceId}/interest`,
    { message: message || "" },
    { headers: authHeaders(accessToken) }
  );
}

export async function acceptCommunityInterest(
  accessToken: string,
  id: string
): Promise<void> {
  await api.patch(`/api/communities/interests/${id}/accept`, {}, {
    headers: authHeaders(accessToken),
  });
}

export async function rejectCommunityInterest(
  accessToken: string,
  id: string
): Promise<void> {
  await api.patch(`/api/communities/interests/${id}/reject`, {}, {
    headers: authHeaders(accessToken),
  });
}

export async function getCommunityMessages(
  accessToken: string,
  spaceId: string
): Promise<CommunityMessage[]> {
  const { data } = await api.get(`/api/communities/${spaceId}/messages`, {
    headers: authHeaders(accessToken),
  });
  return (data as Record<string, unknown>[]).map((row) => ({
    _id: normalizeDocumentId(row._id) || String(row._id),
    spaceId: String(row.spaceId ?? ""),
    userEmail: String(row.userEmail ?? ""),
    userName: String(row.userName ?? ""),
    body: String(row.body ?? ""),
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
  }));
}

export async function postCommunityMessage(
  accessToken: string,
  spaceId: string,
  body: string
): Promise<CommunityMessage> {
  const { data } = await api.post(
    `/api/communities/${spaceId}/messages`,
    { body },
    { headers: authHeaders(accessToken) }
  );
  const row = data as Record<string, unknown>;
  return {
    _id: normalizeDocumentId(row._id) || String(row._id),
    spaceId: String(row.spaceId ?? spaceId),
    userEmail: String(row.userEmail ?? ""),
    userName: String(row.userName ?? ""),
    body: String(row.body ?? ""),
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
  };
}

export async function getCommunityMembers(
  accessToken: string,
  spaceId: string
): Promise<CommunityMember[]> {
  const { data } = await api.get(`/api/communities/${spaceId}/members`, {
    headers: authHeaders(accessToken),
  });
  return (data as Record<string, unknown>[]).map((row) => ({
    _id: normalizeDocumentId(row._id) || undefined,
    spaceId: String(row.spaceId ?? spaceId),
    userEmail: String(row.userEmail ?? ""),
    userName: String(row.userName ?? ""),
    role: row.role === "owner" ? "owner" : "member",
  }));
}
