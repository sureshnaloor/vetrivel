import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  clearAuthSession,
  getStoredAuthSession,
  type MobileAuthSession,
} from "./src/auth";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { LoginScreen } from "./src/screens/LoginScreen";

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
      <SafeAreaProvider>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
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
