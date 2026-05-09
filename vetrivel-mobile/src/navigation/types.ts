export type RootStackParamList = {
  Home: undefined;
  CreateSpace: undefined;
  NestDetail: {
    locationId: string;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
  };
};
