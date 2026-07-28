import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  addVisitMedia,
  createPlaceVisit,
  deletePlaceVisit,
  deleteVisitMedia,
  formatVisitDate,
  getApiErrorMessage,
  getPlaceVisits,
  todayDateInputValue,
  type PlaceVisit,
  type VisitMediaSource,
} from "../api";

type Props = {
  visible: boolean;
  onClose: () => void;
  accessToken: string;
  placeDocId: string;
  placeName: string;
  onVisitsChanged?: () => void;
};

type PendingMedia = {
  mediaUrl: string;
  mediaType: string;
  source: VisitMediaSource;
};

export function VisitLogModal({
  visible,
  onClose,
  accessToken,
  placeDocId,
  placeName,
  onVisitsChanged,
}: Props) {
  const [visits, setVisits] = useState<PlaceVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visitDate, setVisitDate] = useState(todayDateInputValue());
  const [remarks, setRemarks] = useState("");
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [busyMediaVisitId, setBusyMediaVisitId] = useState<string | null>(null);

  const loadVisits = useCallback(async () => {
    if (!placeDocId) return;
    setLoading(true);
    try {
      const list = await getPlaceVisits(accessToken, placeDocId);
      setVisits(list);
    } catch (e) {
      Alert.alert("Could not load visits", getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [accessToken, placeDocId]);

  useEffect(() => {
    if (!visible) return;
    setVisitDate(todayDateInputValue());
    setRemarks("");
    setPendingMedia([]);
    void loadVisits();
  }, [visible, loadVisits]);

  const ingestAssets = async (
    assets: ImagePicker.ImagePickerAsset[],
    forVisitId: string | null,
    source: VisitMediaSource
  ) => {
    const sliced = assets.slice(0, 6);

    if (!forVisitId) {
      const next: PendingMedia[] = [];
      for (const asset of sliced) {
        if (!asset.base64) continue;
        const mime =
          asset.mimeType ||
          (asset.type === "video" ? "video/mp4" : "image/jpeg");
        next.push({
          mediaUrl: `data:${mime};base64,${asset.base64}`,
          mediaType: mime,
          source,
        });
      }
      setPendingMedia((prev) => [...prev, ...next].slice(0, 8));
      return;
    }

    setBusyMediaVisitId(forVisitId);
    try {
      for (const asset of sliced) {
        if (!asset.base64) continue;
        const mime =
          asset.mimeType ||
          (asset.type === "video" ? "video/mp4" : "image/jpeg");
        await addVisitMedia(accessToken, forVisitId, {
          mediaUrl: `data:${mime};base64,${asset.base64}`,
          mediaType: mime,
          source,
        });
      }
      await loadVisits();
      onVisitsChanged?.();
    } catch (e) {
      Alert.alert("Upload failed", getApiErrorMessage(e));
    } finally {
      setBusyMediaVisitId(null);
    }
  };

  const pickFromLibrary = async (forVisitId: string | null) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to attach media."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
      videoMaxDuration: 30,
    });

    if (result.canceled || !result.assets?.length) return;
    await ingestAssets(result.assets, forVisitId, "upload");
  };

  const captureWithCamera = async (forVisitId: string | null) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow camera access to photograph this visit."
      );
      return;
    }

    Alert.alert("Camera", "What would you like to capture?", [
      {
        text: "Photo",
        onPress: () => {
          void (async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.7,
              base64: true,
              allowsEditing: false,
            });
            if (result.canceled || !result.assets?.length) return;
            await ingestAssets(result.assets, forVisitId, "camera");
          })();
        },
      },
      {
        text: "Video",
        onPress: () => {
          void (async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ["videos"],
              quality: 0.6,
              base64: true,
              videoMaxDuration: 30,
            });
            if (result.canceled || !result.assets?.length) return;
            await ingestAssets(result.assets, forVisitId, "camera");
          })();
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const chooseAddMedia = (forVisitId: string | null) => {
    Alert.alert("Add media", "Choose a source", [
      {
        text: "Take photo / video",
        onPress: () => void captureWithCamera(forVisitId),
      },
      {
        text: "Photo library",
        onPress: () => void pickFromLibrary(forVisitId),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await createPlaceVisit(accessToken, {
        placeDocId,
        visitDate: visitDate.trim() || todayDateInputValue(),
        remarks: remarks.trim(),
        media: pendingMedia.map((m) => ({
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          source: m.source,
        })),
      });
      setRemarks("");
      setPendingMedia([]);
      setVisitDate(todayDateInputValue());
      await loadVisits();
      onVisitsChanged?.();
      Alert.alert("Visit logged", "Marked as visited with your notes and media.");
    } catch (e) {
      Alert.alert("Could not save", getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVisit = (visitId: string) => {
    Alert.alert("Delete visit?", "This removes the visit and its media.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deletePlaceVisit(accessToken, visitId);
              await loadVisits();
              onVisitsChanged?.();
            } catch (e) {
              Alert.alert("Could not delete", getApiErrorMessage(e));
            }
          })();
        },
      },
    ]);
  };

  const handleDeleteMedia = (visitId: string, mediaId: string) => {
    void (async () => {
      try {
        await deleteVisitMedia(accessToken, visitId, mediaId);
        await loadVisits();
      } catch (e) {
        Alert.alert("Could not remove media", getApiErrorMessage(e));
      }
    })();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Visit log</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle} numberOfLines={2}>
          {placeName}
        </Text>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Visit date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={visitDate}
            onChangeText={setVisitDate}
            placeholder="2026-07-27"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, styles.remarks]}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="What stood out on this visit?"
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Photos & videos</Text>
          <View style={styles.mediaActions}>
            <Pressable
              onPress={() => void captureWithCamera(null)}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Take photo / video</Text>
            </Pressable>
            <Pressable
              onPress={() => void pickFromLibrary(null)}
              style={styles.linkBtnInline}
            >
              <Text style={styles.linkBtnText}>From library</Text>
            </Pressable>
          </View>
          {pendingMedia.length > 0 ? (
            <Text style={styles.hint}>
              {pendingMedia.length} file{pendingMedia.length === 1 ? "" : "s"} ready
              to attach on save
              {pendingMedia.some((m) => m.source === "camera")
                ? " (includes camera captures)"
                : ""}
              .
            </Text>
          ) : (
            <Text style={styles.hint}>
              Capture at the temple or pick from your library. Keep photos small
              (~2MB) and videos under ~30s.
            </Text>
          )}

          <Pressable
            style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
            disabled={saving}
            onPress={() => void handleSave()}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Log visit</Text>
            )}
          </Pressable>

          <Text style={[styles.label, { marginTop: 24 }]}>Past visits</Text>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 12 }} />
          ) : visits.length === 0 ? (
            <Text style={styles.hint}>No visits logged yet.</Text>
          ) : (
            visits.map((v) => (
              <View key={v._id} style={styles.visitCard}>
                <View style={styles.row}>
                  <Text style={styles.visitDate}>{formatVisitDate(v.visitDate)}</Text>
                  <Pressable onPress={() => handleDeleteVisit(v._id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
                {v.remarks ? (
                  <Text style={styles.visitRemarks}>{v.remarks}</Text>
                ) : (
                  <Text style={styles.hint}>No remarks</Text>
                )}
                {v.media?.length > 0 ? (
                  <ScrollView horizontal style={styles.mediaRow}>
                    {v.media.map((m) => (
                      <Pressable
                        key={m.id}
                        onLongPress={() => handleDeleteMedia(v._id, m.id)}
                        style={styles.thumbWrap}
                      >
                        {m.mediaType.startsWith("video/") ? (
                          <View style={[styles.thumb, styles.videoThumb]}>
                            <Text style={styles.videoLabel}>Video</Text>
                          </View>
                        ) : (
                          <Image source={{ uri: m.mediaUrl }} style={styles.thumb} />
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
                <Pressable
                  disabled={busyMediaVisitId === v._id}
                  onPress={() => chooseAddMedia(v._id)}
                  style={styles.linkBtn}
                >
                  <Text style={styles.linkBtnText}>
                    {busyMediaVisitId === v._id
                      ? "Uploading…"
                      : "Add photo, video, or camera"}
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: "#0f1115",
    paddingTop: 56,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  close: {
    color: "#2DD4BF",
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    color: "rgba(255,255,255,0.55)",
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  remarks: {
    minHeight: 88,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mediaActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  secondaryBtn: {
    backgroundColor: "rgba(45,212,191,0.15)",
    borderWidth: 1,
    borderColor: "rgba(45,212,191,0.35)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryBtnText: {
    color: "#2DD4BF",
    fontSize: 13,
    fontWeight: "700",
  },
  linkBtnInline: {
    paddingVertical: 8,
  },
  linkBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  linkBtnText: {
    color: "#2DD4BF",
    fontSize: 13,
    fontWeight: "600",
  },
  hint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    lineHeight: 17,
  },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: "#0D9488",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  visitCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  visitDate: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  deleteText: {
    color: "#f87171",
    fontSize: 13,
  },
  visitRemarks: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  mediaRow: {
    marginTop: 10,
  },
  thumbWrap: {
    marginRight: 8,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  videoThumb: {
    alignItems: "center",
    justifyContent: "center",
  },
  videoLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
});
