import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type {
  CommunityInterestRequest,
  CommunityMessage,
  PublishedCommunity,
  UserLocation,
} from "../api";
import {
  acceptCommunityInterest,
  getApiErrorMessage,
  getCommunityMessages,
  getIncomingCommunityInterests,
  getLocations,
  getPublishedCommunities,
  postCommunityMessage,
  rejectCommunityInterest,
  sendCommunityInterest,
  updateLocation,
} from "../api";
import type { RootStackParamList } from "../navigation/types";

type NavProps = NativeStackScreenProps<RootStackParamList, "Communities">;

type Props = NavProps & {
  accessToken: string;
  userEmail: string;
};

export function CommunitiesScreen({ accessToken, userEmail }: Props) {
  const [published, setPublished] = useState<PublishedCommunity[]>([]);
  const [incoming, setIncoming] = useState<CommunityInterestRequest[]>([]);
  const [mySpaces, setMySpaces] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [publishLoc, setPublishLoc] = useState<UserLocation | null>(null);
  const [purpose, setPurpose] = useState("");
  const [publishing, setPublishing] = useState(false);

  const [board, setBoard] = useState<PublishedCommunity | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [boardLoading, setBoardLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        setError(null);
        const [pubs, ints, locs] = await Promise.all([
          getPublishedCommunities(accessToken),
          getIncomingCommunityInterests(accessToken),
          getLocations(accessToken),
        ]);
        setPublished(pubs);
        setIncoming(ints);
        setMySpaces(locs);
      } catch (e) {
        setError(getApiErrorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken]
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load])
  );

  const openPublish = (loc: UserLocation) => {
    setPublishLoc(loc);
    setPurpose(loc.purpose || "");
  };

  const savePublish = async () => {
    if (!publishLoc) return;
    setPublishing(true);
    try {
      await updateLocation(accessToken, publishLoc._id, {
        visibility: "published",
        purpose: purpose.trim(),
      });
      setPublishLoc(null);
      await load(true);
      Alert.alert("Published", `"${publishLoc.name}" is now visible to everyone.`);
    } catch (e) {
      Alert.alert("Could not publish", getApiErrorMessage(e));
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = (loc: UserLocation) => {
    Alert.alert("Unpublish?", "This space leaves the public community list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unpublish",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await updateLocation(accessToken, loc._id, { visibility: "private" });
              await load(true);
            } catch (e) {
              Alert.alert("Failed", getApiErrorMessage(e));
            }
          })();
        },
      },
    ]);
  };

  const expressInterest = (c: PublishedCommunity) => {
    Alert.alert("Send Interest?", `Ask to join “${c.name}” hosted by ${c.ownerName}.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send Interest",
        onPress: () => {
          void (async () => {
            try {
              await sendCommunityInterest(accessToken, c._id, "");
              await load(true);
              Alert.alert("Sent", "The host will review your interest.");
            } catch (e) {
              Alert.alert("Failed", getApiErrorMessage(e));
            }
          })();
        },
      },
    ]);
  };

  const openBoard = async (c: PublishedCommunity) => {
    setBoard(c);
    setDraft("");
    setBoardLoading(true);
    try {
      const msgs = await getCommunityMessages(accessToken, c._id);
      setMessages(msgs);
    } catch (e) {
      Alert.alert("Board", getApiErrorMessage(e));
      setBoard(null);
    } finally {
      setBoardLoading(false);
    }
  };

  const sendBoard = async () => {
    if (!board || !draft.trim() || posting) return;
    setPosting(true);
    try {
      const msg = await postCommunityMessage(accessToken, board._id, draft.trim());
      setMessages((prev) => [...prev, msg]);
      setDraft("");
    } catch (e) {
      Alert.alert("Could not post", getApiErrorMessage(e));
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={published}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.blurb}>
              Publish a sacred space for group pilgrimage or shared activity. Anyone can send
              Interest; you accept members. The board is where the group plans together.
            </Text>

            <Text style={styles.section}>My spaces — publish</Text>
            {mySpaces.length === 0 ? (
              <Text style={styles.muted}>Create a space on Home first.</Text>
            ) : (
              mySpaces.map((loc) => (
                <View key={loc._id} style={styles.card}>
                  <Text style={styles.cardTitle}>{loc.name}</Text>
                  <Text style={styles.meta}>
                    {loc.visibility === "published" ? "Published" : "Private"}
                  </Text>
                  <View style={styles.row}>
                    <Pressable style={styles.primaryBtn} onPress={() => openPublish(loc)}>
                      <Text style={styles.primaryBtnText}>
                        {loc.visibility === "published" ? "Edit publish" : "Publish"}
                      </Text>
                    </Pressable>
                    {loc.visibility === "published" ? (
                      <Pressable style={styles.ghostBtn} onPress={() => unpublish(loc)}>
                        <Text style={styles.ghostBtnText}>Unpublish</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))
            )}

            {incoming.length > 0 ? (
              <>
                <Text style={styles.section}>
                  Interest requests ({incoming.length})
                </Text>
                {incoming.map((req) => (
                  <View key={req._id} style={styles.requestCard}>
                    <Text style={styles.cardTitle}>{req.fromName}</Text>
                    <Text style={styles.meta}>wants to join {req.spaceName}</Text>
                    {req.message ? <Text style={styles.purpose}>{req.message}</Text> : null}
                    <View style={styles.row}>
                      <Pressable
                        style={styles.acceptBtn}
                        onPress={() => {
                          void (async () => {
                            try {
                              await acceptCommunityInterest(accessToken, req._id);
                              await load(true);
                            } catch (e) {
                              Alert.alert("Failed", getApiErrorMessage(e));
                            }
                          })();
                        }}
                      >
                        <Text style={styles.primaryBtnText}>Accept</Text>
                      </Pressable>
                      <Pressable
                        style={styles.ghostBtn}
                        onPress={() => {
                          void (async () => {
                            try {
                              await rejectCommunityInterest(accessToken, req._id);
                              await load(true);
                            } catch (e) {
                              Alert.alert("Failed", getApiErrorMessage(e));
                            }
                          })();
                        }}
                      >
                        <Text style={styles.ghostBtnText}>Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </>
            ) : null}

            <Text style={styles.section}>
              Browse communities ({published.length})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.muted}>
            No published communities yet. Publish one of your spaces above.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.meta}>
              Host · {item.ownerName} · {item.memberCount} members
            </Text>
            {item.purpose ? (
              <Text style={styles.purpose} numberOfLines={3}>
                {item.purpose}
              </Text>
            ) : null}
            <View style={styles.row}>
              {(item.isMember || item.isOwner) && (
                <Pressable style={styles.primaryBtn} onPress={() => void openBoard(item)}>
                  <Text style={styles.primaryBtnText}>Board</Text>
                </Pressable>
              )}
              {!item.isOwner && !item.isMember && item.interestStatus !== "pending" && (
                <Pressable style={styles.interestBtn} onPress={() => expressInterest(item)}>
                  <Text style={styles.interestBtnText}>Interested</Text>
                </Pressable>
              )}
              {item.interestStatus === "pending" && !item.isMember ? (
                <Text style={styles.pending}>Interest pending</Text>
              ) : null}
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
      />

      <Modal visible={!!publishLoc} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Publish {publishLoc?.name}</Text>
            <Text style={styles.muted}>
              Visible to all users. Others send Interest; you accept or decline.
            </Text>
            <TextInput
              style={styles.input}
              value={purpose}
              onChangeText={setPurpose}
              placeholder="Purpose / invitation"
              placeholderTextColor="#999"
              multiline
            />
            <View style={styles.row}>
              <Pressable style={styles.ghostBtn} onPress={() => setPublishLoc(null)}>
                <Text style={styles.ghostBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, publishing && { opacity: 0.6 }]}
                disabled={publishing}
                onPress={() => void savePublish()}
              >
                <Text style={styles.primaryBtnText}>
                  {publishing ? "Saving…" : "Publish"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!board} animationType="slide" onRequestClose={() => setBoard(null)}>
        <View style={styles.boardSheet}>
          <View style={styles.boardHeader}>
            <Text style={styles.boardTitle}>{board?.name} board</Text>
            <Pressable onPress={() => setBoard(null)}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          {boardLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <ScrollView contentContainerStyle={styles.boardMessages}>
              {messages.length === 0 ? (
                <Text style={styles.muted}>No posts yet. Start planning together.</Text>
              ) : (
                messages.map((m) => (
                  <View
                    key={m._id}
                    style={[
                      styles.msg,
                      m.userEmail === userEmail && styles.msgMine,
                      m.userEmail === "system" && styles.msgSystem,
                    ]}
                  >
                    {m.userEmail !== "system" ? (
                      <Text style={styles.msgAuthor}>{m.userName}</Text>
                    ) : null}
                    <Text style={styles.msgBody}>{m.body}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Write to the board…"
              placeholderTextColor="#888"
            />
            <Pressable
              style={[styles.primaryBtn, posting && { opacity: 0.6 }]}
              disabled={posting}
              onPress={() => void sendBoard()}
            >
              <Text style={styles.primaryBtnText}>{posting ? "…" : "Send"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f7" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, paddingBottom: 40 },
  blurb: { fontSize: 13, color: "#555", lineHeight: 19, marginBottom: 16 },
  section: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  muted: { fontSize: 13, color: "#888", marginBottom: 8 },
  error: { color: "#c00", padding: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  requestCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#141414" },
  meta: { fontSize: 12, color: "#666", marginTop: 4 },
  purpose: { fontSize: 13, color: "#333", marginTop: 8, lineHeight: 18 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" },
  primaryBtn: {
    backgroundColor: "#0D9488",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  acceptBtn: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  ghostBtnText: { color: "#555", fontWeight: "600", fontSize: 13 },
  interestBtn: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  interestBtnText: { color: "#c2410c", fontWeight: "700", fontSize: 13 },
  pending: { fontSize: 12, color: "#c2410c", fontWeight: "600" },
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
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    marginVertical: 12,
    textAlignVertical: "top",
  },
  boardSheet: { flex: 1, backgroundColor: "#0f1115", paddingTop: 56 },
  boardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  boardTitle: { color: "#fff", fontSize: 18, fontWeight: "700", flex: 1 },
  close: { color: "#2DD4BF", fontWeight: "600", fontSize: 16 },
  boardMessages: { padding: 20, paddingBottom: 24 },
  msg: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  msgMine: {
    backgroundColor: "rgba(13,148,136,0.25)",
    borderWidth: 1,
    borderColor: "rgba(13,148,136,0.35)",
  },
  msgSystem: {
    backgroundColor: "transparent",
    alignItems: "center",
  },
  msgAuthor: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 4 },
  msgBody: { color: "#fff", fontSize: 14, lineHeight: 20 },
  composer: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  composerInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: "#fff",
  },
});
