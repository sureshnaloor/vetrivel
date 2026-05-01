import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { MobileAuthSession } from "../auth";
import { HomeScreen } from "../screens/HomeScreen";
import { NestDetailScreen } from "../screens/NestDetailScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

type Props = {
  session: MobileAuthSession;
  onLogout: () => Promise<void> | void;
};

export function AppNavigator({ session, onLogout }: Props) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: "#D13B3B",
        headerTitleStyle: { fontWeight: "600" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Home" options={{ title: "My spaces" }}>
        {(props) => (
          <HomeScreen {...props} session={session} onLogout={onLogout} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="NestDetail"
        options={({ route }) => ({ title: route.params.name })}
      >
        {(props) => <NestDetailScreen {...props} accessToken={session.accessToken} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
