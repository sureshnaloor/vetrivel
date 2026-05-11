import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { Accuracy } from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import type { Region } from "react-native-maps";
import { createLocation, getApiErrorMessage } from "../api";
import type { LatLng } from "../lib/geo";
import type { RootStackParamList } from "../navigation/types";

const FALLBACK_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 };
const MAP_DELTA = 0.08;

function buildRegion(center: LatLng): Region {
  return {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: MAP_DELTA,
    longitudeDelta: MAP_DELTA,
  };
}

function coordFromMapEvent(
  e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }
): LatLng {
  const { latitude, longitude } = e.nativeEvent.coordinate;
  return { lat: latitude, lng: longitude };
}

type NavProps = NativeStackScreenProps<RootStackParamList, "CreateSpace">;

type Props = NavProps & {
  accessToken: string;
};

/** Google Maps on Android often ignores the first `animateToRegion`; `animateCamera` is reliable. */
const ANDROID_CAMERA_ZOOM = 15;

function runAndroidCameraMove(map: MapView, c: LatLng) {
  const camera = {
    center: { latitude: c.lat, longitude: c.lng },
    heading: 0,
    pitch: 0,
    zoom: ANDROID_CAMERA_ZOOM,
  };
  const apply = () => {
    map.animateCamera(camera, { duration: 500 });
  };
  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 160);
}

