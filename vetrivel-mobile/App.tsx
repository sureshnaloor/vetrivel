import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { acceptFriendInvite } from "./src/api";
import {
  clearAuthSession,
  getStoredAuthSession,
  type MobileAuthSession,
} from "./src/auth";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ThemeProvider } from "./src/contexts/ThemeContext";

function extractInviteToken(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.get("invite")) {
      return parsed.searchParams.get("invite");
    }
    if (parsed.hostname === "invite") {
      return parsed.pathname.replace(/^\//, "") || null;
    }
    if (parsed.pathname.startsWith("/invite/")) {
      return parsed.pathname.replace("/invite/", "") || null;
    }
  } catch {
    const match = url.match(/(?:invite=|invite\/)([A-Za-z0-9]+)/);
    return match?.[1] ?? null;
  }
  return null;
}

export default function App() {
  const [session, setSession] = useState<MobileAuthSession | null>(null);
  const [booting, setBooting] = useState(true);
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);
  const processingInviteTokenRef = useRef<string | null>(null);

  useEffect(() => {
    getStoredAuthSession()
      .then((value) => setSession(value))
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    const handleUrl = (url: string) => {
      const token = extractInviteToken(url);
      if (token) setPendingInviteToken(token);
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!session || !pendingInviteToken) return;
    const token = pendingInviteToken;
    if (processingInviteTokenRef.current === token) return;
    processingInviteTokenRef.current = token;
    acceptFriendInvite(session.accessToken, token)
      .then((message) => {
        setPendingInviteToken(null);
        Alert.alert("Invite accepted", message);
      })
      .catch((e: unknown) => {
        processingInviteTokenRef.current = null;
        Alert.alert("Could not accept invite", e instanceof Error ? e.message : "Try again.");
      });
  }, [session, pendingInviteToken]);

  if (booting) {
    return (
      <SafeAreaProvider>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider style={styles.app}>
        <StatusBar style="dark" />
        {session ? (
          <NavigationContainer>
            <View style={styles.authedRoot}>
              <AppNavigator
                session={session}
                onLogout={async () => {
                  await clearAuthSession();
                  setSession(null);
                }}
              />
            </View>
          </NavigationContainer>
        ) : (
          <View style={styles.guestRoot}>
            <LoginScreen onLoggedIn={setSession} />
          </View>
        )}
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: "#fff",
  },
  authedRoot: {
    flex: 1,
  },
  guestRoot: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});
