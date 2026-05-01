import { useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";
import type { LatLng } from "../lib/geo";

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
  const region = useMemo(() => buildRegion(center), [center.lat, center.lng]);
  // iOS: use Apple MapKit (default) so base tiles always load. Google on iOS needs a valid
  // Maps SDK for iOS key at *native prebuild* time; a bad/missing key yields a gray map + logo.
  // Android: Google Maps (set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY and rebuild).
  const provider = Platform.OS === "android" ? PROVIDER_GOOGLE : undefined;

  useEffect(() => {
    mapRef.current?.animateToRegion(buildRegion(center), 350);
  }, [center.lat, center.lng]);

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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    marginBottom: 12,
    overflow: Platform.OS === "android" ? "visible" : "hidden",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Platform.OS === "ios" ? 12 : 0,
  },
});
