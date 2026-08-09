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
  ScrollView,
} from "react-native";
import {
  DivyaDesamList,
  fetchDivyaDesamLists,
  cloneDivyaDesamList,
  createDivyaDesamList,
  updateDivyaDesamList,
  deleteDivyaDesamList,
} from "../api";
import type { RootStackParamList, MainTabsParamList } from "../navigation/types";
import type { MobileAuthSession } from "../auth";
import { DivyaDesamFormModal } from "../components/DivyaDesamFormModal";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, "DivyaDesamTab">,
  NativeStackScreenProps<RootStackParamList>
> & {
  session: MobileAuthSession;
};

export function DivyaDesamsExplorerScreen({ navigation, session }: Props) {
  const [lists, setLists] = useState<DivyaDesamList[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);
  
  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingList, setEditingList] = useState<DivyaDesamList | null>(null);

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

  const myLists = lists.filter((l) => l.creatorEmail === session.user.email);
  const sourceLists = lists.filter((l) => l.isGlobalTemplate || l.isPublished);
  const adoptedParentIds = new Set(
    myLists.filter((l) => l.parentListId).map((l) => l.parentListId!)
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

  const handleSave = async (data: Partial<DivyaDesamList>) => {
    try {
      if (editingList) {
        await updateDivyaDesamList(session.accessToken, editingList._id, data);
        Alert.alert("Success", "List updated!");
      } else {
        await createDivyaDesamList(session.accessToken, data);
        Alert.alert("Success", "List created!");
      }
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save list");
      throw e;
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete List", `Are you sure you want to delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDivyaDesamList(session.accessToken, id);
            await load();
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete list");
          }
        },
      },
    ]);
  };

  const renderCard = (item: DivyaDesamList, isMine: boolean) => {
    const isAdopted = adoptedParentIds.has(item._id);
    return (
      <View key={item._id} style={styles.cardWrapper}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => navigation.navigate("DivyaDesamDetail", { id: item._id, name: item.name })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            {item.isGlobalTemplate && <Text style={styles.badge}>Template</Text>}
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description || "No description provided."}
          </Text>
          
          <View style={styles.cardFooter}>
            <Text style={styles.templeCount}>
              {item.temples.length} temple{item.temples.length !== 1 ? 's' : ''}
            </Text>
            
            {isMine ? (
              <View style={styles.actionRow}>
                <Pressable
                  style={styles.actionBtnEdit}
                  onPress={(e) => { e.stopPropagation(); setEditingList(item); setIsModalVisible(true); }}
                >
                  <Text style={styles.actionBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.actionBtnDelete}
                  onPress={(e) => { e.stopPropagation(); handleDelete(item._id, item.name); }}
                >
                  <Text style={styles.actionBtnDeleteText}>Delete</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[
                  styles.adoptBtn,
                  isAdopted && styles.adoptBtnDisabled,
                ]}
                disabled={isAdopted || cloningId === item._id}
                onPress={(e) => { e.stopPropagation(); handleClone(item._id); }}
              >
                {cloningId === item._id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.adoptBtnText}>
                    {isAdopted ? "Adopted" : "Adopt"}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </Pressable>
      </View>
    );
  };

  if (loading && lists.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* My Lists Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Tracked Lists</Text>
          <Text style={styles.sectionSub}>Lists you've created or adopted.</Text>
          {myLists.length === 0 ? (
            <Text style={styles.emptyText}>You haven't created or adopted any lists yet.</Text>
          ) : (
            myLists.map(list => renderCard(list, true))
          )}
        </View>

        {/* Explore Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore Templates</Text>
          <Text style={styles.sectionSub}>Adopt curated templates to start tracking.</Text>
          {sourceLists.length === 0 ? (
            <Text style={styles.emptyText}>No curated lists published yet.</Text>
          ) : (
            sourceLists.map(list => renderCard(list, false))
          )}
        </View>

      </ScrollView>

      {/* Floating Action Button */}
      <Pressable 
        style={styles.fab} 
        onPress={() => { setEditingList(null); setIsModalVisible(true); }}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      <DivyaDesamFormModal 
        visible={isModalVisible}
        initialData={editingList}
        onClose={() => setIsModalVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F3ED",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F6F3ED",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Make room for FAB
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
  },
  sectionSub: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  cardWrapper: {
    marginBottom: 16,
    // Glossy 3D shadow effect
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(13, 148, 136, 0.1)",
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: "#fef3c7",
    color: "#d97706",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
  cardDesc: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
  },
  templeCount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0D9488",
    backgroundColor: "rgba(13, 148, 136, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtnEdit: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnText: {
    color: "#4b5563",
    fontWeight: "600",
    fontSize: 14,
  },
  actionBtnDelete: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnDeleteText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 14,
  },
  adoptBtn: {
    backgroundColor: "#0D9488",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 90,
    alignItems: "center",
  },
  adoptBtnDisabled: {
    backgroundColor: "#9ca3af",
  },
  adoptBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0D9488",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0D9488",
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
