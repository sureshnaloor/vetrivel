import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useLocation } from '../../contexts/LocationContext';
import { MapPin, Navigation, Loader2, ChevronLeft, ChevronRight, House, Sparkles, Trash2 } from 'lucide-react';
import { GoogleMap, OverlayView } from '@react-google-maps/api';
import { fetchPlaces, savePlace, updatePlace, deletePlace, type UserPlace, fetchCustomTemples, createCustomTemple, type CustomTemple } from '../../services/places';
import { saveLocation } from '../../services/locations';
import { useAuth } from '../../hooks/useAuth';

const MAP_STYLES = [
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] }
];

// Canvas-based Marker Generator (PNG Data URIs)
const createMarkerPng = (color: string, type: 'circle' | 'check' | 'sparkle' = 'circle'): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 64; // High DPI
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Clear
  ctx.clearRect(0, 0, 64, 64);

  // Pin Path (translated to 64x64 from 24x24)
  // Scale factor: 64/24 = 2.66
  ctx.save();
  ctx.scale(2.6, 2.6);
  ctx.translate(0.5, 0.5);

  // Draw Pin Body
  ctx.beginPath();
  // Path: M12 21C16 17 20 13 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 13 8 17 12 21Z
  ctx.moveTo(12, 21);
  ctx.bezierCurveTo(16, 17, 20, 13, 20, 9);
  ctx.bezierCurveTo(20, 4.58, 16.42, 1, 12, 1);
  ctx.bezierCurveTo(7.58, 1, 4, 4.58, 4, 9);
  ctx.bezierCurveTo(4, 13, 8, 17, 12, 21);
  ctx.closePath();
  
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw Inner Content
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'circle') {
    ctx.beginPath();
    ctx.arc(12, 9, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'check') {
    ctx.beginPath();
    ctx.moveTo(9, 9);
    ctx.lineTo(11, 11);
    ctx.lineTo(15, 7);
    ctx.stroke();
  } else if (type === 'sparkle') {
    ctx.beginPath();
    ctx.moveTo(12, 6);
    ctx.lineTo(13, 8);
    ctx.lineTo(15, 9);
    ctx.lineTo(13, 10);
    ctx.lineTo(12, 12);
    ctx.lineTo(11, 10);
    ctx.lineTo(9, 9);
    ctx.lineTo(11, 8);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
  return canvas.toDataURL('image/png');
};

const ICON_TYPES = {
  NEARBY: { color: '#D13B3B', type: 'circle' },
  NEST: { color: '#0D9488', type: 'circle' }, // Updated to Teal
  VISITED: { color: '#22c55e', type: 'check' },
  INTEREST: { color: '#f97316', type: 'circle' },
  WISHLIST: { color: '#3b82f6', type: 'sparkle' },
  CUSTOM: { color: '#a855f7', type: 'circle' },
} as const;

export default function CenterColumn() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { coordinates, isLoaded, type: locType, address, savedLocations, activeLocationId, refreshLocations, selectLocation } = useLocation();
  const [temples, setTemples] = useState<google.maps.places.PlaceResult[]>([]);
  const [userPlaces, setUserPlaces] = useState<UserPlace[]>([]);
  const [customTemples, setCustomTemples] = useState<CustomTemple[]>([]);
  const [loadingTemples, setLoadingTemples] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, lat: number, lng: number, placeId?: string, placeName?: string, isEmptyCoordinate?: boolean } | null>(null);
  const [isCustomTempleModalOpen, setIsCustomTempleModalOpen] = useState(false);
  const [customTempleName, setCustomTempleName] = useState('');
  
  // Feed Scroll Tracking
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [selectedTwinkleId, setSelectedTwinkleId] = useState<string | null>(null);
  const [iconUrls, setIconUrls] = useState<Record<string, string>>({});
  const { session } = useAuth();
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<
    | { type: 'suggested'; temple: google.maps.places.PlaceResult; category: 'nest' | 'interest' }
    | { type: 'context'; category: 'nest' | 'interest' }
    | null
  >(null);

  // CSS for Marker Animations
  const markerAnimationStyles = `
    @keyframes marker-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-15px); }
    }
    .marker-twinkle {
      animation: marker-bounce 0.6s ease-in-out infinite;
    }
    .custom-marker-shadow {
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    }
  `;

  useEffect(() => {
    const urls: Record<string, string> = {};
    Object.entries(ICON_TYPES).forEach(([key, config]) => {
      urls[key] = createMarkerPng(config.color, config.type as any);
    });
    setIconUrls(urls);
  }, []);

  const updateScrollArrows = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  const handleScrollClick = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { clientWidth } = scrollContainerRef.current;
      const scrollAmount = direction === 'left' ? -(clientWidth - 50) : (clientWidth - 50);
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (session?.user) {
      if (!activeLocationId) {
        setUserPlaces([]);
      } else {
        // Always scope Nest/Interest to active space.
        fetchPlaces(activeLocationId || undefined).then(setUserPlaces).catch(console.error);
      }
      fetchCustomTemples().then(setCustomTemples).catch(console.error);
    }
  }, [session, activeLocationId]);

  const handleMapRightClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng && e.domEvent) {
      const domEvent = e.domEvent as MouseEvent;
      setContextMenu(null);
      setTimeout(() => {
        setContextMenu({
          x: domEvent.clientX,
          y: domEvent.clientY,
          lat: e.latLng!.lat(),
          lng: e.latLng!.lng(),
          isEmptyCoordinate: true // Only allow "Create Custom Temple" here.
        });
      }, 0);
    }
  };

  const handleCustomTempleClick = (e: google.maps.MapMouseEvent, temple: CustomTemple) => {
    e.stop?.();
    setContextMenu(null);
    setTimeout(() => {
      setContextMenu({
        x: (e.domEvent as MouseEvent)?.clientX || window.innerWidth / 2,
        y: (e.domEvent as MouseEvent)?.clientY || window.innerHeight / 2,
        lat: temple.coordinates.lat,
        lng: temple.coordinates.lng,
        placeName: temple.name
        // It has a known name, allowing "Add to Nest" and "Add to Interest"
      });
    }, 0);
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    // Typecast to IconMouseEvent to access placeId
    const iconEvent = e as unknown as google.maps.IconMouseEvent;
    
    if (iconEvent.placeId && e.domEvent && e.latLng) {
      e.stop(); // Prevent default info window popups from Google
      const domEvent = e.domEvent as MouseEvent;
      
      setContextMenu(null);
      setTimeout(() => {
        setContextMenu({
          x: domEvent.clientX,
          y: domEvent.clientY,
          lat: e.latLng!.lat(),
          lng: e.latLng!.lng(),
          placeId: iconEvent.placeId || undefined
        });
      }, 0);
    } else {
      setContextMenu(null);
    }
  };

  const openCreateSpaceFlow = (
    pending: { type: 'suggested'; temple: google.maps.places.PlaceResult; category: 'nest' | 'interest' } | { type: 'context'; category: 'nest' | 'interest' }
  ) => {
    if (savedLocations.length >= 10) {
      alert('You have reached the free plan limit of 10 spaces.');
      return;
    }
    setPendingAssignment(pending);
    setIsCreateSpaceModalOpen(true);
  };

  const persistContextMenuPlace = async (category: 'nest' | 'interest', locationIdOverride?: string) => {
    if (!contextMenu) return;

    let placeName = contextMenu.placeName || `Pinned Location (${contextMenu.lat.toFixed(4)}, ${contextMenu.lng.toFixed(4)})`;

    // Try to get detail based on either placeId click or reverse geocode for a right click
    if (window.google) {
      if (contextMenu.placeId) {
        // We intercepted a default POI click. Use PlacesService to get exact details.
        const mapDiv = document.createElement('div');
        const service = new window.google.maps.places.PlacesService(mapDiv);
        try {
           const details = await new Promise<google.maps.places.PlaceResult | null>((resolve) => {
             service.getDetails({ placeId: contextMenu.placeId! }, (r, s) => {
               if (s === 'OK' && r) resolve(r); else resolve(null);
             });
           });
           if (details && details.name) placeName = details.name;
        } catch(e) { /* ignore */ }
      } else {
        // Reverse geocode fallback
        const geocoder = new window.google.maps.Geocoder();
        try {
          const res = await geocoder.geocode({ location: { lat: contextMenu.lat, lng: contextMenu.lng } });
          if (res.results && res.results[0]) {
            placeName = res.results[0].formatted_address.split(',')[0] || placeName;
          }
        } catch (e) { /* fallback to coords */ }
      }
    }

    try {
      const saved = await savePlace({
        name: placeName,
        coordinates: { lat: contextMenu.lat, lng: contextMenu.lng },
        category,
        status: 'planned',
        locationId: locationIdOverride || activeLocationId || undefined
      });
      setUserPlaces(prev => {
        const filtered = prev.filter(p => p._id !== saved._id);
        return [...filtered, saved];
      });
    } catch (e) {
      console.error('Failed to save place', e);
    }
    
    setContextMenu(null);
  };

  const handleSaveLocation = async (category: 'nest' | 'interest') => {
    if (!activeLocationId) {
      openCreateSpaceFlow({ type: 'context', category });
      return;
    }
    await persistContextMenuPlace(category);
  };

  const persistSuggestedPlace = async (
    temple: google.maps.places.PlaceResult,
    category: 'nest' | 'interest',
    locationIdOverride?: string
  ) => {
    const lat = temple.geometry?.location?.lat();
    const lng = temple.geometry?.location?.lng();
    if (!lat || !lng) return;

    try {
      const saved = await savePlace({
        name: temple.name || 'Unknown Temple',
        coordinates: { lat, lng },
        category,
        status: 'planned',
        placeId: temple.place_id,
        locationId: locationIdOverride || activeLocationId || undefined
      });
      setUserPlaces(prev => {
        const filtered = prev.filter(p => p._id !== saved._id);
        return [...filtered, saved];
      });
    } catch (e) {
      console.error('Failed to save suggested place', e);
    }
  };

  const handleSaveSuggestedPlace = async (temple: google.maps.places.PlaceResult, category: 'nest' | 'interest') => {
    if (!activeLocationId) {
      openCreateSpaceFlow({ type: 'suggested', temple, category });
      return;
    }
    await persistSuggestedPlace(temple, category);
  };

  const handleMovePlaceCategory = async (place: UserPlace, targetCategory: 'nest' | 'interest') => {
    if (!place._id) return;
    try {
      const updated = await updatePlace(place._id, { category: targetCategory });
      setUserPlaces(prev => prev.map(p => (p._id === place._id ? { ...p, ...updated } : p)));
    } catch (e) {
      console.error('Failed to move place category', e);
    }
  };

  const handleRemovePlace = async (place: UserPlace) => {
    if (!place._id) return;
    try {
      const ok = await deletePlace(place._id);
      if (ok) {
        setUserPlaces(prev => prev.filter(p => p._id !== place._id));
      }
    } catch (e) {
      console.error('Failed to remove place', e);
    }
  };

  const handleCreateSpaceAndContinue = async () => {
    if (!spaceName.trim() || !coordinates || !pendingAssignment) return;
    setIsCreatingSpace(true);
    try {
      const savedSpace = await saveLocation({
        name: spaceName.trim(),
        coordinates,
        address: address || ''
      });
      await refreshLocations();
      const newSpaceId = savedSpace._id || null;
      selectLocation(newSpaceId);

      if (newSpaceId) {
        if (pendingAssignment.type === 'suggested') {
          await persistSuggestedPlace(pendingAssignment.temple, pendingAssignment.category, newSpaceId);
        } else {
          await persistContextMenuPlace(pendingAssignment.category, newSpaceId);
        }
      }
      setPendingAssignment(null);
      setSpaceName('');
      setIsCreateSpaceModalOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create space';
      alert(message);
    } finally {
      setIsCreatingSpace(false);
    }
  };

  const submitCustomTemple = async () => {
    if (!contextMenu || !customTempleName.trim()) return;
    
    try {
      const saved = await createCustomTemple({
         name: customTempleName.trim(),
         coordinates: { lat: contextMenu.lat, lng: contextMenu.lng }
      });
      setCustomTemples((prev: CustomTemple[]) => [...prev, saved]);
    } catch (e) {
      console.error('Failed to submit custom temple', e);
    }
    setCustomTempleName('');
    setIsCustomTempleModalOpen(false);
    setContextMenu(null);
  };

  useEffect(() => {
    if (!isLoaded || !coordinates) return;
    
    setLoadingTemples(true);
    // Needed for PlacesService
    const mapDiv = document.createElement('div');
    const service = new window.google.maps.places.PlacesService(mapDiv);
    
    const request = {
      location: new window.google.maps.LatLng(coordinates.lat, coordinates.lng),
      radius: 50000, // Search up to 50km (API max limit)
      type: 'hindu_temple'
    };

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        // Filter out non-temples or generic locations heavily if needed, but 'hindu_temple' type usually works well
        setTemples(results.slice(0, 6)); // Show top 6
      } else {
        setTemples([]);
      }
      setLoadingTemples(false);
    });
  }, [isLoaded, coordinates]);

  return (
    <div className={`flex flex-col gap-6 pb-24 ${isDark ? 'text-white' : 'text-[#141414]'}`}>
      
      {/* AI-Powered Nearby Card */}
      <div className={`p-6 rounded-2xl border overflow-hidden relative ${isDark ? 'bg-gradient-to-br from-[#1c1815] to-[#131418] border-[#D13B3B]/20' : 'bg-gradient-to-br from-[#fffaf4] to-[#fcfcfc] border-[#D13B3B]/20 shadow-sm'}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D13B3B]/5 rounded-bl-full -z-10"></div>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              {locType === 'current' ? (
                <Navigation className="w-5 h-5 text-[#D13B3B]" />
              ) : (
                <MapPin className="w-5 h-5 text-[#D13B3B]" />
              )}
              {locType === 'current' ? 'Near You' : 'Around'}
            </h2>
          </div>

          <div className="px-3 py-1 rounded-full text-[10px] font-medium tracking-wider uppercase bg-[#D13B3B]/10 text-[#D13B3B] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D13B3B] animate-pulse"></span>
            AI Suggested
          </div>
        </div>

        {loadingTemples ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-[#D13B3B]" />
          </div>
        ) : (
          <div className="relative group overflow-visible">
            {showLeftArrow && (
              <button 
                onClick={() => handleScrollClick('left')}
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full shadow-lg border flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100
                ${isDark ? 'bg-[#1a1b20] border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}
              >
                <ChevronLeft className="w-5 h-5 ml-0.5" />
              </button>
            )}
            
            <div 
              ref={scrollContainerRef}
              onScroll={updateScrollArrows}
              className="flex gap-4 overflow-x-auto pb-4 overscroll-x-contain snap-x snap-mandatory"
              style={{ paddingBottom: '16px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style>{`.overflow-x-auto::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }`}</style>
              {temples.length > 0 ? (
                temples.map((temple, idx) => (
                  <div 
                    key={idx} 
                    className={`min-w-[240px] max-w-[240px] p-4 rounded-xl border flex-shrink-0 cursor-pointer transition-transform hover:-translate-y-1 snap-start ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5]'} ${selectedTwinkleId === temple.place_id ? 'ring-2 ring-[#D13B3B]' : ''}`}
                    onClick={() => setSelectedTwinkleId(prev => prev === temple.place_id ? null : (temple.place_id || null))}
                  >
                    <h3 className="font-semibold mb-1 truncate" title={temple.name}>{temple.name}</h3>
                    <p className={`text-xs flex items-start gap-1 mb-3 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'} line-clamp-2 min-h-[32px]`}>
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /> {temple.vicinity}
                    </p>
                    <div className={`p-2 rounded-lg text-xs flex items-center justify-between gap-2 mb-1 ${isDark ? 'bg-white/5' : 'bg-[#F4F1EA]'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="mt-0.5 flex-shrink-0">⭐</span>
                        <span>{temple.rating ? `${temple.rating} Rating` : 'New'}</span>
                        {temple.user_ratings_total && <span className="opacity-50">({temple.user_ratings_total})</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSaveSuggestedPlace(temple, 'nest'); }}
                          aria-label="Add to Nest"
                          title="Add to Nest"
                          className={`w-6 h-6 rounded-md border transition-colors flex items-center justify-center ${isDark ? 'bg-[#0D9488]/10 border-[#0D9488]/30 text-[#2DD4BF] hover:bg-[#0D9488]/20' : 'bg-[#0D9488]/5 border-[#0D9488]/20 text-[#0D9488] hover:bg-[#0D9488]/10'}`}
                        >
                          <House className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSaveSuggestedPlace(temple, 'interest'); }}
                          aria-label="Add as Interest"
                          title="Add as Interest"
                          className={`w-6 h-6 rounded-md border transition-colors flex items-center justify-center ${isDark ? 'bg-blue-400/10 border-blue-400/30 text-blue-300 hover:bg-blue-400/20' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'}`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`w-full p-8 rounded-xl text-center flex flex-col items-center justify-center gap-2 border ${isDark ? 'bg-[#131418] border-white/10 text-white/60' : 'bg-[#fffaf4] border-[#e5e5e5] text-[#141414]/60'}`}>
                  <MapPin className="w-8 h-8 opacity-50 mb-2" />
                  <p className="font-medium text-base">No temples found nearby</p>
                  <p className="text-xs max-w-sm">
                    We couldn't find any Hindu Temples within a 50km radius of your {locType === 'current' ? 'current' : 'planned'} location.
                  </p>
                </div>
              )}
            </div>

            {showRightArrow && temples.length > 0 && (
              <button 
                onClick={() => handleScrollClick('right')}
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full shadow-lg border flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100
                ${isDark ? 'bg-[#1a1b20] border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}
              >
                <ChevronRight className="w-5 h-5 mr-0.5" />
              </button>
            )}
          </div>
        )}

        {/* Embedded Persistent Map */}
        {isLoaded && (
          <div className={`mt-6 rounded-xl overflow-hidden shadow-sm border h-[340px] relative z-0 flex-shrink-0 ${isDark ? 'border-white/10' : 'border-[#e5e5e5]'}`}>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={coordinates || { lat: 25.3109, lng: 83.0076 }}
              zoom={13}
              onRightClick={handleMapRightClick}
              onClick={handleMapClick}
              options={{
                styles: MAP_STYLES,
                disableDefaultUI: true,
                zoomControl: true,
                gestureHandling: 'cooperative' // Allows scrolling page past map
              }}
            >
              <style>{markerAnimationStyles}</style>
              {/* Render dynamic temples as pins */}
              {temples.map((temple, idx) => {
                const lat = temple.geometry?.location?.lat();
                const lng = temple.geometry?.location?.lng();
                if (!lat || !lng) return null;
                const isSelected = selectedTwinkleId === temple.place_id;
                
                return (
                  <OverlayView
                    key={`temple-pin-${idx}`}
                    position={{ lat, lng }}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  >
                    <div 
                      className={`relative -translate-x-1/2 -translate-y-full cursor-pointer transition-transform hover:scale-110 ${isSelected ? 'marker-twinkle' : ''}`}
                      title={temple.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTwinkleId((prev: string | null) => prev === temple.place_id ? null : (temple.place_id || null));
                      }}
                    >
                      {iconUrls.NEARBY && (
                        <img 
                          src={iconUrls.NEARBY} 
                          className="w-8 h-8 custom-marker-shadow" 
                          alt="" 
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                    </div>
                  </OverlayView>
                )
              })}

              {/* Render Saved User Places */}
              {userPlaces.map((place, idx) => {
                let iconKey = 'NEST';
                if (place.status === 'visited') iconKey = 'VISITED';
                if (place.status === 'recommended' || place.status === 'wishlist') iconKey = 'WISHLIST';
                if (place.category === 'interest' || place.status === 'place of interest') iconKey = 'INTEREST';
                const isSelected = selectedTwinkleId === place._id;
                
                return (
                  <OverlayView
                    key={`user-place-${idx}`}
                    position={place.coordinates}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  >
                    <div 
                      className={`relative -translate-x-1/2 -translate-y-full cursor-pointer transition-transform hover:scale-110 ${isSelected ? 'marker-twinkle' : ''}`}
                      title={place.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTwinkleId((prev: string | null) => prev === place._id ? null : (place._id || place.name || null));
                      }}
                    >
                      {iconUrls[iconKey] && (
                        <img 
                          src={iconUrls[iconKey]} 
                          className="w-9 h-9 custom-marker-shadow" 
                          alt="" 
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                    </div>
                  </OverlayView>
                )
              })}

              {/* Render Crowd Sourced Custom Temples */}
              {customTemples.map((temple, idx) => {
                const isSelected = selectedTwinkleId === temple._id;
                return (
                  <OverlayView
                    key={`custom-temple-${idx}`}
                    position={temple.coordinates}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  >
                    <div 
                      className={`relative -translate-x-1/2 -translate-y-full cursor-pointer transition-transform hover:scale-110 ${isSelected ? 'marker-twinkle' : ''}`}
                      title={temple.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Support both menu and twinkle? Or just twinkle for now as requested.
                        setSelectedTwinkleId((prev: string | null) => prev === temple._id ? null : (temple._id || null));
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        handleCustomTempleClick({ latLng: new google.maps.LatLng(temple.coordinates), domEvent: e } as any, temple);
                      }}
                    >
                      {iconUrls.CUSTOM && (
                        <img 
                          src={iconUrls.CUSTOM} 
                          className="w-8 h-8 custom-marker-shadow" 
                          alt="" 
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                    </div>
                  </OverlayView>
                );
              })}
            </GoogleMap>
          </div>
        )}
      </div>

      {/* Context Menu Overlay */}
      {contextMenu && (
         <>
           <div className="fixed inset-0 z-[99]" onClick={() => setContextMenu(null)} />
           <div 
             className="fixed z-[100] bg-white dark:bg-[#131418] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl p-1.5 w-48 text-sm transform transition-all"
             style={{ top: Math.min(contextMenu.y, window.innerHeight - 150), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
           >
              <div className={`font-semibold px-3 py-2 border-b mb-1 text-xs uppercase tracking-wider ${isDark ? 'border-white/10 text-white/50' : 'border-black/5 text-black/50'}`}>
                {contextMenu.isEmptyCoordinate ? 'Unknown Mapping' : 'Save Location'}
              </div>
              
              {!contextMenu.isEmptyCoordinate && (
                <>
                  <button 
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${isDark ? 'hover:bg-white/10 text-[#f97316]' : 'hover:bg-black/5 text-[#f97316]'}`} 
                    onClick={() => handleSaveLocation('nest')}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" /> Add to Nest
                  </button>
                  <button 
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${isDark ? 'hover:bg-white/10 text-blue-400' : 'hover:bg-black/5 text-blue-500'}`} 
                    onClick={() => handleSaveLocation('interest')}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Temple of Interest
                  </button>
                </>
              )}

              {/* If empty coordinate, only offer custom creation */}
              {contextMenu.isEmptyCoordinate && (
                <button 
                  className={`w-full mt-1 border-t text-left px-3 py-2 rounded-b-lg transition-colors flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${isDark ? 'border-white/10 hover:bg-white/10 text-purple-400' : 'border-black/5 hover:bg-black/5 text-purple-600'}`} 
                  onClick={() => setIsCustomTempleModalOpen(true)}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Create Custom Temple
                </button>
              )}
           </div>
         </>
      )}

      {/* Custom Temple Modal Overlay */}
      {isCustomTempleModalOpen && (
         <>
           <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" onClick={() => setIsCustomTempleModalOpen(false)} />
           <div className={`fixed z-[120] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm p-6 rounded-2xl shadow-2xl border ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5]'}`}>
             <h3 className="font-display text-xl font-semibold mb-2">Create Custom Temple</h3>
             <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>Suggest a spiritual location to accurately crowd-source unmapped temples for the global community.</p>
             <input 
               type="text" 
               placeholder="Temple Name" 
               className={`w-full p-3 rounded-lg border outline-none mb-4 ${isDark ? 'bg-black/20 border-white/20 text-white' : 'bg-white border-black/20 text-black'}`}
               value={customTempleName}
               onChange={(e) => setCustomTempleName(e.target.value)}
             />
             <div className="flex justify-end gap-3">
               <button className="px-4 py-2 rounded-lg font-medium text-sm transition-colors opacity-70 hover:opacity-100" onClick={() => setIsCustomTempleModalOpen(false)}>Cancel</button>
               <button className="px-4 py-2 rounded-lg font-medium text-sm transition-colors bg-purple-500 text-white hover:bg-purple-600" onClick={submitCustomTemple}>Submit to DB</button>
             </div>
           </div>
         </>
      )}

      {/* Create Space Modal Overlay */}
      {isCreateSpaceModalOpen && (
        <>
          <div
            className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (isCreatingSpace) return;
              setIsCreateSpaceModalOpen(false);
              setPendingAssignment(null);
            }}
          />
          <div className={`fixed z-[140] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm p-6 rounded-2xl shadow-2xl border ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5]'}`}>
            <h3 className="font-display text-xl font-semibold mb-2">Name this space</h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
              Save this explored location as a space before adding temples. Free plan supports up to 10 spaces.
            </p>
            <input
              type="text"
              placeholder="e.g. Varanasi Pilgrimage"
              className={`w-full p-3 rounded-lg border outline-none mb-4 ${isDark ? 'bg-black/20 border-white/20 text-white' : 'bg-white border-black/20 text-black'}`}
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg font-medium text-sm transition-colors opacity-70 hover:opacity-100 disabled:opacity-50"
                onClick={() => {
                  if (isCreatingSpace) return;
                  setIsCreateSpaceModalOpen(false);
                  setPendingAssignment(null);
                }}
                disabled={isCreatingSpace}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg font-medium text-sm transition-colors bg-[#0D9488] text-white hover:bg-[#09917d] disabled:opacity-50"
                onClick={handleCreateSpaceAndContinue}
                disabled={isCreatingSpace || !spaceName.trim()}
              >
                {isCreatingSpace ? 'Creating...' : 'Create Space'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Active Nest Grid */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-semibold">Active Nest</h2>
          {activeLocationId && (
             <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-[#0D9488]/20 text-[#2DD4BF]' : 'bg-[#0D9488]/10 text-[#0D9488]'}`}>
               {savedLocations.find(l => l._id === activeLocationId)?.name || 'Sacred Space'}
             </span>
          )}
        </div>
        <button className={`text-sm hover:underline ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>View Map</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {userPlaces.filter(p => p.category === 'nest').length > 0 ? (
          userPlaces.filter(p => p.category === 'nest').map((place, i) => (
            <div 
               key={i} 
               className={`p-5 rounded-2xl border flex flex-col justify-between min-h-[160px] cursor-pointer transition-transform hover:-translate-y-1 ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'} ${selectedTwinkleId === place._id ? 'ring-2 ring-[#0D9488]' : ''}`}
               onClick={() => setSelectedTwinkleId((prev: string | null) => prev === place._id ? null : (place._id || place.name || null))}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  {place.status === 'visited' ? (
                     <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium bg-green-500/10 text-green-600 dark:text-green-400`}>✓ Visited</span>
                  ) : place.status === 'planned' ? (
                     <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>📍 Planned</span>
                  ) : (
                     <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-500`}>✨ Suggested</span>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMovePlaceCategory(place, 'interest'); }}
                      aria-label="Move to Temple of Interest"
                      title="Move to Temple of Interest"
                      className={`w-8 h-8 rounded-lg border transition-colors flex items-center justify-center ${isDark ? 'border-blue-400/30 text-blue-300 hover:bg-blue-400/15' : 'border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemovePlace(place); }}
                      aria-label="Remove from Nest"
                      title="Remove from Nest"
                      className={`w-8 h-8 rounded-lg border transition-colors flex items-center justify-center ${isDark ? 'border-red-400/30 text-red-300 hover:bg-red-400/15' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-lg leading-tight line-clamp-2">{place.name}</h3>
              </div>
            </div>
          ))
        ) : (
          <div className={`col-span-1 md:col-span-2 p-6 text-center rounded-2xl border border-dashed ${isDark ? 'border-white/20 bg-white/5 text-white/60' : 'border-black/20 bg-black/5 text-[#6E6A63]'}`}>
            No temples in your active Nest. Right-click on the map or click below to start planning.
          </div>
        )}
      </div>

      {/* Temples of Interest Section */}
      <div className="flex items-center justify-between mt-4">
        <h2 className="font-display text-xl font-semibold">Temples of Interest</h2>
        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-white/10 text-white/60' : 'bg-black/5 text-[#6E6A63]'}`}>From Map</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {userPlaces.filter(p => p.category === 'interest').length > 0 ? (
          userPlaces.filter(p => p.category === 'interest').map((place, i) => (
            <div 
               key={i} 
               className={`p-4 flex items-center gap-4 rounded-xl border cursor-pointer transition-transform hover:-translate-y-1 ${isDark ? 'border-blue-500/20 bg-blue-500/5' : 'border-blue-500/20 bg-blue-50'} ${selectedTwinkleId === place._id ? 'ring-2 ring-blue-500' : ''}`}
               onClick={() => setSelectedTwinkleId((prev: string | null) => prev === place._id ? null : (place._id || place.name || null))}
            >
              <div className={`w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-white text-blue-500 shadow-sm'}`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-sm font-medium leading-tight line-clamp-2 ${isDark ? 'text-white' : 'text-[#141414]'}`}>{place.name}</p>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <span className={`text-[10px] uppercase tracking-wider font-medium text-blue-500`}>Intrigued</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMovePlaceCategory(place, 'nest'); }}
                      aria-label="Move to Nest"
                      title="Move to Nest"
                      className={`w-7 h-7 rounded-lg border transition-colors flex items-center justify-center ${isDark ? 'border-[#0D9488]/40 text-[#2DD4BF] hover:bg-[#0D9488]/15' : 'border-[#0D9488]/30 text-[#0D9488] hover:bg-[#0D9488]/10'}`}
                    >
                      <House className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemovePlace(place); }}
                      aria-label="Remove from Temple of Interest"
                      title="Remove from Temple of Interest"
                      className={`w-7 h-7 rounded-lg border transition-colors flex items-center justify-center ${isDark ? 'border-red-400/30 text-red-300 hover:bg-red-400/15' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={`col-span-1 md:col-span-2 p-4 flex items-center gap-4 rounded-xl border border-dashed ${isDark ? 'border-white/20 bg-white/5' : 'border-black/20 bg-black/5'}`}>
            <div className={`w-12 h-12 rounded-full flex flex-shrink-0 items-center justify-center ${isDark ? 'bg-white/10 text-white/60' : 'bg-white text-black/40 shadow-sm'}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-[#141414]'}`}>No interests yet</p>
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-[#6E6A63]'}`}>Right-click anywhere on the map to add fascinating discoveries.</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Highlights */}
      <div className="mt-4">
        <h2 className="font-display text-xl font-semibold mb-4">Recent Highlights</h2>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
             <div key={i} className={`aspect-square rounded-xl overflow-hidden ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
               {/* Image placeholder */}
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}
