import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
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
import { getLocations, getUnscopedPlaces, getApiErrorMessage } from "../api";
import { SpaceMap, type MapMarker } from "../components/SpaceMap";
import { AddTempleModal } from "../components/AddTempleModal";
import type { MobileAuthSession } from "../auth";
import type { LatLng } from "../lib/geo";
import type { RootStackParamList } from "../navigation/types";
import { useTheme } from "../contexts/ThemeContext";

type NavProps = NativeStackScreenProps<RootStackParamList, "Home">;

type Props = NavProps & {
  session: MobileAuthSession;
  onLogout: () => Promise<void> | void;
};

/** Rough center of India when we have no GPS and no saved spaces yet. */
const FALLBACK_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 };

export function HomeScreen({ navigation, session, onLogout }: Props) {
  const { colors } = useTheme();
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [unscopedCount, setUnscopedCount] = useState(0);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddTempleOpen, setIsAddTempleOpen] = useState(false);

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
        setError(getApiErrorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session.accessToken]
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load])
  );

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

  /**
   * Prefer saved spaces over raw GPS for the map center. Emulator (and some devices) report a
   * default US fix (e.g. Mountain View) while the user’s spaces are elsewhere — centering on GPS
   * first made the home map jump to the USA after creating a space.
   */
  const mapCenter = useMemo(() => {
    if (locations.length > 0) return locations[0].coordinates;
    if (userPos) return userPos;
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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.email, { color: colors.textMuted }]}>{session.user.email}</Text>
          {locationPermission === false ? (
            <Text style={[styles.hint, { color: colors.warning }]}>
              Location off — map centers on your first saved space. Enable location in Settings for
              “near you”.
            </Text>
          ) : null}
          {unscopedCount > 0 ? (
            <Text style={[styles.hint, { color: colors.warning }]}>
              {unscopedCount} place{unscopedCount === 1 ? "" : "s"} not linked to a space (manage on
              the web dashboard).
            </Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.addSpaceButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate("CreateSpace")}
          >
            <Text style={[styles.addSpaceText, { color: colors.background }]}>Add space</Text>
          </Pressable>
        </View>
      </View>

      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      <FlatList
        data={locations}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.mapCaption, { color: colors.text }]}>Your spaces & location</Text>
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>My spaces ({locations.length})</Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          locations.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No saved spaces yet. Tap “Add space” above to create one here, or add spaces on the web
            dashboard and pull to refresh.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card, 
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && styles.cardPressed
            ]}
            onPress={() => openNest(item)}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
            {item.address ? <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.address}</Text> : null}
            <Text style={[styles.cardChevron, { color: colors.primary }]}>Open map & temples →</Text>
          </Pressable>
        )}
      />
      
      {/* Floating Action Button (FAB) */}
      <Pressable 
        style={({ pressed }) => [
          styles.fab, 
          { backgroundColor: colors.primary },
          pressed && styles.fabPressed
        ]}
        onPress={() => setIsAddTempleOpen(true)}
      >
        <Text style={[styles.fabText, { color: colors.background }]}>+ Add Temple</Text>
      </Pressable>

      <AddTempleModal
        visible={isAddTempleOpen}
        onClose={() => setIsAddTempleOpen(false)}
        accessToken={session.accessToken}
        onTempleAdded={() => load(true)}
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
    paddingHorizontal: 16,
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  friendsButton: {
    borderWidth: 1,
    borderColor: "#D13B3B",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  friendsText: { fontWeight: "600", fontSize: 13, color: "#D13B3B" },
  divyaDesamButton: {
    borderWidth: 1,
    borderColor: "#0D9488",
    backgroundColor: "rgba(13,148,136,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  divyaDesamText: { fontWeight: "600", fontSize: 13, color: "#0D9488" },
  addSpaceButton: {
    backgroundColor: "#D13B3B",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addSpaceText: { fontWeight: "600", fontSize: 13, color: "#fff" },
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
    marginHorizontal: 16,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
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
    padding: 20,
    backgroundColor: "#FFF",
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  cardPressed: { backgroundColor: "#fafafa", transform: [{ scale: 0.98 }] },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 6 },
  cardMeta: { fontSize: 13, color: "#666", marginBottom: 12, lineHeight: 18 },
  cardChevron: {
    fontSize: 13,
    color: "#0D9488",
    fontWeight: "600",
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#0D9488",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  fabPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  fabText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
