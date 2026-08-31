import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { NearbyTemple, UserPlace, LeaderboardRank } from "../api";
import {
  createPlace,
  formatVisitDate,
  getLeaderboard,
  getPlacesForLocation,
  searchNearbyTemples,
  searchTemplesWithin1Km,
  searchTemplesWithin5Km,
} from "../api";
import {
  TempleDetailModal,
  type TempleDetailSelection,
} from "../components/TempleDetailModal";
import { VisitLogModal } from "../components/VisitLogModal";
import { SpaceMap } from "../components/SpaceMap";
import type { RootStackParamList } from "../navigation/types";

type NavProps = NativeStackScreenProps<RootStackParamList, "NestDetail">;

type NearbySearchMode = "space" | "1km" | "5km";

type Props = NavProps & {
  accessToken: string;
  userEmail: string;
};

function userPlaceToDetail(
  p: UserPlace,
  visitOwnerLabel?: string
): TempleDetailSelection {
  return {
    placeId: p.placeId || null,
    name: p.name,
    lat: p.coordinates.lat,
    lng: p.coordinates.lng,
    userPlaceId: p._id,
    status: p.status,
    lastVisitDate: p.lastVisitDate,
    visitOwnerLabel,
  };
}

function nearbyToDetail(t: NearbyTemple): TempleDetailSelection {
  return {
    placeId: t.placeId || null,
    name: t.name,
    lat: t.lat,
    lng: t.lng,
    vicinity: t.vicinity,
    rating: t.rating,
    userRatingsTotal: t.userRatingsTotal,
  };
}

function getDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusM = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
}

