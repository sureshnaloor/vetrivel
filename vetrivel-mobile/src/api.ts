import axios from "axios";
import type { MobileAuthSession } from "./auth";

declare const process: {
  env: Record<string, string | undefined>;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export async function exchangeGoogleIdToken(
  idToken: string
): Promise<MobileAuthSession> {
  const { data } = await api.post("/api/mobile/auth/google", { idToken });
  return data as MobileAuthSession;
}

export async function getLocations(accessToken: string) {
  const { data } = await api.get("/api/locations", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data as Array<{ _id: string; name: string; address?: string }>;
}

export async function getPlaces(accessToken: string) {
  const { data } = await api.get("/api/places", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data as Array<{ _id: string; name: string; category?: string; status?: string }>;
}
