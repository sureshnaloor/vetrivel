import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { UserLocation, searchNearbyTemples, NearbyTemple, createLocation, createPlace, resolveMapLink, getLocations } from "../api";
import { LatLng } from "../lib/geo";

interface Props {
  visible: boolean;
  onClose: () => void;
  accessToken: string;
  defaultLocationId?: string;
  onTempleAdded?: () => void;
  onCustomSave?: (data: { placeId: string; name: string; coordinates: { lat: number; lng: number }; address?: string }) => void;
}

export function AddTempleModal({ visible, onClose, accessToken, defaultLocationId, onTempleAdded, onCustomSave }: Props) {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [activeNestId, setActiveNestId] = useState<string | null>(defaultLocationId || null);
  const [isCreatingNest, setIsCreatingNest] = useState(false);
  const [newNestName, setNewNestName] = useState("");

  const [addMode, setAddMode] = useState<"search" | "manual" | "link">("search");
  const [loading, setLoading] = useState(false);

  // Search Mode
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NearbyTemple[]>([]);
  const [searching, setSearching] = useState(false);

  // Manual Mode
  const [manualName, setManualName] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  // Link Mode
  const [mapLink, setMapLink] = useState("");

  useEffect(() => {
    if (visible) {
      loadNests();
      setActiveNestId(defaultLocationId || null);
    } else {
      // reset
      setSearchQuery("");
      setSearchResults([]);
      setManualName("");
      setManualLat("");
      setManualLng("");
      setMapLink("");
      setIsCreatingNest(false);
      setNewNestName("");
      setAddMode("search");
    }
  }, [visible, defaultLocationId]);

  const loadNests = async () => {
    try {
      const locs = await getLocations(accessToken);
      setLocations(locs);
      if (!defaultLocationId && locs.length > 0) {
        setActiveNestId(locs[0]._id);
      } else if (locs.length === 0) {
        setIsCreatingNest(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const activeNest = locations.find(l => l._id === activeNestId);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      // Use active nest center if available, else a default (e.g. India center)
      const lat = activeNest?.coordinates.lat || 20.5937;
      const lng = activeNest?.coordinates.lng || 78.9629;
      const results = await searchNearbyTemples(accessToken, { lat, lng, keyword: searchQuery });
      setSearchResults(results);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to search");
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async (
    placeId: string | null,
    name: string,
    lat: number,
    lng: number,
    address?: string
  ) => {
    if (onCustomSave) {
      onCustomSave({
        placeId: placeId || `manual_${Date.now()}`,
        name,
        coordinates: { lat, lng },
        address,
      });
      onClose();
      return;
    }

    try {
      setLoading(true);
      let targetLocationId = activeNestId;

      if (isCreatingNest) {
        if (!newNestName.trim()) {
          Alert.alert("Validation", "Please enter a name for the new nest.");
          setLoading(false);
          return;
        }
        const loc = await createLocation(accessToken, {
          name: newNestName.trim(),
          coordinates: { lat, lng },
        });
        targetLocationId = loc._id;
      }

      if (!targetLocationId) {
        Alert.alert("Validation", "Please select or create a nest.");
        setLoading(false);
        return;
      }

      await createPlace(accessToken, {
        name,
        category: "interest",
        status: "want_to_go",
        coordinates: { lat, lng },
        locationId: targetLocationId,
        placeId: placeId || `manual_${Date.now()}`
      });

      if (onTempleAdded) onTempleAdded();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add temple");
    } finally {
      setLoading(false);
    }
  };

  const onAddFromSearch = (item: NearbyTemple) => {
    handleSave(item.placeId, item.name, item.lat, item.lng, item.vicinity);
  };

  const onAddManual = () => {
    if (!manualName.trim() || !manualLat.trim() || !manualLng.trim()) {
      Alert.alert("Validation", "Please fill all fields for manual entry.");
      return;
    }
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert("Validation", "Invalid coordinates.");
      return;
    }
    handleSave(null, manualName.trim(), lat, lng);
  };

  const onAddLink = async () => {
    if (!mapLink.trim()) return;
    try {
      setLoading(true);
      const res = await resolveMapLink(accessToken, mapLink.trim());
      await handleSave(res.placeId, res.name, res.coordinates.lat, res.coordinates.lng, res.address);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to resolve link");
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.backdrop} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Add Temple</Text>
          
          {/* Nest Selection */}
          <View style={styles.nestBox}>
            <Text style={styles.label}>Nest Location</Text>
            {isCreatingNest ? (
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="New Nest Name"
                  value={newNestName}
                  onChangeText={setNewNestName}
                />
                {locations.length > 0 && (
                  <Pressable style={styles.cancelBtn} onPress={() => setIsCreatingNest(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={styles.row}>
                <Pressable
                  style={styles.pickerFake}
                  onPress={() => {
                    if (locations.length === 0) return;
                    const idx = locations.findIndex(l => l._id === activeNestId);
                    const next = locations[(idx + 1) % locations.length];
                    if (next) setActiveNestId(next._id);
                  }}
                >
                  <Text style={styles.pickerFakeText}>{activeNest ? activeNest.name : "Select Nest"}</Text>
                  <Text style={{ fontSize: 10, color: "#666" }}>(Tap to cycle)</Text>
                </Pressable>
                <Pressable style={styles.newBtn} onPress={() => setIsCreatingNest(true)}>
                  <Text style={styles.newBtnText}>+ New</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, addMode === "search" && styles.tabActive]}
              onPress={() => setAddMode("search")}
            >
              <Text style={[styles.tabText, addMode === "search" && styles.tabTextActive]}>Search</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, addMode === "manual" && styles.tabActive]}
              onPress={() => setAddMode("manual")}
            >
              <Text style={[styles.tabText, addMode === "manual" && styles.tabTextActive]}>Manual</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, addMode === "link" && styles.tabActive]}
              onPress={() => setAddMode("link")}
            >
              <Text style={[styles.tabText, addMode === "link" && styles.tabTextActive]}>Link</Text>
            </Pressable>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {addMode === "search" && (
              <View style={{ flex: 1 }}>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Search temple name..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  <Pressable style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
                    {searching ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchBtnText}>Search</Text>}
                  </Pressable>
                </View>
                <FlatList
                  data={searchResults}
                  keyExtractor={item => item.placeId}
                  renderItem={({ item }) => (
                    <View style={styles.resultItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName}>{item.name}</Text>
                        {item.vicinity && <Text style={styles.resultVicinity}>{item.vicinity}</Text>}
                      </View>
                      <Pressable style={styles.addBtn} onPress={() => onAddFromSearch(item)} disabled={loading}>
                        <Text style={styles.addBtnText}>Add</Text>
                      </Pressable>
                    </View>
                  )}
                  style={{ marginTop: 12 }}
                />
              </View>
            )}

            {addMode === "manual" && (
              <View>
                <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="Temple Name" value={manualName} onChangeText={setManualName} />
                <View style={styles.row}>
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Latitude" value={manualLat} onChangeText={setManualLat} keyboardType="numeric" />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Longitude" value={manualLng} onChangeText={setManualLng} keyboardType="numeric" />
                </View>
                <Pressable style={styles.mainSaveBtn} onPress={onAddManual} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainSaveBtnText}>Save Temple</Text>}
                </Pressable>
              </View>
            )}

            {addMode === "link" && (
              <View>
                <Text style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                  Paste a Google Maps link to automatically extract details.
                </Text>
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  placeholder="https://maps.app.goo.gl/..."
                  value={mapLink}
                  onChangeText={setMapLink}
                  multiline
                />
                <Pressable style={styles.mainSaveBtn} onPress={onAddLink} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainSaveBtnText}>Fetch & Add</Text>}
                </Pressable>
              </View>
            )}
          </View>

            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16, color: "#333" },
  nestBox: { marginBottom: 16, backgroundColor: "#f9f9f9", padding: 12, borderRadius: 12 },
  label: { fontSize: 12, fontWeight: "600", color: "#666", marginBottom: 6 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    fontSize: 15,
  },
  pickerFake: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  pickerFakeText: {
    fontSize: 15,
    color: "#333"
  },
  cancelBtn: { padding: 12, backgroundColor: "#eee", borderRadius: 10 },
  cancelBtnText: { fontWeight: "600" },
  newBtn: { padding: 12, backgroundColor: "#D13B3B", borderRadius: 10 },
  newBtnText: { color: "#fff", fontWeight: "700" },
  tabs: { flexDirection: "row", gap: 4, marginBottom: 16 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  tabActive: { backgroundColor: "#0D9488" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#666" },
  tabTextActive: { color: "#fff" },
  content: { minHeight: 200 },
  searchBtn: { backgroundColor: "#0D9488", paddingHorizontal: 16, borderRadius: 10, justifyContent: "center", height: 46 },
  searchBtnText: { color: "#fff", fontWeight: "700" },
  resultItem: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee", alignItems: "center" },
  resultName: { fontSize: 15, fontWeight: "600" },
  resultVicinity: { fontSize: 12, color: "#666", marginTop: 2 },
  addBtn: { backgroundColor: "#0D9488", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginLeft: 12 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  mainSaveBtn: { backgroundColor: "#0D9488", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 16 },
  mainSaveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  closeBtn: { marginTop: 16, alignItems: "center", paddingVertical: 12 },
  closeBtnText: { fontSize: 16, color: "#666", fontWeight: "600" },
});
