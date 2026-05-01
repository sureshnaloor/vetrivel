import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, View, ActivityIndicator } from "react-native";
import {
  clearAuthSession,
  getStoredAuthSession,
  type MobileAuthSession,
} from "./src/auth";
import { LoginScreen } from "./src/screens/LoginScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";

export default function App() {
  const [session, setSession] = useState<MobileAuthSession | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    getStoredAuthSession()
      .then((value) => setSession(value))
      .finally(() => setBooting(false));
  }, []);

  if (booting) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {session ? (
          <DashboardScreen
            session={session}
            onLogout={async () => {
              await clearAuthSession();
              setSession(null);
            }}
          />
        ) : (
          <LoginScreen onLoggedIn={setSession} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});
