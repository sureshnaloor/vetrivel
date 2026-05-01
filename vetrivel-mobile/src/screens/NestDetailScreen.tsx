import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NearbyTemple, UserPlace } from "../api";
import { createPlace, getPlacesForLocation, searchNearbyTemples } from "../api";
import { SpaceMap } from "../components/SpaceMap";
import type { RootStackParamList } from "../navigation/types";

type NavProps = NativeStackScreenProps<RootStackParamList, "NestDetail">;

type Props = NavProps & {
  accessToken: string;
};

function PlaceCard({ place }: { place: UserPlace }) {
  return (
    <View style={styles.placeCard}>
      <Text style={styles.placeName}>{place.name}</Text>
      <Text style={styles.placeMeta}>
        {place.status || "—"}
        {place.placeId ? " · Google place" : ""}
      </Text>
    </View>
  );
}

function Section({
  title,
  subtitle,
  places,
  emptyLabel,
}: {
  title: string;
  subtitle?: string;
  places: UserPlace[];
  emptyLabel: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {places.length === 0 ? (
        <Text style={styles.sectionEmpty}>{emptyLabel}</Text>
      ) : (
        places.map((p) => <PlaceCard key={p._id} place={p} />)
      )}
    </View>
  );
}

export function NestDetailScreen({ route, accessToken }: Props) {
  const { locationId, address, latitude, longitude } = route.params;
  const nestCenter = useMemo(
    () => ({ lat: latitude, lng: longitude }),
    [latitude, longitude]
  );

  const [places, setPlaces] = useState<UserPlace[]>([]);
  const [nearby, setNearby] = useState<NearbyTemple[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [savingPlaceId, setSavingPlaceId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState<"nest" | "interest">("interest");

  const loadPlaces = useCallback(
    async (opts?: { refresh?: boolean; silent?: boolean }) => {
      const asRefresh = opts?.refresh ?? false;
      const silent = opts?.silent ?? false;
      if (asRefresh) setRefreshing(true);
      else if (!silent) setLoading(true);
      try {
        setError(null);
        const list = await getPlacesForLocation(accessToken, locationId);
        setPlaces(list);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load temples");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, locationId]
  );

  const loadNearby = useCallback(
    async (keyword?: string) => {
      setNearbyLoading(true);
      setNearbyError(null);
      try {
        const list = await searchNearbyTemples(accessToken, {
          lat: nestCenter.lat,
          lng: nestCenter.lng,
          keyword: keyword?.trim() || undefined,
        });
        setNearby(
          list.filter(
            (t) =>
              t.placeId &&
              Number.isFinite(t.lat) &&
              Number.isFinite(t.lng) &&
              t.lat !== 0 &&
              t.lng !== 0
          )
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Nearby search failed";
        setNearbyError(msg);
        setNearby([]);
      } finally {
        setNearbyLoading(false);
      }
    },
    [accessToken, nestCenter.lat, nestCenter.lng]
  );

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  useEffect(() => {
    loadNearby();
  }, [loadNearby]);

  const { nestTemples, interestTemples, pins } = useMemo(() => {
    const nestTemples = places.filter((p) => p.category === "nest");
    const interestTemples = places.filter((p) => p.category === "interest");
    const pins = places.filter((p) => p.category === "pin");
    return { nestTemples, interestTemples, pins };
  }, [places]);

  const savedPlaceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of places) {
      if (p.placeId) ids.add(p.placeId);
    }
    return ids;
  }, [places]);

  const mapMarkers = useMemo(() => {
    const saved = places.map((p) => ({
      id: `saved-${p._id}`,
      latitude: p.coordinates.lat,
      longitude: p.coordinates.lng,
      title: p.name,
      description: p.category,
      pinColor:
        p.category === "nest"
          ? ("green" as const)
          : p.category === "interest"
            ? ("purple" as const)
            : ("red" as const),
    }));
    const near = nearby
      .filter((t) => !savedPlaceIds.has(t.placeId))
      .map((t) => ({
        id: `near-${t.placeId}`,
        latitude: t.lat,
        longitude: t.lng,
        title: t.name,
        description: t.vicinity,
        pinColor: "red" as const,
      }));
    return [...saved, ...near];
  }, [places, nearby, savedPlaceIds]);

  const addNearby = useCallback(
    async (t: NearbyTemple, category: "nest" | "interest") => {
      if (!t.placeId) return;
      setSavingPlaceId(t.placeId);
      try {
        await createPlace(accessToken, {
          name: t.name,
          coordinates: { lat: t.lat, lng: t.lng },
          category,
          status: "planned",
          placeId: t.placeId,
          locationId,
        });
        await loadPlaces({ silent: true });
        Alert.alert("Saved", `“${t.name}” added to this space.`);
      } catch (e: unknown) {
        Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
      } finally {
        setSavingPlaceId(null);
      }
    },
    [accessToken, locationId, loadPlaces]
  );

  const submitManual = useCallback(async () => {
    const name = manualName.trim();
    if (!name) {
      Alert.alert("Name required", "Enter a temple name.");
      return;
    }
    setSavingPlaceId("__manual__");
    try {
      await createPlace(accessToken, {
        name,
        coordinates: { lat: nestCenter.lat, lng: nestCenter.lng },
        category: manualCategory,
        status: "planned",
        locationId,
      });
      setManualOpen(false);
      setManualName("");
      await loadPlaces({ silent: true });
      Alert.alert("Saved", `“${name}” added at this space center (adjust on the web if needed).`);
    } catch (e: unknown) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSavingPlaceId(null);
    }
  }, [manualName, manualCategory, accessToken, locationId, nestCenter, loadPlaces]);

  const runSearch = useCallback(() => {
    loadNearby(searchInput);
  }, [loadNearby, searchInput]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              await loadPlaces({ refresh: true });
              await loadNearby(searchInput);
            }}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {address ? (
          <Text style={styles.spaceAddress} numberOfLines={2}>
            {address}
          </Text>
        ) : null}

        <SpaceMap
          height={240}
          center={nestCenter}
          markers={mapMarkers}
          showsUserLocation={false}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Section
          title="Nest temples"
          subtitle="Anchor temples for this space"
          places={nestTemples}
          emptyLabel="No nest temples yet — add from Nearby below or create manually."
        />

        <Section
          title="Temples of interest"
          places={interestTemples}
          emptyLabel="No temples of interest yet."
        />

        {pins.length > 0 ? (
          <Section
            title="Explorer pins"
            subtitle="Pins linked to this space"
            places={pins}
            emptyLabel=""
          />
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby (Google)</Text>
          <Text style={styles.sectionSubtitle}>
            Hindu temples within ~50 km of this space, like the web dashboard.
          </Text>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name…"
              placeholderTextColor="#999"
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmitEditing={runSearch}
              returnKeyType="search"
            />
            <Pressable style={styles.searchButton} onPress={runSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>

          {nearbyLoading ? (
            <ActivityIndicator style={{ marginVertical: 12 }} />
          ) : null}
          {nearbyError ? <Text style={styles.error}>{nearbyError}</Text> : null}

          {!nearbyLoading && nearby.length === 0 && !nearbyError ? (
            <Text style={styles.sectionEmpty}>No temples found. Try another search.</Text>
          ) : null}

          {nearby.map((t) => {
            const saved = savedPlaceIds.has(t.placeId);
            const busy = savingPlaceId === t.placeId;
            return (
              <View key={t.placeId} style={styles.nearbyCard}>
                <Text style={styles.placeName}>{t.name}</Text>
                {t.vicinity ? (
                  <Text style={styles.placeMeta} numberOfLines={2}>
                    {t.vicinity}
                  </Text>
                ) : null}
                <Text style={styles.placeMeta}>
                  {t.rating != null ? `★ ${t.rating}` : "No rating"}
                  {t.userRatingsTotal != null ? ` (${t.userRatingsTotal})` : ""}
                </Text>
                {saved ? (
                  <Text style={styles.savedBadge}>Already in this space</Text>
                ) : (
                  <View style={styles.addRow}>
                    <Pressable
                      style={[styles.addBtn, busy && styles.addBtnDisabled]}
                      disabled={busy}
                      onPress={() => addNearby(t, "nest")}
                    >
                      <Text style={styles.addBtnText}>Add as nest</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.addBtnSecondary, busy && styles.addBtnDisabled]}
                      disabled={busy}
                      onPress={() => addNearby(t, "interest")}
                    >
                      <Text style={styles.addBtnSecondaryText}>Add as interest</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Pressable style={styles.manualBtn} onPress={() => setManualOpen(true)}>
          <Text style={styles.manualBtnText}>Add temple by name (this location)</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={manualOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Manual temple</Text>
            <Text style={styles.modalHint}>
              Saves at the center of this space ({nestCenter.lat.toFixed(4)},{" "}
              {nestCenter.lng.toFixed(4)}). Refine on the web if needed.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Temple name"
              placeholderTextColor="#999"
              value={manualName}
              onChangeText={setManualName}
            />
            <View style={styles.segment}>
              <Pressable
                style={[
                  styles.segmentBtn,
                  manualCategory === "nest" && styles.segmentBtnActive,
                ]}
                onPress={() => setManualCategory("nest")}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    manualCategory === "nest" && styles.segmentBtnTextActive,
                  ]}
                >
                  Nest
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentBtn,
                  manualCategory === "interest" && styles.segmentBtnActive,
                ]}
                onPress={() => setManualCategory("interest")}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    manualCategory === "interest" && styles.segmentBtnTextActive,
                  ]}
                >
                  Interest
                </Text>
              </Pressable>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => {
                  setManualOpen(false);
                  setManualName("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalSave,
                  savingPlaceId === "__manual__" && styles.addBtnDisabled,
                ]}
                disabled={savingPlaceId === "__manual__"}
                onPress={submitManual}
              >
                {savingPlaceId === "__manual__" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  spaceAddress: {
    fontSize: 14,
    color: "#555",
    marginBottom: 12,
    lineHeight: 20,
  },
  error: {
    color: "#b00020",
    marginBottom: 12,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
  sectionEmpty: {
    fontSize: 13,
    color: "#888",
    fontStyle: "italic",
  },
  placeCard: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    backgroundColor: "#fff",
  },
  placeName: { fontSize: 15, fontWeight: "600" },
  placeMeta: { fontSize: 12, color: "#666", marginTop: 4 },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "center" },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  searchButton: {
    backgroundColor: "#D13B3B",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
  },
  searchButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  nearbyCard: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    backgroundColor: "#fff",
  },
  savedBadge: {
    marginTop: 10,
    fontSize: 12,
    color: "#0D9488",
    fontWeight: "600",
  },
  addRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  addBtn: {
    flex: 1,
    backgroundColor: "#0D9488",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  addBtnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D13B3B",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  addBtnDisabled: { opacity: 0.55 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  addBtnSecondaryText: { color: "#D13B3B", fontWeight: "700", fontSize: 13 },
  manualBtn: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  manualBtnText: { fontSize: 14, fontWeight: "600", color: "#333" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  modalHint: { fontSize: 12, color: "#666", marginBottom: 12, lineHeight: 18 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  segment: { flexDirection: "row", gap: 8, marginBottom: 16 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#D13B3B",
    borderColor: "#D13B3B",
  },
  segmentBtnText: { fontWeight: "600", color: "#333" },
  segmentBtnTextActive: { color: "#fff" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 12 },
  modalCancelText: { fontSize: 16, color: "#666" },
  modalSave: {
    backgroundColor: "#D13B3B",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
  },
  modalSaveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
