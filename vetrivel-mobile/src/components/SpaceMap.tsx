import Constants from "expo-constants";
import { useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";
import type { LatLng } from "../lib/geo";

const MAP_LOG_PREFIX = "[Vetrivel:SpaceMap]";

/** Logs to Metro / adb logcat (use `adb logcat *:S ReactNative:V ReactNativeJS:V`). */
function logMapDiag(message: string, extra?: Record<string, unknown>) {
  if (extra) {
    console.warn(`${MAP_LOG_PREFIX} ${message}`, extra);
  } else {
    console.warn(`${MAP_LOG_PREFIX} ${message}`);
  }
}

/** iOS supports red | green | purple; Android may accept other hues. */
export type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  pinColor?: "red" | "green" | "purple";
};

type Props = {
  /** Map container height */
  height: number;
  /** Primary center (nest / GPS) */
  center: LatLng;
  /** Saved or nearby pins */
  markers: MapMarker[];
  /** Optional blue dot via showsUserLocation */
  showsUserLocation?: boolean;
  /** Called when a marker is pressed (not user location) */
  onMarkerPress?: (id: string) => void;
};

const DEFAULT_DELTA = 0.12;

function buildRegion(center: LatLng, delta = DEFAULT_DELTA): Region {
  return {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export function SpaceMap({
  height,
  center,
  markers,
  showsUserLocation = false,
  onMarkerPress,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const mapReadyRef = useRef(false);
  const region = useMemo(() => buildRegion(center), [center.lat, center.lng]);
  // iOS: use Apple MapKit (default) so base tiles always load. Google on iOS needs a valid
  // Maps SDK for iOS key at *native prebuild* time; a bad/missing key yields a gray map + logo.
  // Android: Google Maps — key is baked in at prebuild (`android.config.googleMaps.apiKey`).
  const provider = Platform.OS === "android" ? PROVIDER_GOOGLE : undefined;

  useEffect(() => {
    mapRef.current?.animateToRegion(buildRegion(center), 350);
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const expoCfg = Constants.expoConfig;
    const manifestKey = expoCfg?.android?.config?.googleMaps?.apiKey;
    const expoConfigKeyLen = typeof manifestKey === "string" ? manifestKey.length : 0;
    /** Inlined at bundle time; native key still comes from AndroidManifest (prebuild). */
    const publicEnvKey =
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ||
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    const envKeyLen = typeof publicEnvKey === "string" ? publicEnvKey.length : 0;
    logMapDiag("Android MapView mounted", {
      markerCount: markers.length,
      center,
      newArchEnabled: expoCfg?.newArchEnabled,
      /** Often 0 at runtime: Expo may omit Maps key from JS-visible expoConfig even when manifest has it. */
      expoConfigGoogleMapsKeyLength: expoConfigKeyLen,
      /** Non-zero means Metro saw a public env var; tiles still depend on manifest + GCP restrictions. */
      bundledPublicMapsKeyLength: envKeyLen,
    });
    const slowTimer = setTimeout(() => {
      if (!mapReadyRef.current) {
        logMapDiag(
          "onMapReady did not fire within 6s — tiles/markers often stay blank. Check: (1) Logcat for `Google Android Maps API` / `Authorization failure`; (2) Maps SDK for Android enabled; (3) package com.optaimyze.vetrivel + correct SHA-1 (EAS upload cert vs Play App Signing); (4) Expo SDK 54 + react-native-maps + New Architecture is a known blank-map case — set newArchEnabled: false and rebuild native.",
          { markerCount: markers.length }
        );
      }
    }, 6000);
    return () => clearTimeout(slowTimer);
    // Intentionally once per mount — same MapView instance; avoids resetting the watchdog when markers update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={provider}
        initialRegion={region}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        rotateEnabled={false}
        pitchEnabled={false}
        loadingEnabled={Platform.OS === "android"}
        poiClickEnabled={Platform.OS === "android" ? false : undefined}
        onMapReady={() => {
          mapReadyRef.current = true;
          if (Platform.OS === "android") {
            logMapDiag("onMapReady — native map surface initialized", {
              markerCount: markers.length,
            });
          }
        }}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.title}
            description={m.description}
            pinColor={m.pinColor}
            tracksViewChanges={false}
            onPress={() => onMarkerPress?.(m.id)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Android: overflow:hidden + borderRadius on the map parent often yields a blank MapView (tiles + markers).
  // iOS can safely clip for rounded corners.
  wrap: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    backgroundColor: "#fff",
    marginBottom: 12,
    overflow: Platform.OS === "android" ? "visible" : "hidden",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Platform.OS === "ios" ? 16 : 0,
  },
});
