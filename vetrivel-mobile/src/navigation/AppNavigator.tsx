import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { MobileAuthSession } from "../auth";

import { CommunitiesScreen } from "../screens/CommunitiesScreen";
import { CreateSpaceScreen } from "../screens/CreateSpaceScreen";
import { FriendsScreen } from "../screens/FriendsScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { NestDetailScreen } from "../screens/NestDetailScreen";
import { DivyaDesamsExplorerScreen } from "../screens/DivyaDesamsExplorerScreen";
import { DivyaDesamDetailScreen } from "../screens/DivyaDesamDetailScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import type { RootStackParamList, MainTabsParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

type Props = {
  session: MobileAuthSession;
  onLogout: () => Promise<void> | void;
};

function MainTabs({ session, onLogout }: Props) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#D13B3B",
        tabBarInactiveTintColor: "#666",
        headerTintColor: "#D13B3B",
        headerTitleStyle: { fontWeight: "600" },
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen name="HomeTab" options={{ title: "My spaces", tabBarLabel: "Home" }}>
        {(props) => <HomeScreen {...props as any} session={session} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="CommunitiesTab" options={{ title: "Communities", tabBarLabel: "Community" }}>
        {(props) => <CommunitiesScreen {...props as any} accessToken={session.accessToken} userEmail={session.user.email} />}
      </Tab.Screen>
      <Tab.Screen name="DivyaDesamTab" options={{ title: "Divya Desams", tabBarLabel: "DivyaDesam" }}>
        {(props) => <DivyaDesamsExplorerScreen {...props as any} session={session} />}
      </Tab.Screen>
      <Tab.Screen name="SettingsTab" options={{ title: "Settings", tabBarLabel: "Settings" }}>
        {(props) => <SettingsScreen {...props as any} session={session} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export function AppNavigator({ session, onLogout }: Props) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: "#D13B3B",
        headerTitleStyle: { fontWeight: "600" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
        {(props) => <MainTabs {...props} session={session} onLogout={onLogout} />}
      </Stack.Screen>

      <Stack.Screen name="CreateSpace" options={{ title: "New space" }}>
        {(props) => <CreateSpaceScreen {...props} accessToken={session.accessToken} />}
      </Stack.Screen>
      <Stack.Screen name="Friends" options={{ title: "Friends" }}>
        {(props) => <FriendsScreen {...props} accessToken={session.accessToken} />}
      </Stack.Screen>
      <Stack.Screen
        name="NestDetail"
        options={({ route }) => ({ title: route.params.name })}
      >
        {(props) => (
          <NestDetailScreen
            {...props}
            accessToken={session.accessToken}
            userEmail={session.user.email}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="DivyaDesamDetail"
        options={({ route }) => ({ title: route.params.name })}
      >
        {(props) => <DivyaDesamDetailScreen {...props} session={session} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
