export type RootStackParamList = {
  Home: undefined;
  Friends: undefined;
  Communities: undefined;
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
};
