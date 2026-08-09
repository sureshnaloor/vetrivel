import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import {
  DivyaDesamList,
  fetchDivyaDesamLists,
  cloneDivyaDesamList,
} from "../api";
import type { RootStackParamList } from "../navigation/types";
import type { MobileAuthSession } from "../auth";

type NavProps = NativeStackScreenProps<RootStackParamList, "DivyaDesamsExplorer">;

type Props = NavProps & {
  session: MobileAuthSession;
};

export function DivyaDesamsExplorerScreen({ navigation, session }: Props) {
  const [lists, setLists] = useState<DivyaDesamList[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchDivyaDesamLists(session.accessToken);
      setLists(all);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load lists");
    } finally {
      setLoading(false);
    }
  }, [session.accessToken]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const sourceLists = lists.filter((l) => l.isGlobalTemplate || l.isPublished);
  const userOwnedLists = lists.filter((l) => l.creatorEmail === session.user.email);
  const adoptedParentIds = new Set(
    userOwnedLists.filter((l) => l.parentListId).map((l) => l.parentListId!)
  );

  const handleClone = async (id: string) => {
    setCloningId(id);
    try {
      const cloned = await cloneDivyaDesamList(session.accessToken, id);
      Alert.alert("Success", "List successfully adopted!");
      navigation.navigate("DivyaDesamDetail", { id: cloned._id, name: cloned.name });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to adopt list.");
    } finally {
      setCloningId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={{ marginTop: 12, color: "#666" }}>Loading curated lists...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sourceLists}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Explore Divya Desams</Text>
            <Text style={styles.headerSub}>
              Adopt curated temple lists and start tracking your pilgrimage.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No curated lists published yet.</Text>
        }
        renderItem={({ item }) => {
          const isAdopted = adoptedParentIds.has(item._id);
          const isTemplate = item.isGlobalTemplate;

          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              
              <View style={styles.badgeRow}>
                {isTemplate && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>GLOBAL TEMPLATE</Text>
                  </View>
                )}
                {isAdopted && (
                  <View style={styles.badgeAdopted}>
                    <Text style={styles.badgeAdoptedText}>ADOPTED</Text>
                  </View>
                )}
              </View>

              <Text style={styles.desc} numberOfLines={3}>
                {item.description || "No description provided."}
              </Text>
              
              <Text style={styles.meta}>{item.temples.length} Temples</Text>

              <View style={styles.divider} />

              {isAdopted ? (
                <Pressable
                  style={styles.viewBtn}
                  onPress={() => {
                    const adopted = userOwnedLists.find((l) => l.parentListId === item._id);
                    if (adopted) {
                      navigation.navigate("DivyaDesamDetail", {
                        id: adopted._id,
                        name: adopted.name,
                      });
                    }
                  }}
                >
                  <Text style={styles.viewBtnText}>View My Copy</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.adoptBtn, cloningId === item._id && styles.adoptBtnDisabled]}
                  disabled={cloningId === item._id}
                  onPress={() => handleClone(item._id)}
                >
                  {cloningId === item._id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.adoptBtnText}>+ Adopt this List</Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F3ED" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#333", marginBottom: 4 },
  headerSub: { fontSize: 14, color: "#666", lineHeight: 20 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 8 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: { backgroundColor: "rgba(13,148,136,0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: "#0D9488", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  badgeAdopted: { backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeAdoptedText: { color: "#166534", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  desc: { fontSize: 13, color: "#666", lineHeight: 18, marginBottom: 12 },
  meta: { fontSize: 12, fontWeight: "600", color: "#999" },
  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginVertical: 16 },
  viewBtn: { backgroundColor: "#f0f0f0", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  viewBtnText: { color: "#333", fontWeight: "600", fontSize: 14 },
  adoptBtn: { backgroundColor: "#0D9488", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  adoptBtnDisabled: { opacity: 0.6 },
  adoptBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
