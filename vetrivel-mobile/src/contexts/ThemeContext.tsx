import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { useColorScheme } from "react-native";

interface Colors {
  background: string;
  card: string;
  text: string;
  textMuted: string;
  primary: string;
  border: string;
  warning: string;
  error: string;
}

const lightColors: Colors = {
  background: "#F6F3ED",
  card: "#ffffff",
  text: "#111827",
  textMuted: "#6b7280",
  primary: "#0D9488",
  border: "#e5e7eb",
  warning: "#d97706",
  error: "#ef4444",
};

const darkColors: Colors = {
  background: "#131418",
  card: "#1f2937",
  text: "#f3f4f6",
  textMuted: "#9ca3af",
  primary: "#2DD4BF",
  border: "#374151",
  warning: "#fbbf24",
  error: "#f87171",
};

interface ThemeContextType {
  isDarkTheme: boolean;
  setDarkTheme: (isDark: boolean) => void;
  colors: Colors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load saved preference
    SecureStore.getItemAsync("vetrivel_theme").then((saved) => {
      if (saved !== null) {
        setIsDarkTheme(saved === "dark");
      } else {
        setIsDarkTheme(systemColorScheme === "dark");
      }
      setIsLoaded(true);
    });
  }, [systemColorScheme]);

  const setDarkTheme = (isDark: boolean) => {
    setIsDarkTheme(isDark);
    SecureStore.setItemAsync("vetrivel_theme", isDark ? "dark" : "light");
  };

  if (!isLoaded) return null;

  const colors = isDarkTheme ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkTheme, setDarkTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
