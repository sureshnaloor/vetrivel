import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { fetchLocations, type UserLocation } from '../services/locations';
import { getDistanceKm, getSpaceMatchDistanceKm, normalizeDocumentId, normalizeLatLng } from '../lib/geo';

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
// No hardcoded fallback — coordinates stay null until GPS resolves or user picks a space
const SPACE_MATCH_DISTANCE_KM = getSpaceMatchDistanceKm();

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
        coordinates: null,
        address: 'Location unavailable'
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
          coordinates: null,
          address: 'Location unavailable'
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
    console.log('[LocationContext] selectLocation called with id:', id);
    setState(prev => {
      const newState = { ...prev, activeLocationId: id };
      if (id) {
        localStorage.setItem('activeLocationId', id);
        const loc = prev.savedLocations.find(
          (l) => normalizeDocumentId(l._id as unknown) === String(id)
        );
        console.log('[LocationContext] selectLocation found loc from savedLocations:', !!loc, loc?.name, 'with raw coords:', loc?.coordinates);
        if (loc) {
          const coords = normalizeLatLng(loc.coordinates as unknown) ?? (loc.coordinates as Coordinates);
          console.log('[LocationContext] Setting new state coordinates to:', coords);
          return {
            ...newState,
            type: 'planned',
            coordinates: coords,
            address: loc.name,
            isLoading: false
          };
        } else {
           console.warn('[LocationContext] loc not found for id:', id);
        }
      } else {
        localStorage.removeItem('activeLocationId');
      }
      return newState;
    });
  };

  useEffect(() => {
    if (!state.coordinates || state.savedLocations.length === 0) return;

    // Only auto-select a nearby space if we are relying on the user's physical GPS location.
    // If the user explicitly clicked a space ('planned'), do not aggressively override it.
    if (state.type === 'current') {
      const userCoords = normalizeLatLng(state.coordinates as unknown);
      if (!userCoords) return;

      const nearest = state.savedLocations.reduce<{ id: string | null; distance: number }>(
        (acc, loc) => {
          const locId = normalizeDocumentId(loc._id as unknown);
          if (!locId) return acc;
          const lc = normalizeLatLng(loc.coordinates as unknown);
          if (!lc) return acc;
          const distance = getDistanceKm(userCoords, lc);
          if (distance < acc.distance) {
            return { id: locId, distance };
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

      if (state.activeLocationId) {
        selectLocation(null);
      }
    }
  }, [state.coordinates, state.savedLocations, state.type]);

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
