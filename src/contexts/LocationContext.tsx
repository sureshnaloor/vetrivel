import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { fetchLocations, type UserLocation } from '../services/locations';

export type LocationType = 'current' | 'planned';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationState {
  type: LocationType;
  coordinates: Coordinates | null;
  address: string | null;
  isLoading: boolean;
  error: string | null;
  savedLocations: UserLocation[];
  activeLocationId: string | null;
}

interface LocationContextType extends LocationState {
  setLocation: (type: LocationType, coords: Coordinates, address?: string) => void;
  requestCurrentLocation: () => void;
  refreshLocations: () => Promise<void>;
  selectLocation: (id: string | null) => void;
  isLoaded: boolean;
  loadError: Error | undefined;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ['places'];
const DEFAULT_COORDS: Coordinates = { lat: 25.3109, lng: 83.0076 };
const SPACE_MATCH_DISTANCE_KM = (() => {
  const rawValue = import.meta.env.VITE_SPACE_MATCH_DISTANCE_KM;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
})();

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceKm = (a: Coordinates, b: Coordinates): number => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthRadiusKm * c;
};

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>({
    type: 'current',
    coordinates: null,
    address: null,
    isLoading: true,
    error: null,
    savedLocations: [],
    activeLocationId: localStorage.getItem('activeLocationId') || null,
  });

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const requestCurrentLocation = () => {
    localStorage.removeItem('activeLocationId');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        type: 'current',
        activeLocationId: null,
        isLoading: false,
        error: 'Geolocation is not supported by your browser',
        coordinates: DEFAULT_COORDS,
        address: 'Varanasi (Default)'
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          type: 'current',
          activeLocationId: null,
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          address: 'Current Location',
          isLoading: false,
          error: null,
        }));
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setState(prev => ({
          ...prev,
          type: 'current',
          activeLocationId: null,
          isLoading: false,
          error: 'Unable to retrieve your location',
          coordinates: DEFAULT_COORDS,
          address: 'Varanasi (Default)'
        }));
      },
      { timeout: 10000 }
    );
  };

  const refreshLocations = async () => {
    try {
      const locations = await fetchLocations();
      setState(prev => ({ ...prev, savedLocations: locations }));
    } catch (e) {
      console.error('Failed to fetch saved locations', e);
    }
  };

  const selectLocation = (id: string | null) => {
    setState(prev => {
      const newState = { ...prev, activeLocationId: id };
      if (id) {
        localStorage.setItem('activeLocationId', id);
        const loc = prev.savedLocations.find(l => l._id === id);
        if (loc) {
          return {
            ...newState,
            type: 'planned',
            coordinates: loc.coordinates,
            address: loc.name,
            isLoading: false
          };
        }
      } else {
        localStorage.removeItem('activeLocationId');
      }
      return newState;
    });
  };

  useEffect(() => {
    if (!state.coordinates || state.savedLocations.length === 0) return;

    const nearest = state.savedLocations.reduce<{ id: string | null; distance: number }>(
      (acc, loc) => {
        if (!loc._id) return acc;
        const distance = getDistanceKm(state.coordinates as Coordinates, loc.coordinates);
        if (distance < acc.distance) {
          return { id: loc._id, distance };
        }
        return acc;
      },
      { id: null, distance: Number.POSITIVE_INFINITY }
    );

    if (nearest.id && nearest.distance <= SPACE_MATCH_DISTANCE_KM) {
      if (state.activeLocationId !== nearest.id) {
        selectLocation(nearest.id);
      }
      return;
    }

    if (state.type === 'current' && state.activeLocationId) {
      selectLocation(null);
    }
  }, [state.coordinates, state.savedLocations]);

  useEffect(() => {
    requestCurrentLocation();
    refreshLocations();
  }, []);

  const setLocation = (type: LocationType, coords: Coordinates, address?: string) => {
    setState(prev => ({
      ...prev,
      type,
      coordinates: coords,
      address: address || null,
      isLoading: false,
      error: null,
    }));
  };

  return (
    <LocationContext.Provider value={{ ...state, setLocation, requestCurrentLocation, refreshLocations, selectLocation, isLoaded, loadError }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
