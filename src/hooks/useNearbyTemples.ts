import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { fetchPlaces, type UserPlace } from '../services/places';
import { fetchLists, type DivyaDesamList, type TempleListItem } from '../services/divyadesam';

export interface NearbyTempleSuggestion {
  placeId: string;
  name: string;
  coordinates: { lat: number, lng: number };
  distanceText: string;
  journeyTimeMins: number;
  insideTimeMins: number;
  isOpen: boolean;
  closingWarning?: string;
  source: 'nest' | 'interest' | 'list';
  listName?: string;
}

export function useNearbyTemples(radiusKm = 20) {
  const { coordinates, isLoaded, activeLocationId } = useLocation();
  const [suggestions, setSuggestions] = useState<NearbyTempleSuggestion[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // To avoid hammering APIs, we cache estimates and track last location.
  const lastCheckedLoc = useRef<{lat: number, lng: number} | null>(null);

  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getTempleEstimate = async (name: string): Promise<number> => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/temple-estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templeName: name }),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        return data.insideTimeMins || 45;
      }
    } catch (e) {
      console.error(e);
    }
    return 45; // fallback
  };

  const checkTempleTimings = (placeId: string): Promise<{ isOpen: boolean, warning?: string }> => {
    return new Promise((resolve) => {
      if (!window.google?.maps?.places) {
        return resolve(fallbackTimingsCheck());
      }
      
      const mapDiv = document.createElement('div');
      const service = new google.maps.places.PlacesService(mapDiv);
      
      service.getDetails({
        placeId,
        fields: ['opening_hours']
      }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.opening_hours) {
          const isOpen = place.opening_hours.isOpen() ?? true;
          resolve({ isOpen, warning: isOpen ? undefined : 'Currently closed according to Google Maps.' });
        } else {
          resolve(fallbackTimingsCheck());
        }
      });
    });
  };

  const fallbackTimingsCheck = () => {
    // General guideline: Closed noon (12:00) to 4 PM (16:00), and after 9 PM (21:00) to 6 AM
    const now = new Date();
    const hours = now.getHours();
    
    if (hours >= 12 && hours < 16) {
      return { isOpen: false, warning: 'Usually closed between 12 PM and 4 PM.' };
    }
    if (hours >= 21 || hours < 6) {
      return { isOpen: false, warning: 'Usually closed at night (9 PM to 6 AM).' };
    }
    
    // Check if it's close to closing time
    if (hours === 11) {
      return { isOpen: true, warning: 'Closes soon (around 12 PM).' };
    }
    if (hours === 20) {
      return { isOpen: true, warning: 'Closes soon (around 9 PM).' };
    }
    
    return { isOpen: true };
  };

  const checkSuggestions = useCallback(async () => {
    if (!coordinates || !isLoaded) return;
    
    // Throttle checks if moved less than 1km
    if (lastCheckedLoc.current) {
      const d = calculateDistanceKm(
        coordinates.lat, coordinates.lng,
        lastCheckedLoc.current.lat, lastCheckedLoc.current.lng
      );
      if (d < 1) return; // Moved less than 1km, ignore
    }
    
    setIsCalculating(true);
    lastCheckedLoc.current = coordinates;

    try {
      // Fetch all sources
      const [places, lists] = await Promise.all([
        fetchPlaces(undefined, true), // Fetch ALL places across all locations
        fetchLists()
      ]);

      const candidates = new Map<string, any>(); // placeId -> Candidate

      // Add places
      places.forEach((p: UserPlace) => {
        if (p.placeId && p.status !== 'visited') {
          candidates.set(p.placeId, {
            placeId: p.placeId,
            name: p.name,
            coordinates: p.coordinates,
            source: p.category, // 'nest' | 'interest'
          });
        }
      });

      // Add list temples
      lists.forEach((list: DivyaDesamList) => {
        list.temples.forEach((t: TempleListItem) => {
          if (!candidates.has(t.placeId)) {
            candidates.set(t.placeId, {
              placeId: t.placeId,
              name: t.name,
              coordinates: t.coordinates,
              source: 'list',
              listName: list.name
            });
          }
        });
      });

      // Filter by strict Haversine radius
      const nearbyCandidates = Array.from(candidates.values()).filter(c => {
        const d = calculateDistanceKm(coordinates.lat, coordinates.lng, c.coordinates.lat, c.coordinates.lng);
        return d <= radiusKm;
      }).slice(0, 5); // Limit to top 5 to avoid hammering Matrix API

      if (nearbyCandidates.length === 0) {
        setSuggestions([]);
        setIsCalculating(false);
        return;
      }

      // Calculate driving distance via DistanceMatrix
      const service = new google.maps.DistanceMatrixService();
      const destinations = nearbyCandidates.map(c => new google.maps.LatLng(c.coordinates.lat, c.coordinates.lng));
      
      service.getDistanceMatrix({
        origins: [new google.maps.LatLng(coordinates.lat, coordinates.lng)],
        destinations,
        travelMode: google.maps.TravelMode.DRIVING,
      }, async (response, status) => {
        if (status !== 'OK' || !response) {
          setIsCalculating(false);
          return;
        }

        const results = response.rows[0].elements;
        const finalSuggestions: NearbyTempleSuggestion[] = [];

        for (let i = 0; i < nearbyCandidates.length; i++) {
          const res = results[i];
          if (res.status === 'OK') {
            const journeyMins = Math.round(res.duration.value / 60);
            const candidate = nearbyCandidates[i];
            
            // Check timings & AI estimate
            const timing = await checkTempleTimings(candidate.placeId);
            const insideMins = await getTempleEstimate(candidate.name);

            finalSuggestions.push({
              ...candidate,
              distanceText: res.distance.text,
              journeyTimeMins: journeyMins,
              insideTimeMins: insideMins,
              isOpen: timing.isOpen,
              closingWarning: timing.warning
            });
          }
        }
        
        // Sort by journey time
        finalSuggestions.sort((a, b) => a.journeyTimeMins - b.journeyTimeMins);
        setSuggestions(finalSuggestions);
        setIsCalculating(false);
      });

    } catch (e) {
      console.error('Error fetching nearby temples:', e);
      setIsCalculating(false);
    }
  }, [coordinates, isLoaded, radiusKm, activeLocationId]);

  useEffect(() => {
    checkSuggestions();
  }, [checkSuggestions]);

  return { suggestions, isCalculating, refresh: checkSuggestions };
}
