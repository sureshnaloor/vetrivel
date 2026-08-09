import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ActivityIndicator,
} from "react-native";
import { DivyaDesamList } from "../api";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Partial<DivyaDesamList>) => Promise<void>;
  initialData?: DivyaDesamList | null;
}

export function DivyaDesamFormModal({ visible, onClose, onSave, initialData }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconSvg, setIconSvg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialData?.name || "");
      setDescription(initialData?.description || "");
      setIconSvg(initialData?.iconSvg || "");
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        iconSvg: iconSvg.trim() || undefined,
      });
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
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
            <Text style={styles.title}>
              {initialData ? "Edit List" : "Create Custom List"}
            </Text>

            <Text style={styles.label}>List Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. My 2026 Pilgrimage"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What is this list about?"
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Icon SVG (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="<svg>...</svg>"
              placeholderTextColor="#9ca3af"
              value={iconSvg}
              onChangeText={setIconSvg}
              multiline
              numberOfLines={3}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.actions}>
              <Pressable style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.saveBtn, (!name.trim() || loading) && styles.saveBtnDisabled]} 
                onPress={handleSave}
                disabled={!name.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>

          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4b5563",
  },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#0D9488",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
