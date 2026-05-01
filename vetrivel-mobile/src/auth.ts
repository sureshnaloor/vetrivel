import * as SecureStore from "expo-secure-store";
import { exchangeGoogleIdToken } from "./api";

const SESSION_KEY = "vetrivel.mobile.session";

export type MobileAuthSession = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
};

export async function getStoredAuthSession(): Promise<MobileAuthSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MobileAuthSession;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

export async function storeAuthSession(session: MobileAuthSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearAuthSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function loginWithGoogleIdToken(idToken: string) {
  const session = await exchangeGoogleIdToken(idToken);
  await storeAuthSession(session);
  return session;
}
