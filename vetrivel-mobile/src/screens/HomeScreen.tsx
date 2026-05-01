import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { UserLocation } from "../api";
import { getLocations, getUnscopedPlaces } from "../api";
import { SpaceMap, type MapMarker } from "../components/SpaceMap";
import type { MobileAuthSession } from "../auth";
import type { LatLng } from "../lib/geo";
import type { RootStackParamList } from "../navigation/types";

type NavProps = NativeStackScreenProps<RootStackParamList, "Home">;

type Props = NavProps & {
  session: MobileAuthSession;
  onLogout: () => Promise<void> | void;
};

/** Rough center of India when we have no GPS and no saved spaces yet. */
const FALLBACK_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 };

export function HomeScreen({ navigation, session, onLogout }: Props) {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [unscopedCount, setUnscopedCount] = useState(0);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        setError(null);
        const [locList, unscoped] = await Promise.all([
          getLocations(session.accessToken),
          getUnscopedPlaces(session.accessToken),
        ]);
        setLocations(locList);
        setUnscopedCount(unscoped.length);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load spaces");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session.accessToken]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");
      if (status !== "granted") return;
      try {
        const pos = await Location.getCurrentPositionAsync({});
        setUserPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      } catch {
        setUserPos(null);
      }
    })();
  }, []);

  const mapCenter = useMemo(() => {
    if (userPos) return userPos;
    if (locations.length > 0) return locations[0].coordinates;
    return FALLBACK_CENTER;
  }, [userPos, locations]);

  const mapMarkers = useMemo((): MapMarker[] => {
    return locations.map((loc) => ({
      id: loc._id,
      latitude: loc.coordinates.lat,
      longitude: loc.coordinates.lng,
      title: loc.name,
      description: loc.address,
      pinColor: "green",
    }));
  }, [locations]);

  const openNest = useCallback(
    (loc: UserLocation) => {
      navigation.navigate("NestDetail", {
        locationId: loc._id,
        name: loc.name,
        latitude: loc.coordinates.lat,
        longitude: loc.coordinates.lng,
        address: loc.address,
      });
    },
    [navigation]
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.email}>{session.user.email}</Text>
          {locationPermission === false ? (
            <Text style={styles.hint}>
              Location off — map centers on your first saved space. Enable location in Settings for
              “near you”.
            </Text>
          ) : null}
          {unscopedCount > 0 ? (
            <Text style={styles.hint}>
              {unscopedCount} place{unscopedCount === 1 ? "" : "s"} not linked to a space (manage on
              the web dashboard).
            </Text>
          ) : null}
        </View>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={locations}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.mapCaption}>Your spaces & location</Text>
            <SpaceMap
              height={220}
              center={mapCenter}
              markers={mapMarkers}
              showsUserLocation={Boolean(userPos && locationPermission)}
              onMarkerPress={(id) => {
                const loc = locations.find((l) => l._id === id);
                if (loc) openNest(loc);
              }}
            />
            <Text style={styles.sectionTitle}>My spaces ({locations.length})</Text>
          </View>
        }
        contentContainerStyle={locations.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No saved spaces yet. Create a space in the web app, then pull to refresh.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => openNest(item)}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            {item.address ? <Text style={styles.cardMeta}>{item.address}</Text> : null}
            <Text style={styles.cardChevron}>Open map & temples →</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  headerText: { flex: 1 },
  email: { fontSize: 12, color: "#666" },
  hint: {
    fontSize: 11,
    color: "#8a6d3b",
    marginTop: 6,
    lineHeight: 16,
  },
  logoutButton: {
    backgroundColor: "#efefef",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { fontWeight: "600", fontSize: 13 },
  error: {
    color: "#b00020",
    marginBottom: 8,
  },
  listHeader: { marginBottom: 8 },
  mapCaption: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8, marginTop: 4 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  cardPressed: { opacity: 0.85, backgroundColor: "#fafafa" },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardMeta: { fontSize: 12, color: "#666", marginTop: 4 },
  cardChevron: {
    fontSize: 12,
    color: "#D13B3B",
    marginTop: 8,
    fontWeight: "600",
  },
});
