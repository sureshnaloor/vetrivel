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
} from "react-native";
import {
  DivyaDesamList,
  fetchDivyaDesamListDetails,
} from "../api";
import type { RootStackParamList } from "../navigation/types";
import type { MobileAuthSession } from "../auth";

type NavProps = NativeStackScreenProps<RootStackParamList, "DivyaDesamDetail">;

type Props = NavProps & {
  session: MobileAuthSession;
};

export function DivyaDesamDetailScreen({ route, session }: Props) {
  const { id, name } = route.params;
  const [list, setList] = useState<DivyaDesamList | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading || !list) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={list.temples}
        keyExtractor={(item, index) => item.placeId || index.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{list.name}</Text>
            <Text style={styles.desc}>{list.description}</Text>
            <Text style={styles.meta}>{list.temples.length} Temples in List</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <View style={styles.indexBox}>
              <Text style={styles.indexText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              {item.address && <Text style={styles.cardMeta} numberOfLines={2}>{item.address}</Text>}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F3ED" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "700", color: "#333", marginBottom: 8 },
  desc: { fontSize: 14, color: "#666", lineHeight: 20, marginBottom: 8 },
  meta: { fontSize: 12, fontWeight: "600", color: "#0D9488" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
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
    backgroundColor: "rgba(13,148,136,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: { color: "#0D9488", fontWeight: "700", fontSize: 14 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
  cardMeta: { fontSize: 12, color: "#666" },
});
