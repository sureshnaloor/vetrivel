export type RootStackParamList = {
  Home: undefined;
  NestDetail: {
    locationId: string;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
  };
};
