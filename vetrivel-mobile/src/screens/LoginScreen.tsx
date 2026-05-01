import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { loginWithGoogleIdToken, type MobileAuthSession } from "../auth";

/** Expo Go uses `exp://…` redirects, which Google OAuth rejects; use a dev build (`expo run:android`). */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

declare const process: {
  env: Record<string, string | undefined>;
};

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onLoggedIn: (session: MobileAuthSession) => void;
};

export function LoginScreen({ onLoggedIn }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    if (response?.type !== "success") return;

    const token = response.authentication?.idToken;
    if (!token) {
      setError("Google login succeeded, but idToken was missing.");
      return;
    }

    setLoading(true);
    setError(null);
    loginWithGoogleIdToken(token)
      .then(onLoggedIn)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Login failed. Please retry.")
      )
      .finally(() => setLoading(false));
  }, [response, onLoggedIn]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vetrivel Mobile</Text>
      <Text style={styles.subtitle}>
        Sign in with Google to access your dashboard.
      </Text>

      {isExpoGo ? (
        <Text style={styles.expoGoWarning}>
          Google sign-in does not work inside the Expo Go app (Google blocks the{" "}
          <Text style={styles.mono}>exp://</Text> redirect). From{" "}
          <Text style={styles.mono}>vetrivel-mobile</Text>, run{" "}
          <Text style={styles.mono}>npx expo run:android</Text> (or{" "}
          <Text style={styles.mono}>npm run android</Text>) to install a development build on
          this emulator, then open that app and sign in. In Google Cloud Console, create an
          Android OAuth client for package <Text style={styles.mono}>com.optaimyze.vetrivel</Text>{" "}
          with your debug keystore SHA-1, and set{" "}
          <Text style={styles.mono}>EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID</Text> to that client ID.
        </Text>
      ) : null}

      {!isExpoGo && Platform.OS === "android" ? (
        <Text style={styles.androidHint}>
          If Google shows 'Custom URI scheme is not enabled': Google Cloud Console → APIs &
          Services → Credentials → open your{" "}
          <Text style={styles.mono}>Android</Text> OAuth client (the one matching{" "}
          <Text style={styles.mono}>EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID</Text>) → Advanced →
          enable <Text style={styles.em}>Custom URI scheme</Text> → Save. Wait a minute, then
          retry.
        </Text>
      ) : null}

      <Pressable
        style={[
          styles.button,
          (!request || loading || isExpoGo) && styles.buttonDisabled,
        ]}
        disabled={!request || loading || isExpoGo}
        onPress={() => promptAsync()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue with Google</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    color: "#444",
    textAlign: "center",
    marginBottom: 8,
  },
  button: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 10,
    backgroundColor: "#D13B3B",
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    marginTop: 8,
    color: "#B00020",
    textAlign: "center",
  },
  expoGoWarning: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5c4033",
    textAlign: "left",
    maxWidth: 360,
    marginBottom: 4,
    padding: 12,
    backgroundColor: "#fff3cd",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ffc107",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 12,
  },
  androidHint: {
    fontSize: 12,
    lineHeight: 17,
    color: "#444",
    textAlign: "center",
    maxWidth: 360,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  em: {
    fontWeight: "700",
  },
});
