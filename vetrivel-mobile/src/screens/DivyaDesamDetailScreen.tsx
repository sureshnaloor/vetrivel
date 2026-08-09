import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
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
} from "../api";
import type { RootStackParamList } from "../navigation/types";
import type { MobileAuthSession } from "../auth";
import { useTheme } from "../contexts/ThemeContext";
import { AddTempleModal } from "../components/AddTempleModal";

type NavProps = NativeStackScreenProps<RootStackParamList, "DivyaDesamDetail">;

type Props = NavProps & {
  session: MobileAuthSession;
};

export function DivyaDesamDetailScreen({ route, session }: Props) {
  const { id, name } = route.params;
  const [list, setList] = useState<DivyaDesamList | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddTempleVisible, setIsAddTempleVisible] = useState(false);
  const { colors } = useTheme();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDivyaDesamListDetails(session.accessToken, id);
      setList(data);
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

  if (loading || !list) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
            <Text style={[styles.meta, { color: colors.primary }]}>{list.temples.length} Temples in List</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.primary }]}>
            <View style={[styles.indexBox, { backgroundColor: colors.primary + "1A" }]}>
              <Text style={[styles.indexText, { color: colors.primary }]}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
              {item.address && <Text style={[styles.cardMeta, { color: colors.textMuted }]} numberOfLines={2}>{item.address}</Text>}
            </View>
            {isOwner && (
              <Pressable
                style={[styles.removeBtn, { backgroundColor: colors.error + "1A" }]}
                onPress={() => handleRemoveTemple(item.placeId, item.name)}
              >
                <Text style={[styles.removeBtnText, { color: colors.error }]}>✕</Text>
              </Pressable>
            )}
          </View>
        )}
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
  meta: { fontSize: 12, fontWeight: "600" },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  indexBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: { fontWeight: "700", fontSize: 14 },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  cardMeta: { fontSize: 12 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  removeBtnText: {
    fontWeight: "700",
    fontSize: 16,
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
