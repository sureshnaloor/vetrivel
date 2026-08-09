import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabsParamList = {
  HomeTab: undefined;
  CommunitiesTab: undefined;
  DivyaDesamTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
  Friends: undefined;
  CreateSpace: undefined;
  NestDetail: {
    locationId: string;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
    ownerName?: string;
    isFriendNest?: boolean;
  };
  DivyaDesamDetail: {
    id: string;
    name: string;
  };
};
