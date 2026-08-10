import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  Alert,
  Pressable,
} from "react-native";
import {
  DivyaDesamList,
  fetchDivyaDesamListDetails,
  updateDivyaDesamList,
  getAllPlaces,
  createPlace,
  type UserPlace,
  type TempleListItem,
} from "../api";
import {
  TempleDetailModal,
  type TempleDetailSelection,
} from "../components/TempleDetailModal";
import { VisitLogModal } from "../components/VisitLogModal";
import type { RootStackParamList } from "../navigation/types";
import type { MobileAuthSession } from "../auth";
import { useTheme } from "../contexts/ThemeContext";
import { AddTempleModal } from "../components/AddTempleModal";
import { formatVisitDate } from "../api";

type NavProps = NativeStackScreenProps<RootStackParamList, "DivyaDesamDetail">;

type Props = NavProps & {
  session: MobileAuthSession;
};

export function DivyaDesamDetailScreen({ route, session }: Props) {
  const { id, name } = route.params;
  const [list, setList] = useState<DivyaDesamList | null>(null);
  const [userPlaces, setUserPlaces] = useState<UserPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddTempleVisible, setIsAddTempleVisible] = useState(false);
  const { colors } = useTheme();

  const [detailTemple, setDetailTemple] = useState<TempleDetailSelection | null>(null);
  const [visitLogTarget, setVisitLogTarget] = useState<{
    place: UserPlace;
    initialView: "log" | "history";
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, places] = await Promise.all([
        fetchDivyaDesamListDetails(session.accessToken, id),
        getAllPlaces(session.accessToken)
      ]);
      setList(data);
      setUserPlaces(places);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load list details");
    } finally {
      setLoading(false);
    }
  }, [session.accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const userPlacesMap = useMemo(() => {
    const map = new Map<string, UserPlace>();
    userPlaces.forEach(p => {
      if (p.placeId) map.set(p.placeId, p);
    });
    return map;
  }, [userPlaces]);

  const isOwner = list?.creatorEmail === session.user.email;

  const handleAddTemple = async (newTemple: { placeId: string; name: string; coordinates: { lat: number; lng: number }; address?: string }) => {
    if (!list) return;

    if (list.temples.some(t => t.placeId === newTemple.placeId)) {
      Alert.alert("Notice", "This temple is already in the list.");
      return;
    }

    try {
      const updatedTemples = [...list.temples, newTemple];
      const updatedList = await updateDivyaDesamList(session.accessToken, list._id, { temples: updatedTemples });
      setList(updatedList);
      Alert.alert("Success", "Temple added successfully!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add temple");
    }
  };

  const handleRemoveTemple = (placeId: string, templeName: string) => {
    if (!list) return;

    Alert.alert("Remove Temple", `Are you sure you want to remove ${templeName} from this list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const updatedTemples = list.temples.filter(t => t.placeId !== placeId);
            const updatedList = await updateDivyaDesamList(session.accessToken, list._id, { temples: updatedTemples });
            setList(updatedList);
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to remove temple");
          }
        }
      }
    ]);
  };

  const openSavedPlaceDetail = (t: TempleListItem) => {
    const userPlace = userPlacesMap.get(t.placeId);
    setDetailTemple({
      placeId: t.placeId,
      name: t.name,
      lat: t.coordinates.lat,
      lng: t.coordinates.lng,
      userPlaceId: userPlace?._id,
      status: userPlace?.status,
      lastVisitDate: userPlace?.lastVisitDate,
    });
  };

  const handleLogVisit = async (t: TempleListItem) => {
    let place = userPlacesMap.get(t.placeId);
    if (!place) {
      try {
        place = await createPlace(session.accessToken, {
          placeId: t.placeId,
          name: t.name,
          coordinates: t.coordinates,
          category: 'nest',
          status: 'planned',
          address: t.address
        });
        const updatedPlaces = await getAllPlaces(session.accessToken);
        setUserPlaces(updatedPlaces);
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to save place for logging visit");
        return;
      }
    }
    setVisitLogTarget({ place, initialView: place.hasVisitDetails ? "history" : "log" });
  };

  if (loading || !list) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const visitedCount = list.temples.filter(t => userPlacesMap.get(t.placeId)?.status === 'visited').length;
  const totalCount = list.temples.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={list.temples}
        keyExtractor={(item, index) => item.placeId || index.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{list.name}</Text>
            <Text style={[styles.desc, { color: colors.textMuted }]}>{list.description}</Text>
            <Text style={[styles.meta, { color: colors.primary }]}>
              {visitedCount} / {totalCount} Visited
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const userPlace = userPlacesMap.get(item.placeId);
          const isVisited = userPlace?.status === 'visited';
          const visitCtaLabel = userPlace?.hasVisitDetails ? "Previous visit" : "Log visit";

          return (
            <View style={[
              styles.card, 
              { backgroundColor: colors.card, borderColor: colors.border },
              isVisited && styles.cardVisited
            ]}>
              {isVisited && (
                <View style={styles.visitedBadge}>
                  <Text style={styles.visitedBadgeText}>✓ VISITED</Text>
                </View>
              )}
              
              <View style={styles.cardHeader}>
                <View style={[styles.indexBox, { backgroundColor: colors.primary + "1A" }]}>
                  <Text style={[styles.indexText, { color: colors.primary }]}>{index + 1}</Text>
                </View>
                {isOwner && (
                  <Pressable
                    style={[styles.removeBtn, { backgroundColor: colors.error + "1A" }]}
                    onPress={() => handleRemoveTemple(item.placeId, item.name)}
                    hitSlop={8}
                  >
                    <Text style={[styles.removeBtnText, { color: colors.error }]}>✕</Text>
                  </Pressable>
                )}
              </View>

              <Pressable onPress={() => openSavedPlaceDetail(item)}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
                <Text style={styles.placeMeta}>
                  {!isVisited ? (userPlace?.status || "—") : ""}
                  {userPlace?.lastVisitDate
                    ? `${isVisited ? "" : " · "}Last visit ${formatVisitDate(userPlace.lastVisitDate)}`
                    : ""}
                  {" · Tap for details"}
                </Text>
              </Pressable>

              <Pressable onPress={() => handleLogVisit(item)} style={styles.logVisitBtn}>
                <Text style={styles.logVisitBtnText}>{visitCtaLabel}</Text>
              </Pressable>
            </View>
          );
        }}
      />

      {isOwner && (
        <>
          <Pressable 
            style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={() => setIsAddTempleVisible(true)}
          >
            <Text style={styles.fabIcon}>+</Text>
          </Pressable>
          <AddTempleModal 
            visible={isAddTempleVisible} 
            onClose={() => setIsAddTempleVisible(false)} 
            accessToken={session.accessToken}
            onCustomSave={handleAddTemple}
          />
        </>
      )}

      {detailTemple && (
        <TempleDetailModal
          visible={detailTemple != null}
          onClose={() => setDetailTemple(null)}
          temple={detailTemple}
          accessToken={session.accessToken}
          userEmail={session.user.email}
        />
      )}

      {visitLogTarget && (
        <VisitLogModal
          visible
          onClose={() => setVisitLogTarget(null)}
          accessToken={session.accessToken}
          placeDocId={visitLogTarget.place._id}
          placeName={visitLogTarget.place.name}
          placeId={visitLogTarget.place.placeId}
          initialView={visitLogTarget.initialView}
          onVisitsChanged={() => {
            void load();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  desc: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  meta: { fontSize: 14, fontWeight: "700" },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardVisited: {
    borderColor: "#4ade80",
    backgroundColor: "rgba(74,222,128,0.03)",
  },
  visitedBadge: {
    position: "absolute",
    top: -1,
    right: -1,
    backgroundColor: "#4ade80",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 11,
  },
  visitedBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  indexBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: { fontWeight: "700", fontSize: 12 },
  cardTitle: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  placeMeta: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    fontWeight: "700",
    fontSize: 14,
  },
  logVisitBtn: {
    backgroundColor: "rgba(13,148,136,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  logVisitBtnText: {
    color: "#0D9488",
    fontSize: 13,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabIcon: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "300",
    marginTop: -2,
  },
});
