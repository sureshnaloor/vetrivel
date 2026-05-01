// Merges app.json with Maps API keys from env (load vetrivel-mobile/.env via Expo).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require("./app.json");

/** Ensure Maps key is in process.env when prebuild runs (some shells skip Expo's .env injection). */
(function loadMapsKeyFromDotenv() {
  if (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) return;
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    if (k !== "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY") continue;
    let v = trimmed.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = v;
    break;
  }
})();

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins || []),
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Vetrivel shows your position on the map and uses it to suggest nearby temples.",
        },
      ],
    ],
    ios: {
      ...appJson.expo.ios,
      config: {
        ...(appJson.expo.ios?.config || {}),
        googleMapsApiKey: googleMapsApiKey,
      },
    },
    android: {
      ...appJson.expo.android,
      config: {
        ...(appJson.expo.android?.config || {}),
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  },
};