export function CreateSpaceScreen({ navigation, accessToken }: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [pinned, setPinned] = useState<LatLng | null>(null);
  const [saving, setSaving] = useState(false);

  const pinnedRef = useRef<LatLng | null>(null);
  pinnedRef.current = pinned;

  const mapRef = useRef<MapView>(null);
  const mapReadyRef = useRef(false);
  /** Latest map center (updated on every region settle) — used for “Pin map center”. */
  const lastRegionCenterRef = useRef<LatLng>(FALLBACK_CENTER);
  /** GPS / fallback target once location bootstrap finishes. */
  const bootTargetRef = useRef<LatLng>(FALLBACK_CENTER);

  const flyTo = useCallback((c: LatLng) => {
    lastRegionCenterRef.current = c;
    const m = mapRef.current;
    if (!m) return;
    if (Platform.OS === "android") {
      runAndroidCameraMove(m, c);
    } else {
      m.animateToRegion(buildRegion(c), 450);
    }
  }, []);

  const applyPin = useCallback((c: LatLng) => {
    Keyboard.dismiss();
    setPinned(c);
  }, []);

  const onMapPress = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      applyPin(coordFromMapEvent(e));
    },
    [applyPin]
  );

  const onMapLongPress = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      applyPin(coordFromMapEvent(e));
    },
    [applyPin]
  );

  const onMarkerDragEnd = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      setPinned(coordFromMapEvent(e));
    },
    []
  );

  const onRegionChangeComplete = useCallback(
    (region: Region, details?: { isGesture?: boolean }) => {
      lastRegionCenterRef.current = {
        lat: region.latitude,
        lng: region.longitude,
      };
      if (Platform.OS === "android" && details?.isGesture) {
        Keyboard.dismiss();
      }
    },
    []
  );

  const onPanDrag = useCallback(() => {
    if (Platform.OS === "android") {
      Keyboard.dismiss();
    }
  }, []);

  const pinMapCenter = useCallback(() => {
    Keyboard.dismiss();
    applyPin({ ...lastRegionCenterRef.current });
  }, [applyPin]);

  const syncMapToBootTarget = useCallback(() => {
    if (!mapReadyRef.current) return;
    if (pinnedRef.current) return;
    const target = bootTargetRef.current;
    if (Platform.OS === "android") {
      requestAnimationFrame(() => flyTo(target));
    } else {
      flyTo(target);
    }
  }, [flyTo]);

  /** One-shot bootstrap: do not re-run when callback identities change (avoids flying back to GPS default over a user-chosen map). */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      let target = FALLBACK_CENTER;
      if (status === "granted") {
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Accuracy.Balanced,
          });
          target = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {
          /* keep fallback */
        }
      }
      bootTargetRef.current = target;
      lastRegionCenterRef.current = target;
      syncMapToBootTarget();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: bootstrap once per screen mount
  }, []);

  const goToMyLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Location needed",
        "Allow location access in Settings to jump the map to where you are."
      );
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Accuracy.Balanced,
      });
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      bootTargetRef.current = c;
      flyTo(c);
      if (Platform.OS === "android") {
        setTimeout(() => applyPin(c), 100);
      } else {
        applyPin(c);
      }
    } catch {
      Alert.alert(
        "Could not read GPS",
        "Try again outdoors, use Pin map center, or tap the map."
      );
    }
  }, [applyPin, flyTo]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Enter a name for this space.");
      return;
    }
    if (!pinned) {
      Alert.alert(
        "Choose a location",
        "Tap the map, long-press, use Pin map center, or Use my location."
      );
      return;
    }

    Keyboard.dismiss();
    setSaving(true);
    try {
      await createLocation(accessToken, {
        name: trimmed,
        coordinates: pinned,
        address: address.trim() || undefined,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Could not create space", getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const provider = Platform.OS === "android" ? PROVIDER_GOOGLE : undefined;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.flex} collapsable={false}>
        <View style={styles.mapShell} collapsable={false}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={provider}
            initialRegion={buildRegion(FALLBACK_CENTER)}
            rotateEnabled={false}
            pitchEnabled={false}
            /** Avoid blue-dot / accuracy ring glitches while picking a precise pin. */
            showsUserLocation={false}
            showsMyLocationButton={false}
            loadingEnabled={false}
            moveOnMarkerPress={Platform.OS === "android" ? false : undefined}
            poiClickEnabled={Platform.OS === "android" ? false : undefined}
            onMapReady={() => {
              mapReadyRef.current = true;
              if (!pinnedRef.current) {
                syncMapToBootTarget();
              }
            }}
            onPress={onMapPress}
            onLongPress={onMapLongPress}
            onRegionChangeComplete={onRegionChangeComplete}
            onPanDrag={onPanDrag}
          >
            {pinned ? (
              <Marker
                coordinate={{ latitude: pinned.lat, longitude: pinned.lng }}
                draggable
                onDragEnd={onMarkerDragEnd}
                pinColor="purple"
                title="Space location"
                description="Drag to adjust"
                tracksViewChanges={false}
              />
            ) : null}
          </MapView>

          {!pinned ? (
            <View style={styles.hintOverlay} pointerEvents="none">
              <Text style={styles.hintOverlayText}>
                Pan and zoom, then tap or long-press the map to drop your pin (Android: use Pin map
                center if taps do not register).
              </Text>
            </View>
          ) : null}
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "android" ? "on-drag" : "interactive"}
          contentContainerStyle={styles.formScroll}
        >
          <View style={styles.row}>
            <Pressable
              style={[styles.secondaryHalf, saving && styles.disabled]}
              onPress={pinMapCenter}
              disabled={saving}
            >
              <Text style={styles.secondaryText}>Pin map center</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryHalf, saving && styles.disabled]}
              onPress={() => void goToMyLocation()}
              disabled={saving}
            >
              <Text style={styles.secondaryText}>My location</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Space name (required)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Home, Chennai trip"
            value={name}
            onChangeText={setName}
            autoCorrect
            editable={!saving}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.label}>Address (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Street, city..."
            value={address}
            onChangeText={setAddress}
            multiline
            editable={!saving}
            blurOnSubmit
          />

          {pinned ? (
            <Text style={styles.meta}>
              Pin: {pinned.lat.toFixed(5)}, {pinned.lng.toFixed(5)}
            </Text>
          ) : (
            <Text style={styles.hint}>
              No pin yet — tap or long-press the map, or Pin map center / My location.
            </Text>
          )}

          <Pressable
            style={[
              styles.primary,
              (!name.trim() || !pinned || saving) && styles.disabled,
            ]}
            onPress={() => void submit()}
            disabled={!name.trim() || !pinned || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Create space</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mapShell: {
    flex: 1,
    minHeight: 280,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
    overflow: Platform.OS === "android" ? "visible" : "hidden",
    elevation: Platform.OS === "android" ? 2 : 0,
    zIndex: 1,
  },
  map: { ...StyleSheet.absoluteFillObject },
  hintOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  hintOverlayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    lineHeight: 17,
  },
  formScroll: { padding: 16, paddingBottom: 28 },
  row: { flexDirection: "row", gap: 10, marginBottom: 14 },
  secondaryHalf: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D13B3B",
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: { fontSize: 13, fontWeight: "600", color: "#D13B3B" },
  label: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  meta: { fontSize: 12, color: "#666", marginBottom: 10 },
  hint: {
    fontSize: 12,
    color: "#8a6d3b",
    marginBottom: 10,
    lineHeight: 17,
  },
  primary: {
    borderRadius: 10,
    backgroundColor: "#D13B3B",
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.55 },
});
