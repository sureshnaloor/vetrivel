import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Friend, FriendNest, FriendRequest } from "../api";
import {
  acceptFriendInvite,
  acceptFriendRequest,
  createFriendInvite,
  followFriendNest,
  getApiErrorMessage,
  getFriendNests,
  getFriends,
  getIncomingFriendRequests,
  getSentFriendRequests,
  rejectFriendRequest,
  sendFriendRequest,
} from "../api";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Friends"> & {
  accessToken: string;
};

const ACCENT = "#D13B3B";

export function FriendsScreen({ accessToken, navigation }: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [friendNests, setFriendNests] = useState<FriendNest[]>([]);
  const [email, setEmail] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        setError(null);
        const [friendList, incomingList, sentList, nests] = await Promise.all([
          getFriends(accessToken),
          getIncomingFriendRequests(accessToken),
          getSentFriendRequests(accessToken),
          getFriendNests(accessToken),
        ]);
        setFriends(friendList);
        setIncoming(incomingList);
        setSent(sentList);
        setFriendNests(nests);
      } catch (e: unknown) {
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

  const submitRequest = async () => {
    const toEmail = email.trim().toLowerCase();
    if (!toEmail) return;
    setBusyKey("send");
    try {
      await sendFriendRequest(accessToken, toEmail);
      setEmail("");
      await load(true);
      Alert.alert("Request sent", `Friend request sent to ${toEmail}.`);
    } catch (e: unknown) {
      Alert.alert("Could not send", getApiErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    setBusyKey(requestId);
    try {
      if (accept) await acceptFriendRequest(accessToken, requestId);
      else await rejectFriendRequest(accessToken, requestId);
      await load(true);
    } catch (e: unknown) {
      Alert.alert("Could not update request", getApiErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  };

  const shareInvite = async () => {
    const toEmail = inviteEmail.trim().toLowerCase();
    if (!toEmail) return;
    setBusyKey("invite");
    try {
      const token = await createFriendInvite(accessToken, toEmail);
      await Share.share({
        message: `Join me on Vetrivel: vetrivel://invite/${token}`,
      });
    } catch (e: unknown) {
      Alert.alert("Could not create invite", getApiErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  };

  const submitInviteToken = async () => {
    const token = inviteToken.trim();
    if (!token) return;
    setBusyKey("accept-invite");
    try {
      const message = await acceptFriendInvite(accessToken, token);
      setInviteToken("");
      await load(true);
      Alert.alert("Invite accepted", message);
    } catch (e: unknown) {
      Alert.alert("Could not accept invite", getApiErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  };

  const openNest = (nest: FriendNest) => {
    if (!nest.canOpen) return;
    navigation.navigate("NestDetail", {
      locationId: nest._id,
      name: nest.name,
      latitude: nest.coordinates.lat,
      longitude: nest.coordinates.lng,
      address: nest.address,
      ownerName: nest.ownerName,
      isFriendNest: true,
    });
  };

  const followNest = async (nest: FriendNest) => {
    setBusyKey(`follow-${nest._id}`);
    try {
      await followFriendNest(accessToken, nest._id);
      await load(true);
    } catch (e: unknown) {
      Alert.alert("Could not follow nest", getApiErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const openableNests = friendNests.filter((nest) => nest.canOpen);
  const availableNests = friendNests.filter((nest) => !nest.canOpen);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      keyboardShouldPersistTaps="handled"
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.title}>Add friend</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Friend email"
          placeholderTextColor="#999"
          style={styles.input}
        />
        <Pressable
          style={[styles.primaryButton, busyKey === "send" && styles.disabled]}
          disabled={busyKey === "send" || !email.trim()}
          onPress={submitRequest}
        >
          <Text style={styles.primaryButtonText}>Send request</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Email-bound invite link</Text>
        <Text style={styles.hint}>
          This link works only for the recipient email you enter here.
        </Text>
        <TextInput
          value={inviteEmail}
          onChangeText={setInviteEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Recipient email"
          placeholderTextColor="#999"
          style={styles.input}
        />
        <Pressable
          style={[styles.secondaryButton, busyKey === "invite" && styles.disabled]}
          disabled={busyKey === "invite" || !inviteEmail.trim()}
          onPress={shareInvite}
        >
          <Text style={styles.secondaryButtonText}>Create and share invite</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Accept invite token</Text>
        <TextInput
          value={inviteToken}
          onChangeText={setInviteToken}
          autoCapitalize="none"
          placeholder="Paste token"
          placeholderTextColor="#999"
          style={styles.input}
        />
        <Pressable
          style={[styles.secondaryButton, busyKey === "accept-invite" && styles.disabled]}
          disabled={busyKey === "accept-invite" || !inviteToken.trim()}
          onPress={submitInviteToken}
        >
          <Text style={styles.secondaryButtonText}>Accept invite</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending requests ({incoming.length})</Text>
        {incoming.length === 0 ? (
          <Text style={styles.empty}>No incoming requests.</Text>
        ) : (
          incoming.map((req) => (
            <View key={req._id} style={styles.rowCard}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{req.fromName || req.fromEmail}</Text>
                <Text style={styles.rowMeta}>{req.fromEmail}</Text>
              </View>
              <Pressable
                style={styles.smallAccept}
                disabled={busyKey === req._id}
                onPress={() => respondToRequest(req._id, true)}
              >
                <Text style={styles.smallButtonText}>Accept</Text>
              </Pressable>
              <Pressable
                style={styles.smallReject}
                disabled={busyKey === req._id}
                onPress={() => respondToRequest(req._id, false)}
              >
                <Text style={styles.smallButtonText}>No</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Friends ({friends.length})</Text>
        {friends.length === 0 ? (
          <Text style={styles.empty}>No friends yet.</Text>
        ) : (
          friends.map((friend) => (
            <View key={friend._id} style={styles.rowCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(friend.name || friend.email)[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{friend.name}</Text>
                <Text style={styles.rowMeta}>{friend.email}</Text>
              </View>
            </View>
          ))
        )}
        {sent.length > 0 ? (
          <Text style={styles.hint}>{sent.length} outgoing request(s) pending.</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Friend nests</Text>
        {openableNests.length === 0 ? (
          <Text style={styles.empty}>No followed friend nests yet.</Text>
        ) : (
          openableNests.map((nest) => (
            <Pressable key={nest._id} style={styles.nestCard} onPress={() => openNest(nest)}>
              <Text style={styles.rowTitle}>{nest.name}</Text>
              <Text style={styles.rowMeta}>
                By {nest.ownerName}
                {nest.distanceKm != null ? ` · ${nest.distanceKm.toFixed(1)} km` : ""}
                {nest.followStatus === "auto" ? " · auto-followed" : " · followed"}
              </Text>
              <Text style={styles.linkText}>Open nest →</Text>
            </Pressable>
          ))
        )}
      </View>

      {availableNests.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available to follow</Text>
          {availableNests.map((nest) => (
            <View key={nest._id} style={styles.rowCard}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{nest.name}</Text>
                <Text style={styles.rowMeta}>
                  By {nest.ownerName}
                  {nest.distanceKm != null ? ` · ${nest.distanceKm.toFixed(0)} km away` : ""}
                </Text>
              </View>
              <Pressable
                style={styles.smallAccept}
                disabled={busyKey === `follow-${nest._id}`}
                onPress={() => followNest(nest)}
              >
                <Text style={styles.smallButtonText}>Follow</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F6F3ED" },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  hint: { fontSize: 12, color: "#666", lineHeight: 18, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  secondaryButtonText: { color: ACCENT, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  error: { color: "#b00020", marginBottom: 12 },
  section: { marginTop: 10, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  empty: { color: "#777", fontSize: 13, fontStyle: "italic" },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "700" },
  rowMeta: { fontSize: 12, color: "#666", marginTop: 4 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0D9488",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700" },
  smallAccept: {
    backgroundColor: "#0D9488",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallReject: {
    backgroundColor: "#999",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallButtonText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  nestCard: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  linkText: { color: ACCENT, fontSize: 12, fontWeight: "700", marginTop: 8 },
});