function formatDistanceMeters(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function filterNearbyResults(list: NearbyTemple[]): NearbyTemple[] {
  return list.filter(
    (t) =>
      t.placeId &&
      Number.isFinite(t.lat) &&
      Number.isFinite(t.lng) &&
      t.lat !== 0 &&
      t.lng !== 0
  );
}

function PlaceCard({
  place,
  onOpenDetail,
  onLogVisit,
  highlighted,
}: {
  place: UserPlace;
  onOpenDetail?: () => void;
  onLogVisit?: () => void;
  highlighted?: boolean;
}) {
  const isVisited = place.status === "visited";
  const visitCtaLabel = place.hasVisitDetails ? "Previous visit" : "Log visit";
  return (
    <View
      style={[
        styles.placeCard,
        isVisited && styles.placeCardVisited,
        highlighted && styles.placeCardSelected,
      ]}
    >
      {isVisited ? (
        <View style={styles.visitedBadge}>
          <Text style={styles.visitedBadgeText}>✓ VISITED</Text>
        </View>
      ) : null}
      <Pressable onPress={onOpenDetail} disabled={!onOpenDetail}>
        <Text style={styles.placeName}>{place.name}</Text>
        <Text style={styles.placeMeta}>
          {!isVisited ? place.status || "—" : ""}
          {place.lastVisitDate
            ? `${isVisited ? "" : " · "}Last visit ${formatVisitDate(place.lastVisitDate)}`
            : ""}
          {onOpenDetail ? " · Tap for details" : ""}
        </Text>
      </Pressable>
      {onLogVisit ? (
        <Pressable onPress={onLogVisit} style={styles.logVisitBtn}>
          <Text style={styles.logVisitBtnText}>{visitCtaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Section({
  title,
  subtitle,
  places,
  emptyLabel,
  onOpenPlace,
  onLogVisit,
  selectedMarkerId,
}: {
  title: string;
  subtitle?: string;
  places: UserPlace[];
  emptyLabel: string;
  onOpenPlace?: (p: UserPlace) => void;
  onLogVisit?: (p: UserPlace) => void;
  selectedMarkerId?: string | null;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {places.length === 0 ? (
        <Text style={styles.sectionEmpty}>{emptyLabel}</Text>
      ) : (
        places.map((p) => (
          <PlaceCard
            key={p._id}
            place={p}
            onOpenDetail={
              onOpenPlace ? () => onOpenPlace(p) : undefined
            }
            onLogVisit={onLogVisit ? () => onLogVisit(p) : undefined}
            highlighted={
              selectedMarkerId === `saved-${p._id}`
            }
          />
        ))
      )}
    </View>
  );
}

export function NestDetailScreen({ route, accessToken, userEmail }: Props) {
  const { locationId, address, latitude, longitude, ownerName, isFriendNest } = route.params;
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
  const [nearbySearchMode, setNearbySearchMode] = useState<NearbySearchMode>("space");
  const [nearbySearchCenter, setNearbySearchCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [activeRadiusMeters, setActiveRadiusMeters] = useState(50_000);
  const [searchInput, setSearchInput] = useState("");
  const [savingPlaceId, setSavingPlaceId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState<"nest" | "interest">("interest");
  const [detailTemple, setDetailTemple] = useState<TempleDetailSelection | null>(
    null
  );
  const [visitLogTarget, setVisitLogTarget] = useState<{
    place: UserPlace;
    initialView: "log" | "history";
  } | null>(null);

  const openVisitLog = (place: UserPlace) => {
    setVisitLogTarget({
      place,
      initialView: place.hasVisitDetails ? "history" : "log",
    });
  };
  const [boardScope, setBoardScope] = useState<"overall" | "space">("space");
  const [boardRows, setBoardRows] = useState<LeaderboardRank[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const nearTemplePromptAttemptedRef = useRef(false);

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
    async (opts?: {
      keyword?: string;
      mode?: NearbySearchMode;
      center?: { lat: number; lng: number };
    }) => {
      const mode = opts?.mode ?? nearbySearchMode;
      const keyword = (opts?.keyword ?? searchInput).trim() || undefined;

      setNearbyLoading(true);
      setNearbyError(null);
      try {
        let center = opts?.center;

        if (mode === "1km" || mode === "5km") {
          if (!center) {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
              setNearbyError(
                "Location permission is required to search temples near you."
              );
              setNearby([]);
              return;
            }
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            center = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };
          }
        } else {
          center = nestCenter;
        }

        const response =
          mode === "1km"
            ? await searchTemplesWithin1Km(
                accessToken,
                center.lat,
                center.lng,
                keyword
              )
            : mode === "5km"
              ? await searchTemplesWithin5Km(
                  accessToken,
                  center.lat,
                  center.lng,
                  keyword
                )
              : await searchNearbyTemples(accessToken, {
                  lat: center.lat,
                  lng: center.lng,
                  keyword,
                });

        setNearbySearchMode(mode);
        setNearbySearchCenter(mode === "space" ? null : center);
        setActiveRadiusMeters(response.radiusMeters);
        setNearby(filterNearbyResults(response.results));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Nearby search failed";
        setNearbyError(msg);
        setNearby([]);
      } finally {
        setNearbyLoading(false);
      }
    },
    [accessToken, nearbySearchMode, nestCenter, searchInput]
  );

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const loadBoard = useCallback(async () => {
    setBoardLoading(true);
    try {
      const data = await getLeaderboard(
        accessToken,
        boardScope,
        boardScope === "space" ? locationId : undefined
      );
      setBoardRows(data.rankings);
    } catch {
      setBoardRows([]);
    } finally {
      setBoardLoading(false);
    }
  }, [accessToken, boardScope, locationId]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    void loadNearby({ mode: "space" });
    // Initial space-wide search only when this screen/space loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, locationId]);

  const { nestTemples, interestTemples } = useMemo(() => {
    const nestTemples = places.filter((p) => p.category === "nest");
    const interestTemples = places.filter((p) => p.category === "interest");
    return { nestTemples, interestTemples };
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
      if (isFriendNest) return;
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
    [accessToken, isFriendNest, locationId, loadPlaces]
  );

  useEffect(() => {
    if (loading || isFriendNest || nearTemplePromptAttemptedRef.current) return;
    nearTemplePromptAttemptedRef.current = true;

    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== "granted") return;

      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        const current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        const response = await searchTemplesWithin1Km(
          accessToken,
          current.lat,
          current.lng
        );
        if (cancelled) return;

        const candidate = response.results
          .filter((t) => t.placeId && !savedPlaceIds.has(t.placeId))
          .map((t) => ({
            temple: t,
            distanceMeters:
              t.distanceMeters ??
              getDistanceMeters(current, { lat: t.lat, lng: t.lng }),
          }))
          .sort((a, b) => a.distanceMeters - b.distanceMeters)[0];

        if (!candidate || candidate.distanceMeters > 500) return;

        Alert.alert(
          "Temple nearby",
          `You seem to be near "${candidate.temple.name}" (${Math.round(
            candidate.distanceMeters
          )} m away). Add it to this space?`,
          [
            { text: "Ignore", style: "cancel" },
            {
              text: "Add as interest",
              onPress: () => {
                void addNearby(candidate.temple, "interest");
              },
            },
            {
              text: "Add as nest",
              onPress: () => {
                void addNearby(candidate.temple, "nest");
              },
            },
          ]
        );
      } catch {
        /* best-effort prompt only */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, addNearby, isFriendNest, loading, savedPlaceIds]);

  const submitManual = useCallback(async () => {
    const name = manualName.trim();
    if (isFriendNest) return;
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
  }, [manualName, manualCategory, accessToken, isFriendNest, locationId, nestCenter, loadPlaces]);

  const runSearch = useCallback(() => {
    void loadNearby({ keyword: searchInput });
  }, [loadNearby, searchInput]);

  const searchNearMe1Km = useCallback(() => {
    void loadNearby({ mode: "1km" });
  }, [loadNearby]);

  const searchNearMe5Km = useCallback(() => {
    void loadNearby({ mode: "5km" });
  }, [loadNearby]);

  const searchThisSpace = useCallback(() => {
    void loadNearby({ mode: "space", keyword: searchInput });
  }, [loadNearby, searchInput]);

  const mapCenter = useMemo(
    () => nearbySearchCenter ?? nestCenter,
    [nearbySearchCenter, nestCenter]
  );

  const showUserOnMap = nearbySearchMode === "1km" || nearbySearchMode === "5km";

  const nearbySectionSubtitle = useMemo(() => {
    if (nearbySearchMode === "1km") {
      return "Hindu temples within 1 km of your current location.";
    }
    if (nearbySearchMode === "5km") {
      return "Hindu temples within 5 km of your current location.";
    }
    return "Hindu temples within ~50 km of this space center.";
  }, [nearbySearchMode]);

  const openSavedPlaceDetail = useCallback((p: UserPlace) => {
    setDetailTemple(
      userPlaceToDetail(
        p,
        isFriendNest ? ownerName || "Friend" : undefined
      )
    );
  }, [isFriendNest, ownerName]);

  const openNearbyDetail = useCallback((t: NearbyTemple) => {
    setDetailTemple(nearbyToDetail(t));
  }, []);

  const onMapMarkerPress = useCallback(
    (markerId: string) => {
      if (markerId.startsWith("saved-")) {
        const id = markerId.slice("saved-".length);
        const p = places.find((x) => x._id === id);
        if (p) {
          setDetailTemple(
            userPlaceToDetail(
              p,
              isFriendNest ? ownerName || "Friend" : undefined
            )
          );
        }
        return;
      }
      if (markerId.startsWith("near-")) {
        const pid = markerId.slice("near-".length);
        const t = nearby.find((x) => x.placeId === pid);
        if (t) setDetailTemple(nearbyToDetail(t));
      }
    },
    [places, nearby, isFriendNest, ownerName]
  );

  const detailMarkerId = useMemo(() => {
    if (!detailTemple) return null;
    if (detailTemple.placeId) {
      const savedByPid = places.find((p) => p.placeId === detailTemple.placeId);
      if (savedByPid) return `saved-${savedByPid._id}`;
    }
    const savedByCoords = places.find(
      (p) =>
        Math.abs(p.coordinates.lat - detailTemple.lat) < 1e-5 &&
        Math.abs(p.coordinates.lng - detailTemple.lng) < 1e-5 &&
        p.name === detailTemple.name
    );
    if (savedByCoords) return `saved-${savedByCoords._id}`;
    if (detailTemple.placeId) return `near-${detailTemple.placeId}`;
    return null;
  }, [detailTemple, places]);

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
              await loadNearby({ keyword: searchInput });
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
        {isFriendNest ? (
          <Text style={styles.friendNotice}>
            Viewing {ownerName ? `${ownerName}'s` : "a friend's"} nest. Friend nests are read-only.
          </Text>
        ) : null}

        <SpaceMap
          height={240}
          center={mapCenter}
          markers={mapMarkers}
          showsUserLocation={showUserOnMap}
          onMarkerPress={onMapMarkerPress}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.boardBox}>
          <Text style={styles.boardTitle}>Bucket list board</Text>
          <View style={styles.boardTabs}>
            <Pressable
              style={[styles.boardTab, boardScope === "space" && styles.boardTabOn]}
              onPress={() => setBoardScope("space")}
            >
              <Text
                style={[
                  styles.boardTabText,
                  boardScope === "space" && styles.boardTabTextOn,
                ]}
              >
                This space
              </Text>
            </Pressable>
            <Pressable
              style={[styles.boardTab, boardScope === "overall" && styles.boardTabOn]}
              onPress={() => setBoardScope("overall")}
            >
              <Text
                style={[
                  styles.boardTabText,
                  boardScope === "overall" && styles.boardTabTextOn,
                ]}
              >
                Overall
              </Text>
            </Pressable>
          </View>
          {boardLoading ? (
            <ActivityIndicator style={{ marginVertical: 8 }} />
          ) : boardRows.length === 0 ? (
            <Text style={styles.sectionEmpty}>No rankings yet.</Text>
          ) : (
            boardRows.slice(0, 5).map((row, idx) => (
              <View
                key={row.email}
                style={[styles.boardRow, row.isSelf && styles.boardRowSelf]}
              >
                <Text style={styles.boardRank}>{idx + 1}</Text>
                <Text style={styles.boardName} numberOfLines={1}>
                  {row.name}
                  {row.isSelf ? " · you" : ""}
                </Text>
                <Text style={styles.boardScore}>
                  {row.visited}/{row.total || "—"} · {row.completionPct}%
                </Text>
              </View>
            ))
          )}
        </View>

        <Section
          title="Nest temples"
          subtitle="Anchor temples for this space"
          places={nestTemples}
          emptyLabel={
            isFriendNest
              ? "No nest temples in this friend's space yet."
              : "No nest temples yet — add from Nearby below or create manually."
          }
          onOpenPlace={openSavedPlaceDetail}
          onLogVisit={isFriendNest ? undefined : openVisitLog}
          selectedMarkerId={detailMarkerId}
        />

        <Section
          title="Temples of interest"
          places={interestTemples}
          emptyLabel="No temples of interest yet."
          onOpenPlace={openSavedPlaceDetail}
          onLogVisit={isFriendNest ? undefined : openVisitLog}
          selectedMarkerId={detailMarkerId}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby (Google)</Text>
          <Text style={styles.sectionSubtitle}>{nearbySectionSubtitle}</Text>

          <View style={styles.radiusRow}>
            <Pressable
              style={[
                styles.radiusBtn,
                nearbySearchMode === "1km" && styles.radiusBtnActive,
              ]}
              onPress={searchNearMe1Km}
            >
              <Text
                style={[
                  styles.radiusBtnText,
                  nearbySearchMode === "1km" && styles.radiusBtnTextActive,
                ]}
              >
                Near me · 1 km
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.radiusBtn,
                nearbySearchMode === "5km" && styles.radiusBtnActive,
              ]}
              onPress={searchNearMe5Km}
            >
              <Text
                style={[
                  styles.radiusBtnText,
                  nearbySearchMode === "5km" && styles.radiusBtnTextActive,
                ]}
              >
                Near me · 5 km
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.radiusBtn,
                nearbySearchMode === "space" && styles.radiusBtnActive,
              ]}
              onPress={searchThisSpace}
            >
              <Text
                style={[
                  styles.radiusBtnText,
                  nearbySearchMode === "space" && styles.radiusBtnTextActive,
                ]}
              >
                This space
              </Text>
            </Pressable>
          </View>

          {nearbySearchMode !== "space" ? (
            <Text style={styles.radiusHint}>
              Showing temples within {formatDistanceMeters(activeRadiusMeters)} of
              where you are now.
            </Text>
          ) : null}

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
            const nearSelected = detailMarkerId === `near-${t.placeId}`;
            return (
              <View
                key={t.placeId}
                style={[styles.nearbyCard, nearSelected && styles.nearbyCardSelected]}
              >
                <Pressable onPress={() => openNearbyDetail(t)}>
                  <Text style={styles.placeName}>{t.name}</Text>
                  {t.vicinity ? (
                    <Text style={styles.placeMeta} numberOfLines={2}>
                      {t.vicinity}
                    </Text>
                  ) : null}
                  <Text style={styles.placeMeta}>
                    {t.distanceMeters != null
                      ? `${formatDistanceMeters(t.distanceMeters)} away`
                      : null}
                    {t.distanceMeters != null && t.rating != null ? " · " : ""}
                    {t.rating != null ? `★ ${t.rating}` : "No rating"}
                    {t.userRatingsTotal != null ? ` (${t.userRatingsTotal})` : ""}
                  </Text>
                  <Text style={styles.tapDetails}>Tap card for details · Google Places</Text>
                </Pressable>
                {isFriendNest ? (
                  <Text style={styles.savedBadge}>Read-only friend nest</Text>
                ) : saved ? (
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

        {!isFriendNest ? (
          <Pressable style={styles.manualBtn} onPress={() => setManualOpen(true)}>
            <Text style={styles.manualBtnText}>Add temple by name (this location)</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <TempleDetailModal
        visible={detailTemple != null}
        onClose={() => setDetailTemple(null)}
        temple={detailTemple}
        accessToken={accessToken}
        userEmail={userEmail}
      />

      {visitLogTarget ? (
        <VisitLogModal
          visible
          onClose={() => setVisitLogTarget(null)}
          accessToken={accessToken}
          placeDocId={visitLogTarget.place._id}
          placeName={visitLogTarget.place.name}
          placeId={visitLogTarget.place.placeId}
          initialView={visitLogTarget.initialView}
          onVisitsChanged={() => {
            void loadPlaces({ silent: true });
          }}
        />
      ) : null}

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
  scroll: { flex: 1, backgroundColor: "#F6F3ED" },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  spaceAddress: {
    fontSize: 14,
    color: "#555",
    marginBottom: 12,
    lineHeight: 20,
  },
  friendNotice: {
    borderWidth: 1,
    borderColor: "#f0d4d4",
    backgroundColor: "#fff7f7",
    color: "#8a3131",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
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
  boardBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    padding: 12,
    marginBottom: 14,
  },
  boardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  boardTabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
  boardTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f3f3f3",
    alignItems: "center",
  },
  boardTabOn: { backgroundColor: "rgba(13,148,136,0.15)" },
  boardTabText: { fontSize: 12, fontWeight: "600", color: "#666" },
  boardTabTextOn: { color: "#0D9488" },
  boardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  boardRowSelf: {
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  boardRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: "hidden",
    textAlign: "center",
    lineHeight: 22,
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: "#fde68a",
    color: "#78350f",
  },
  boardName: { flex: 1, fontSize: 13, fontWeight: "600" },
  boardScore: { fontSize: 12, color: "#0D9488", fontWeight: "700" },
  placeCard: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  placeCardVisited: {
    borderColor: "#34d399",
    backgroundColor: "#ecfdf5",
  },
  placeCardSelected: {
    borderColor: "#D13B3B",
    borderWidth: 2,
  },
  visitedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#10b981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  visitedBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  placeName: { fontSize: 15, fontWeight: "600" },
  placeMeta: { fontSize: 12, color: "#666", marginTop: 4 },
  logVisitBtn: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(13,148,136,0.12)",
  },
  logVisitBtnText: {
    color: "#0D9488",
    fontWeight: "700",
    fontSize: 12,
  },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "center" },
  radiusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  radiusBtn: {
    borderWidth: 1,
    borderColor: "#0D9488",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  radiusBtnActive: {
    backgroundColor: "#0D9488",
    borderColor: "#0D9488",
  },
  radiusBtnText: {
    color: "#0D9488",
    fontSize: 12,
    fontWeight: "700",
  },
  radiusBtnTextActive: {
    color: "#fff",
  },
  radiusHint: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
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
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    backgroundColor: "#fff",
  },
  nearbyCardSelected: {
    borderColor: "#D13B3B",
    borderWidth: 2,
  },
  tapDetails: {
    fontSize: 11,
    color: "#D13B3B",
    marginTop: 6,
    fontWeight: "600",
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
