import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Switch } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import type { MobileAuthSession } from "../auth";
import { useTheme } from "../contexts/ThemeContext";

type NavProps = NativeStackScreenProps<RootStackParamList, "Settings">;

type Props = NavProps & {
  session: MobileAuthSession;
  onLogout: () => Promise<void> | void;
};

export function SettingsScreen({ session, onLogout }: Props) {
  const { isDarkTheme, setDarkTheme, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <Text style={[styles.value, { color: colors.textMuted }]}>{session.user.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Preferences</Text>
        <View style={[styles.card, styles.row, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>Dark Theme</Text>
          <Switch
            value={isDarkTheme}
            onValueChange={setDarkTheme}
            trackColor={{ false: "#d1d5db", true: colors.primary }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, { backgroundColor: colors.card }, pressed && styles.pressed]}
          onPress={onLogout}
        >
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F3ED",
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  value: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  logoutBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  logoutBtnText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
