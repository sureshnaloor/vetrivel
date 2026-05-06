import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type {
  GooglePlaceDetails,
  TempleContent,
  TempleContentTab,
} from "../api";
import {
  createTempleContent,
  deleteTempleContent,
  fetchTempleContent,
  getPlaceDetails,
  getTempleKey,
  updateTempleContent,
} from "../api";

const ACCENT = "#D13B3B";

export type TempleDetailSelection = {
  placeId: string | null;
  name: string;
  lat: number;
  lng: number;
  vicinity?: string;
  rating?: number;
  userRatingsTotal?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  temple: TempleDetailSelection | null;
  accessToken: string;
  userEmail: string;
};

const TABS: { id: TempleContentTab; label: string }[] = [
  { id: "info", label: "Info" },
  { id: "pooja", label: "Pooja" },
  { id: "media", label: "Media" },
  { id: "qa", label: "Q&A" },
];

function stars(n: number | undefined): string {
  const c = Math.min(Math.max(Math.round(n ?? 0), 0), 5);
  return "★".repeat(c);
}

export function TempleDetailModal({
  visible,
  onClose,
  temple,
  accessToken,
  userEmail,
}: Props) {
  const [activeTab, setActiveTab] = useState<TempleContentTab>("info");
  const [details, setDetails] = useState<GooglePlaceDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [expandedAbout, setExpandedAbout] = useState(false);
  const [photoLightboxIdx, setPhotoLightboxIdx] = useState<number | null>(
    null
  );

  const [ugcList, setUgcList] = useState<TempleContent[]>([]);
  const [loadingUgc, setLoadingUgc] = useState(false);
  const [ugcInput, setUgcInput] = useState("");
  const [showUgcForm, setShowUgcForm] = useState(false);
  const [submittingUgc, setSubmittingUgc] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const templeKey = useMemo(
    () => (temple ? getTempleKey(temple.placeId, temple.name) : ""),
    [temple]
  );

  const displayName = details?.name || temple?.name || "Temple";
  const displayAddress =
    details?.formattedAddress || temple?.vicinity || "";
  const summary = details?.editorialOverview ?? null;

  useEffect(() => {
    if (!visible || !temple) return;
    setActiveTab("info");
    setExpandedAbout(false);
    setPhotoLightboxIdx(null);
    setShowUgcForm(false);
    setUgcInput("");
    setEditingId(null);
    setEditDraft("");
  }, [visible, temple?.placeId, temple?.name, temple?.lat, temple?.lng]);

  useEffect(() => {
    if (!visible || !temple?.placeId) {
      setDetails(null);
      setDetailsError(null);
      setLoadingDetails(false);
      return;
    }
    let cancelled = false;
    setLoadingDetails(true);
    setDetailsError(null);
    getPlaceDetails(accessToken, temple.placeId)
      .then((d) => {
        if (!cancelled) setDetails(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setDetails(null);
          setDetailsError(
            e instanceof Error ? e.message : "Could not load place details"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, temple?.placeId, accessToken]);

  useEffect(() => {
    if (!visible || !templeKey) {
      setUgcList([]);
      return;
    }
    let cancelled = false;
    setLoadingUgc(true);
    fetchTempleContent(templeKey)
      .then((list) => {
        if (!cancelled) setUgcList(list);
      })
      .catch(() => {
        if (!cancelled) setUgcList([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingUgc(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, templeKey]);

  useEffect(() => {
    setShowUgcForm(false);
    setUgcInput("");
    setEditingId(null);
    setEditDraft("");
  }, [activeTab]);

  const currentUgc = useMemo(
    () => ugcList.filter((item) => item.tab === activeTab),
    [ugcList, activeTab]
  );

  const openMaps = useCallback(() => {
    if (!temple) return;
    const url =
      details?.mapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${temple.lat},${temple.lng}`;
    Linking.openURL(url).catch(() => {});
  }, [temple, details?.mapsUrl]);

  const openWikipedia = useCallback(() => {
    const q = encodeURIComponent(displayName);
    Linking.openURL(
      `https://en.wikipedia.org/wiki/Special:Search?search=${q}`
    ).catch(() => {});
  }, [displayName]);

  const reloadUgc = useCallback(async () => {
    if (!templeKey) return;
    try {
      const list = await fetchTempleContent(templeKey);
      setUgcList(list);
    } catch {
      /* keep list */
    }
  }, [templeKey]);

  const handleAddTextUgc = async () => {
    if (!templeKey || !ugcInput.trim()) return;
    setSubmittingUgc(true);
    try {
      const created = await createTempleContent(accessToken, {
        templeKey,
        tab: activeTab,
        content: ugcInput.trim(),
      });
      setUgcList((prev) => [created, ...prev]);
      setUgcInput("");
      setShowUgcForm(false);
    } catch (e: unknown) {
      Alert.alert(
        "Could not save",
        e instanceof Error ? e.message : "Try again."
      );
    } finally {
      setSubmittingUgc(false);
    }
  };

  const handlePickPhoto = async () => {
    if (!templeKey) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to upload a community image."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    const mime = asset.mimeType || "image/jpeg";
    const dataUri = `data:${mime};base64,${asset.base64}`;
    if (dataUri.length > 2_800_000) {
      Alert.alert("Photo too large", "Choose an image under ~2 MB.");
      return;
    }
    setSubmittingUgc(true);
    try {
      const created = await createTempleContent(accessToken, {
        templeKey,
        tab: "media",
        content: "User uploaded photo",
        mediaUrl: dataUri,
        mediaType: mime,
      });
      setUgcList((prev) => [created, ...prev]);
    } catch (e: unknown) {
      Alert.alert(
        "Upload failed",
        e instanceof Error ? e.message : "Try again."
      );
    } finally {
      setSubmittingUgc(false);
    }
  };

  const startEdit = (item: TempleContent) => {
    setEditingId(item._id);
    setEditDraft(item.content);
    setShowUgcForm(false);
  };

  const saveEdit = async () => {
    if (!editingId || !editDraft.trim()) return;
    setSubmittingUgc(true);
    try {
      const updated = await updateTempleContent(accessToken, editingId, {
        content: editDraft.trim(),
      });
      setUgcList((prev) =>
        prev.map((x) => (x._id === updated._id ? updated : x))
      );
      setEditingId(null);
      setEditDraft("");
    } catch (e: unknown) {
      Alert.alert(
        "Could not update",
        e instanceof Error ? e.message : "Try again."
      );
    } finally {
      setSubmittingUgc(false);
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete this entry?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const ok = await deleteTempleContent(accessToken, id);
            if (ok) setUgcList((prev) => prev.filter((x) => x._id !== id));
          } catch {
            Alert.alert("Delete failed", "Try again.");
          }
        },
      },
    ]);
  };

  const communityTitle =
    activeTab === "info"
      ? "Community notes"
      : activeTab === "pooja"
        ? "Community pooja timings"
        : activeTab === "media"
          ? "Community photos"
          : "Community Q&A";

  const communityPlaceholder =
    activeTab === "info"
      ? "Share something about this temple…"
      : activeTab === "pooja"
        ? "e.g. Ganesh pooja at 6 AM…"
        : activeTab === "qa"
          ? "Ask a question or share an answer…"
          : "";

  const googlePhotoUrls = details?.photoUrls?.length
    ? details.photoUrls
    : [];

  if (!temple) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.shell}>
        <View style={styles.headerBar}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            {loadingDetails && temple.placeId ? (
              <View style={styles.heroLoading}>
                <ActivityIndicator color={ACCENT} />
                <Text style={styles.muted}>Loading details…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.title}>{displayName}</Text>
                <Pressable onPress={openMaps}>
                  <Text style={styles.mapLink}>
                    {displayAddress
                      ? `${displayAddress.split(",").slice(0, 2).join(",")} `
                      : "View location "}
                    (open map)
                  </Text>
                </Pressable>
                {(details?.rating != null || temple.rating != null) && (
                  <Text style={styles.ratingLine}>
                    {stars(details?.rating ?? temple.rating)}{" "}
                    <Text style={styles.muted}>
                      {details?.rating ?? temple.rating}
                      {(details?.userRatingsTotal ?? temple.userRatingsTotal) !=
                      null
                        ? ` (${details?.userRatingsTotal ?? temple.userRatingsTotal} reviews)`
                        : ""}
                    </Text>
                  </Text>
                )}
                {detailsError ? (
                  <Text style={styles.warn}>{detailsError}</Text>
                ) : null}
              </>
            )}
          </View>

          <View style={styles.tabsRow}>
            {TABS.map((t) => {
              const on = activeTab === t.id;
              return (
                <Pressable
                  key={t.id}
                  style={[styles.tabBtn, on && styles.tabBtnOn]}
                  onPress={() => setActiveTab(t.id)}
                >
                  <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.panel}>
            {activeTab === "info" && (
              <View>
                <Text style={styles.sectionHeading}>About</Text>
                {summary ? (
                  <>
                    <Text style={styles.body}>
                      {expandedAbout
                        ? summary
                        : summary.slice(0, 220) +
                          (summary.length > 220 ? "…" : "")}
                    </Text>
                    {summary.length > 220 ? (
                      <Pressable onPress={() => setExpandedAbout((e) => !e)}>
                        <Text style={styles.link}>
                          {expandedAbout ? "Show less" : "Read more"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.muted}>
                    No editorial summary available for this temple. You can
                    learn more through external sources.
                  </Text>
                )}
                <Pressable onPress={openWikipedia} style={styles.wikiBtn}>
                  <Text style={styles.link}>Read full history ↗</Text>
                </Pressable>

                {(details?.formattedPhoneNumber || details?.website) && (
                  <View style={styles.divider}>
                    {details.formattedPhoneNumber ? (
                      <Pressable
                        onPress={() => {
                          const raw = details.formattedPhoneNumber ?? "";
                          Linking.openURL(`tel:${raw.replace(/\s/g, "")}`);
                        }}
                      >
                        <Text style={styles.body}>
                          📞 {details.formattedPhoneNumber}
                        </Text>
                      </Pressable>
                    ) : null}
                    {details.website ? (
                      <Pressable
                        onPress={() => Linking.openURL(details.website!)}
                      >
                        <Text style={[styles.link, { marginTop: 8 }]}>
                          Official website ↗
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}

                {details?.reviews && details.reviews.length > 0 ? (
                  <View style={styles.divider}>
                    <Text style={styles.reviewsHeading}>Recent reviews</Text>
                    {details.reviews.slice(0, 2).map((rev, i) => (
                      <View key={i} style={styles.reviewCard}>
                        <Text style={styles.reviewAuthor}>
                          {(rev.authorName || "User").split(" ")[0]}{" "}
                          <Text style={styles.muted}>
                            {stars(rev.rating)}
                          </Text>
                        </Text>
                        <Text style={styles.reviewText} numberOfLines={4}>
                          {rev.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            )}

            {activeTab === "pooja" && (
              <View>
                <Text style={styles.sectionHeading}>Timings & offerings</Text>
                {details?.weekdayText && details.weekdayText.length > 0 ? (
                  details.weekdayText.map((line, i) => {
                    const idx = line.indexOf(":");
                    const day = idx >= 0 ? line.slice(0, idx).trim() : line;
                    const time = idx >= 0 ? line.slice(idx + 1).trim() : "";
                    return (
                      <View key={i} style={styles.hoursRow}>
                        <Text style={styles.hoursDay}>{day}</Text>
                        <Text style={styles.hoursTime}>{time || "—"}</Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.muted}>
                    Opening hours are not available from Google Places. Check
                    the temple&apos;s official site for pooja timings.
                  </Text>
                )}
              </View>
            )}

            {activeTab === "media" && (
              <View>
                <Text style={styles.sectionHeading}>Photos</Text>
                {loadingDetails && temple.placeId ? (
                  <ActivityIndicator style={{ marginVertical: 16 }} />
                ) : googlePhotoUrls.length > 0 ? (
                  <View style={styles.photoGrid}>
                    {googlePhotoUrls.map((uri, i) => (
                      <Pressable
                        key={i}
                        onPress={() => setPhotoLightboxIdx(i)}
                        style={styles.photoCell}
                      >
                        <Image
                          source={{ uri }}
                          style={styles.photoImg}
                          resizeMode="cover"
                        />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.muted}>
                    No photos available from Google Places for this temple.
                  </Text>
                )}
                {googlePhotoUrls.length > 0 ? (
                  <Text style={styles.photoHint}>
                    Photos from Google Places · {googlePhotoUrls.length} shown
                  </Text>
                ) : null}
              </View>
            )}

            {activeTab === "qa" && (
              <View>
                <Text style={styles.sectionHeading}>AI assistant</Text>
                <View style={styles.aiBubble}>
                  <Text style={styles.body}>
                    <Text style={{ fontWeight: "700" }}>AI assistant: </Text>
                    {summary
                      ? summary.slice(0, 150) +
                        (summary.length > 150 ? "…" : "")
                      : `${displayName} is a Hindu temple${
                          displayAddress
                            ? ` in ${displayAddress.split(",")[0]?.trim()}`
                            : ""
                        }.`}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.communityBlock}>
              <View style={styles.communityHeader}>
                <Text style={styles.sectionHeading}>{communityTitle}</Text>
                {userEmail ? (
                  activeTab === "media" ? (
                    <Pressable
                      onPress={handlePickPhoto}
                      disabled={submittingUgc}
                    >
                      <Text style={styles.addLink}>+ Upload</Text>
                    </Pressable>
                  ) : (
                    !showUgcForm &&
                    !editingId && (
                      <Pressable onPress={() => setShowUgcForm(true)}>
                        <Text style={styles.addLink}>+ Add</Text>
                      </Pressable>
                    )
                  )
                ) : (
                  <Text style={styles.mutedSmall}>Sign in to contribute</Text>
                )}
              </View>

              {!userEmail ? (
                <Text style={styles.mutedSmall}>
                  Log in on the app to add or edit community content.
                </Text>
              ) : null}

              {showUgcForm && activeTab !== "media" && (
                <View style={styles.formBox}>
                  <TextInput
                    style={styles.textArea}
                    placeholder={communityPlaceholder}
                    placeholderTextColor="#999"
                    value={ugcInput}
                    onChangeText={setUgcInput}
                    multiline
                    numberOfLines={4}
                  />
                  <View style={styles.formActions}>
                    <Pressable
                      onPress={() => {
                        setShowUgcForm(false);
                        setUgcInput("");
                      }}
                    >
                      <Text style={styles.cancelBtn}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={styles.saveBtn}
                      onPress={handleAddTextUgc}
                      disabled={submittingUgc}
                    >
                      {submittingUgc ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.saveBtnText}>Save</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              {editingId && (
                <View style={styles.formBox}>
                  <TextInput
                    style={styles.textArea}
                    placeholder={
                      activeTab === "media"
                        ? "Caption / description"
                        : undefined
                    }
                    placeholderTextColor="#999"
                    value={editDraft}
                    onChangeText={setEditDraft}
                    multiline
                    numberOfLines={4}
                  />
                  <View style={styles.formActions}>
                    <Pressable
                      onPress={() => {
                        setEditingId(null);
                        setEditDraft("");
                      }}
                    >
                      <Text style={styles.cancelBtn}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={styles.saveBtn}
                      onPress={saveEdit}
                      disabled={submittingUgc}
                    >
                      {submittingUgc ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.saveBtnText}>Update</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              {loadingUgc ? (
                <ActivityIndicator style={{ marginTop: 12 }} />
              ) : currentUgc.length > 0 ? (
                activeTab === "media" ? (
                  <View style={styles.photoGrid}>
                    {currentUgc.map((item) =>
                      item.mediaUrl ? (
                        <View key={item._id} style={styles.photoCell}>
                          <Image
                            source={{ uri: item.mediaUrl }}
                            style={styles.photoImg}
                            resizeMode="cover"
                          />
                          {item.userEmail === userEmail ? (
                            <>
                              <Pressable
                                style={styles.editPhoto}
                                onPress={() => startEdit(item)}
                              >
                                <Text style={styles.editPhotoText}>Edit</Text>
                              </Pressable>
                              <Pressable
                                style={styles.deletePhoto}
                                onPress={() => confirmDelete(item._id)}
                              >
                                <Text style={styles.deletePhotoText}>×</Text>
                              </Pressable>
                            </>
                          ) : null}
                        </View>
                      ) : null
                    )}
                  </View>
                ) : (
                  currentUgc.map((item) => (
                    <View key={item._id} style={styles.ugcCard}>
                      <Text style={styles.ugcAuthor}>{item.userName}</Text>
                      {editingId === item._id ? null : (
                        <Text style={styles.ugcBody}>{item.content}</Text>
                      )}
                      {item.userEmail === userEmail && !editingId ? (
                        <View style={styles.ugcActions}>
                          <Pressable onPress={() => startEdit(item)}>
                            <Text style={styles.miniLink}>Edit</Text>
                          </Pressable>
                          <Pressable onPress={() => confirmDelete(item._id)}>
                            <Text style={styles.miniDanger}>Delete</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  ))
                )
              ) : (
                <Text style={styles.mutedSmall}>No community content yet.</Text>
              )}

              <Pressable onPress={reloadUgc} style={{ marginTop: 8 }}>
                <Text style={styles.mutedSmall}>Tap to refresh community posts</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {submittingUgc && activeTab === "media" ? (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : null}
      </View>

      <Modal
        visible={photoLightboxIdx !== null && googlePhotoUrls.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoLightboxIdx(null)}
      >
        <Pressable
          style={styles.lightboxBackdrop}
          onPress={() => setPhotoLightboxIdx(null)}
        >
          {photoLightboxIdx !== null && googlePhotoUrls[photoLightboxIdx] ? (
            <Image
              source={{ uri: googlePhotoUrls[photoLightboxIdx] }}
              style={styles.lightboxImg}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#fff" },
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  closeText: { fontSize: 16, color: ACCENT, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  heroLoading: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#141414",
    marginBottom: 8,
  },
  mapLink: { color: ACCENT, fontSize: 14, marginBottom: 6 },
  ratingLine: { fontSize: 13, marginTop: 4 },
  muted: { color: "#6E6A63", fontSize: 13 },
  mutedSmall: { color: "#888", fontSize: 12, marginTop: 6 },
  warn: { color: "#b45309", fontSize: 12, marginTop: 8 },
  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnOn: { borderBottomColor: ACCENT },
  tabLabel: { fontSize: 11, fontWeight: "600", color: "#6E6A63" },
  tabLabelOn: { color: ACCENT },
  panel: { padding: 20 },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
    color: "#141414",
  },
  body: { fontSize: 14, lineHeight: 21, color: "#333" },
  link: { color: ACCENT, fontSize: 14, marginTop: 6 },
  wikiBtn: { marginTop: 10 },
  divider: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  reviewsHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  reviewCard: {
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  reviewAuthor: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  reviewText: { fontSize: 12, color: "#444", lineHeight: 18 },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
  },
  hoursDay: { fontSize: 12, color: "#555", flex: 1 },
  hoursTime: { fontSize: 12, fontWeight: "600", flex: 1, textAlign: "right" },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  photoCell: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  photoImg: { width: "100%", height: "100%" },
  photoHint: {
    fontSize: 10,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
  },
  aiBubble: {
    borderWidth: 1,
    borderColor: "rgba(209,59,59,0.35)",
    backgroundColor: "rgba(209,59,59,0.06)",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  communityBlock: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  communityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addLink: { color: ACCENT, fontWeight: "700", fontSize: 14 },
  formBox: {
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  textArea: {
    minHeight: 88,
    fontSize: 14,
    color: "#141414",
    textAlignVertical: "top",
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 10,
    alignItems: "center",
  },
  cancelBtn: { fontSize: 14, color: "#666", padding: 8 },
  saveBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 88,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  ugcCard: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  ugcAuthor: { fontSize: 12, color: "#666", fontWeight: "600", marginBottom: 6 },
  ugcBody: { fontSize: 14, color: "#333", lineHeight: 20 },
  ugcActions: { flexDirection: "row", gap: 16, marginTop: 8 },
  miniLink: { fontSize: 13, color: ACCENT, fontWeight: "600" },
  miniDanger: { fontSize: 13, color: "#c62828", fontWeight: "600" },
  editPhoto: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editPhotoText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  deletePhoto: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  deletePhotoText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 16,
  },
  lightboxImg: { width: "100%", height: "100%" },
});
