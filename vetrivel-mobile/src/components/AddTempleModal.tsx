import React, { useState, useEffect, useCallback } from "react";
import {
  Modal, View, Text, StyleSheet, TextInput, Pressable,
  ActivityIndicator, FlatList, Alert, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform,
} from "react-native";
import {
  UserLocation, createLocation, createPlace, resolveMapLink,
  getLocations, searchPlaces, PlaceSearchResult,
} from "../api";

interface Props {
  visible: boolean;
  onClose: () => void;
  accessToken: string;
  defaultLocationId?: string;
  onTempleAdded?: () => void;
  onCustomSave?: (data: {
    placeId: string; name: string;
    coordinates: { lat: number; lng: number }; address?: string;
  }) => void;
}

type AddMode = "search" | "link";

export function AddTempleModal({
  visible, onClose, accessToken, defaultLocationId, onTempleAdded, onCustomSave,
}: Props) {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [activeNestId, setActiveNestId] = useState<string | null>(defaultLocationId || null);
  const [isCreatingNest, setIsCreatingNest] = useState(false);
  const [newNestName, setNewNestName] = useState("");
  const [addMode, setAddMode] = useState<AddMode>("search");
  const [saving, setSaving] = useState(false);
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  // Link
  const [mapLink, setMapLink] = useState("");
  const [linkResult, setLinkResult] = useState<{
    placeId: string; name: string; lat: number; lng: number; address: string;
  } | null>(null);
  const [fetchingLink, setFetchingLink] = useState(false);

  useEffect(() => {
    if (visible) { loadNests(); setActiveNestId(defaultLocationId || null); }
    else { reset(); }
  }, [visible, defaultLocationId]);

  function reset() {
    setSearchQuery(""); setSearchResults([]);
    setMapLink(""); setLinkResult(null);
    setIsCreatingNest(false); setNewNestName("");
    setAddMode("search");
  }

  const loadNests = async () => {
    try {
      const locs = await getLocations(accessToken);
      setLocations(locs);
      if (!defaultLocationId && locs.length > 0) setActiveNestId(locs[0]._id);
      else if (locs.length === 0) setIsCreatingNest(true);
    } catch (e) { console.error(e); }
  };

  const activeNest = locations.find((l) => l._id === activeNestId);

  const handleSave = useCallback(async (
    placeId: string | null, name: string, lat: number, lng: number, address?: string
  ) => {
    if (onCustomSave) {
      onCustomSave({ placeId: placeId || `manual_${Date.now()}`, name, coordinates: { lat, lng }, address });
      onClose(); return;
    }
    try {
      setSaving(true);
      let targetLocationId = activeNestId;
      if (isCreatingNest) {
        if (!newNestName.trim()) { Alert.alert("Validation", "Enter a nest name."); setSaving(false); return; }
        const loc = await createLocation(accessToken, { name: newNestName.trim(), coordinates: { lat, lng } });
        targetLocationId = loc._id;
      }
      if (!targetLocationId) { Alert.alert("Validation", "Select or create a nest."); setSaving(false); return; }
      await createPlace(accessToken, {
        name, category: "interest", status: "want_to_go",
        coordinates: { lat, lng }, locationId: targetLocationId,
        placeId: placeId || `manual_${Date.now()}`,
      });
      onTempleAdded?.(); onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add temple");
    } finally { setSaving(false); }
  }, [accessToken, activeNestId, isCreatingNest, newNestName, onCustomSave, onTempleAdded, onClose]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    Keyboard.dismiss();
    setSearching(true); setSearchResults([]);
    try {
      const results = await searchPlaces(accessToken, q, activeNest?.coordinates);
      if (results.length === 0) Alert.alert("No results", "Try a different temple name.");
      setSearchResults(results);
    } catch (e: any) {
      Alert.alert("Search failed", e.message || "Could not search. Try again.");
    } finally { setSearching(false); }
  };

  const handleFetchLink = async () => {
    const link = mapLink.trim();
    if (!link) return;
    Keyboard.dismiss();
    setFetchingLink(true); setLinkResult(null);
    try {
      const res = await resolveMapLink(accessToken, link);
      setLinkResult({ placeId: res.placeId, name: res.name, lat: res.coordinates.lat, lng: res.coordinates.lng, address: res.address });
    } catch (e: any) {
      Alert.alert(
        "Link not recognised",
        "Could not extract details from this link.\n\nTip: Use the Search tab and type the temple name.",
        [{ text: "Use Search", onPress: () => setAddMode("search") }, { text: "Try again", style: "cancel" }]
      );
    } finally { setFetchingLink(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.card}>
            <Text style={s.title}>Add Temple</Text>

            {/* Nest picker */}
            <View style={s.nestBox}>
              <Text style={s.label}>ADD TO NEST</Text>
              {isCreatingNest ? (
                <View style={s.row}>
                  <TextInput style={[s.input, { flex: 1 }]} placeholder="New Nest Name" value={newNestName} onChangeText={setNewNestName} />
                  {locations.length > 0 && (
                    <Pressable style={s.cancelBtn} onPress={() => setIsCreatingNest(false)}>
                      <Text style={s.cancelBtnText}>Cancel</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={s.row}>
                  <Pressable
                    style={s.pickerFake}
                    onPress={() => {
                      if (locations.length < 2) return;
                      const idx = locations.findIndex((l) => l._id === activeNestId);
                      const next = locations[(idx + 1) % locations.length];
                      if (next) setActiveNestId(next._id);
                    }}
                  >
                    <Text style={s.pickerFakeText}>{activeNest?.name ?? "Select Nest"}</Text>
                    {locations.length > 1 && <Text style={{ fontSize: 10, color: "#888" }}>tap to switch</Text>}
                  </Pressable>
                  <Pressable style={s.newBtn} onPress={() => setIsCreatingNest(true)}>
                    <Text style={s.newBtnText}>+ New</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Tabs */}
            <View style={s.tabs}>
              {(["search", "link"] as AddMode[]).map((mode) => (
                <Pressable key={mode} style={[s.tab, addMode === mode && s.tabActive]} onPress={() => setAddMode(mode)}>
                  <Text style={[s.tabText, addMode === mode && s.tabTextActive]}>
                    {mode === "search" ? "Search" : "Paste Link"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Search tab */}
            {addMode === "search" && (
              <View style={{ flex: 1 }}>
                <View style={s.row}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="Temple name, city or area..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    autoFocus
                  />
                  <Pressable style={s.searchBtn} onPress={handleSearch} disabled={searching}>
                    {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.searchBtnText}>Go</Text>}
                  </Pressable>
                </View>
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.placeId || item.name}
                  keyboardShouldPersistTaps="handled"
                  style={{ marginTop: 10 }}
                  renderItem={({ item }) => (
                    <View style={s.resultItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.resultName}>{item.name}</Text>
                        {!!item.address && <Text style={s.resultVicinity} numberOfLines={1}>{item.address}</Text>}
                      </View>
                      <Pressable style={s.addBtn} onPress={() => handleSave(item.placeId, item.name, item.lat, item.lng, item.address)} disabled={saving}>
                        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.addBtnText}>Add</Text>}
                      </Pressable>
                    </View>
                  )}
                  ListEmptyComponent={
                    !searching ? (
                      <Text style={s.hint}>{"Type a temple name and tap Go.\nResults come from Google Places."}</Text>
                    ) : null
                  }
                />
              </View>
            )}

            {/* Link tab */}
            {addMode === "link" && (
              <View>
                <Text style={s.hint}>{"Paste an Apple Maps or Google Maps link.\nIf the link fails, use the Search tab instead."}</Text>
                <TextInput
                  style={[s.input, { height: 72, marginBottom: 8 }]}
                  placeholder="https://maps.apple.com/... or maps.google.com/..."
                  value={mapLink}
                  onChangeText={(t) => { setMapLink(t); setLinkResult(null); }}
                  multiline autoCapitalize="none" autoCorrect={false}
                />
                {!linkResult ? (
                  <Pressable
                    style={[s.mainSaveBtn, (!mapLink.trim() || fetchingLink) && { opacity: 0.5 }]}
                    onPress={handleFetchLink}
                    disabled={fetchingLink || !mapLink.trim()}
                  >
                    {fetchingLink ? <ActivityIndicator color="#fff" /> : <Text style={s.mainSaveBtnText}>Fetch Details</Text>}
                  </Pressable>
                ) : (
                  <View style={s.linkPreview}>
                    <Text style={s.linkPreviewName}>{linkResult.name}</Text>
                    {!!linkResult.address && <Text style={s.linkPreviewAddr}>{linkResult.address}</Text>}
                    <View style={[s.row, { marginTop: 10 }]}>
                      <Pressable style={[s.mainSaveBtn, { flex: 1 }]} onPress={() => handleSave(linkResult.placeId, linkResult.name, linkResult.lat, linkResult.lng, linkResult.address)} disabled={saving}>
                        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.mainSaveBtnText}>Save Temple</Text>}
                      </Pressable>
                      <Pressable style={s.retryBtn} onPress={() => setLinkResult(null)}>
                        <Text style={s.retryBtnText}>Edit</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}

            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  card: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 32, maxHeight: "90%", shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 12 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16, color: "#1a1a1a", textAlign: "center" },
  nestBox: { marginBottom: 14, backgroundColor: "#f5f5f7", padding: 12, borderRadius: 14 },
  label: { fontSize: 11, fontWeight: "700", color: "#888", marginBottom: 6, letterSpacing: 0.5 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12, padding: 12, backgroundColor: "#fff", fontSize: 15, color: "#1a1a1a" },
  pickerFake: { flex: 1, borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12, padding: 12, backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickerFakeText: { fontSize: 15, color: "#1a1a1a", fontWeight: "600" },
  cancelBtn: { padding: 12, backgroundColor: "#eee", borderRadius: 12 },
  cancelBtnText: { fontWeight: "600", color: "#555" },
  newBtn: { paddingVertical: 12, paddingHorizontal: 14, backgroundColor: "#D13B3B", borderRadius: 12 },
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  tabs: { flexDirection: "row", gap: 6, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: "#f0f0f0" },
  tabActive: { backgroundColor: "#0D9488" },
  tabText: { fontSize: 13, fontWeight: "700", color: "#666" },
  tabTextActive: { color: "#fff" },
  searchBtn: { backgroundColor: "#0D9488", paddingHorizontal: 18, borderRadius: 12, justifyContent: "center", height: 48, minWidth: 52, alignItems: "center" },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  resultItem: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", alignItems: "center" },
  resultName: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  resultVicinity: { fontSize: 12, color: "#888", marginTop: 2 },
  addBtn: { backgroundColor: "#0D9488", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginLeft: 10 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  hint: { fontSize: 13, color: "#999", marginBottom: 10, lineHeight: 18, textAlign: "center" },
  mainSaveBtn: { backgroundColor: "#0D9488", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 6 },
  mainSaveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  linkPreview: { backgroundColor: "#f5f5f7", borderRadius: 14, padding: 14, marginTop: 6 },
  linkPreviewName: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  linkPreviewAddr: { fontSize: 13, color: "#666", marginTop: 2 },
  retryBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: "#eee", alignItems: "center", marginTop: 6 },
  retryBtnText: { color: "#555", fontWeight: "600", fontSize: 15 },
  closeBtn: { marginTop: 16, alignItems: "center", paddingVertical: 10 },
  closeBtnText: { fontSize: 16, color: "#aaa", fontWeight: "600" },
});
