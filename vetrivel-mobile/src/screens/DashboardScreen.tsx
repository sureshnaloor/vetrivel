import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { MobileAuthSession } from "../auth";
import { getLocations, getPlaces } from "../api";

type Props = {
  session: MobileAuthSession;
  onLogout: () => Promise<void> | void;
};

type DashboardData = {
  locations: Array<{ _id: string; name: string; address?: string }>;
  places: Array<{ _id: string; name: string; category?: string; status?: string }>;
};

export function DashboardScreen({ session, onLogout }: Props) {
  const [data, setData] = useState<DashboardData>({ locations: [], places: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      setError(null);
      const [locations, places] = await Promise.all([
        getLocations(session.accessToken),
        getPlaces(session.accessToken),
      ]);
      setData({ locations, places });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.accessToken]);

  useEffect(() => {
    load();
  }, [load]);

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
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.email}>{session.user.email}</Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={data.places}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>
              My Locations ({data.locations.length})
            </Text>
            {data.locations.map((location) => (
              <View key={location._id} style={styles.card}>
                <Text style={styles.cardTitle}>{location.name}</Text>
                {location.address ? (
                  <Text style={styles.cardMeta}>{location.address}</Text>
                ) : null}
              </View>
            ))}
            <Text style={styles.sectionTitle}>My Places ({data.places.length})</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {item.category || "unknown"} · {item.status || "unknown"}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.cardMeta}>No places found yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "700" },
  email: { fontSize: 12, color: "#666", marginTop: 2 },
  logoutButton: {
    backgroundColor: "#efefef",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8, marginTop: 8 },
  card: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardMeta: { fontSize: 12, color: "#666", marginTop: 4 },
  error: {
    color: "#b00020",
    marginBottom: 8,
  },
});
