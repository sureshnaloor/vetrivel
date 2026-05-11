import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  loginWithAppleIdentityToken,
  loginWithGoogleIdToken,
  type MobileAuthSession,
} from "../auth";

/** Expo Go uses `exp://…` redirects, which Google OAuth rejects; use a dev build (`expo run:android`). */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

declare const process: {
  env: Record<string, string | undefined>;
};

WebBrowser.maybeCompleteAuthSession();

type AuthMode = "signin" | "signup";

type Props = {
  onLoggedIn: (session: MobileAuthSession) => void;
};

export function LoginScreen({ onLoggedIn }: Props) {
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

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

  const onApplePress = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        setError("Apple sign-in did not return an identity token.");
        return;
      }
      const session = await loginWithAppleIdentityToken(credential.identityToken, {
        givenName: credential.fullName?.givenName ?? undefined,
        familyName: credential.fullName?.familyName ?? undefined,
      });
      onLoggedIn(session);
    } catch (e: unknown) {
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code?: string }).code)
          : "";
      if (code === "ERR_REQUEST_CANCELED" || code === "ERR_CANCELED") {
        return;
      }
      const base =
        e instanceof Error ? e.message : "Apple sign-in failed. Please retry.";
      const looksLikeAppleSystemFailure =
        /unknown reason|couldn\u2019t be completed|couldn't be completed|authorizationerror|error 1000/i.test(
          base
        ) || code === "ERR_REQUEST_FAILED";
      setError(
        looksLikeAppleSystemFailure
          ? `${base}\n\nIf you are using the iOS Simulator: Sign in with Apple often fails here (AuthKit errors like 1000 / -7022) even when the app is set up correctly. Open the Simulator’s Settings → Apple ID, sign in to iCloud, then retry — or test on a physical iPhone with: npx expo run:ios --device`
          : base
      );
    } finally {
      setLoading(false);
    }
  }, [onLoggedIn]);

  const googleDisabled = !request || loading || isExpoGo;
  const appleDisabled = loading || !appleAvailable || isExpoGo;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vetrivel Mobile</Text>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, authMode === "signin" && styles.modeChipActive]}
          onPress={() => {
            setAuthMode("signin");
            setError(null);
          }}
        >
          <Text style={[styles.modeChipText, authMode === "signin" && styles.modeChipTextActive]}>
            Sign in
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, authMode === "signup" && styles.modeChipActive]}
          onPress={() => {
            setAuthMode("signup");
            setError(null);
          }}
        >
          <Text style={[styles.modeChipText, authMode === "signup" && styles.modeChipTextActive]}>
            Sign up
          </Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        {authMode === "signin"
          ? Platform.OS === "ios"
            ? "Sign in with Apple or Google to open your saved spaces and nests."
            : "Sign in with Google to open your saved spaces and nests."
          : Platform.OS === "ios"
            ? "Create your account with Apple or Google — we set up your profile the first time you continue."
            : "Create your account with Google — we set up your profile the first time you continue."}
      </Text>

      {isExpoGo ? (
        <Text style={styles.expoGoWarning}>
          Google and Apple sign-in need a development build (not Expo Go). From{" "}
          <Text style={styles.mono}>vetrivel-mobile</Text>, run{" "}
          <Text style={styles.mono}>npx expo run:ios</Text> or{" "}
          <Text style={styles.mono}>npx expo run:android</Text>, then sign in from that app.
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

      {!isExpoGo && Platform.OS === "ios" && appleAvailable ? (
        <View
          style={[styles.appleWrap, appleDisabled && styles.buttonDisabled]}
          pointerEvents={appleDisabled ? "none" : "auto"}
        >
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              authMode === "signup"
                ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={10}
            style={styles.appleButton}
            onPress={() => void onApplePress()}
          />
        </View>
      ) : null}

      <Pressable
        style={[styles.button, googleDisabled && styles.buttonDisabled]}
        disabled={googleDisabled}
        onPress={() => promptAsync()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {authMode === "signin" ? "Continue with Google" : "Sign up with Google"}
          </Text>
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
    lineHeight: 22,
  },
  modeRow: {
    flexDirection: "row",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 4,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  modeChipActive: {
    backgroundColor: "#D13B3B",
  },
  modeChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  modeChipTextActive: {
    color: "#fff",
  },
  appleWrap: {
    width: "100%",
    maxWidth: 320,
    height: 48,
  },
  appleButton: {
    width: "100%",
    height: 48,
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
    opacity: 0.55,
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
