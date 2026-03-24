import { useState, useCallback, useRef } from 'react';
import { useLocation } from '../../contexts/LocationContext';
import { useTheme } from '../../hooks/useTheme';
import { MapPin, Search, Navigation as NavigationIcon, X, Map as MapIcon, Loader2, Save } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { GoogleMap, Autocomplete } from '@react-google-maps/api';

// Geocoding helper service cache
let geocoderService: google.maps.Geocoder | null = null;

const MAP_STYLES = [
  {
    featureType: "poi",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "poi.place_of_worship",
    elementType: "all",
    stylers: [{ visibility: "on" }]
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  }
];

const containerStyle = {
  width: '100%',
  height: '100%'
};

export default function LocationSelector() {
  const { type, address, coordinates, setLocation, requestCurrentLocation, isLoading, isLoaded, savedLocations, activeLocationId, selectLocation, refreshLocations } = useLocation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const [mapCenter, setMapCenter] = useState(coordinates || { lat: 25.3109, lng: 83.0076 }); // Varanasi default
  const [mapZoom, setMapZoom] = useState(13);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [selectedPlaceName, setSelectedPlaceName] = useState<string>('');
  const mapRef = useRef<google.maps.Map | null>(null);

  const handleCurrentLocationClick = () => {
    selectLocation(null);
    requestCurrentLocation();
    setIsPopoverOpen(false);
  };

  const handlePlannedClick = () => {
    selectLocation(null);
    setIsPopoverOpen(false);
    setIsMapModalOpen(true);
    if (coordinates) {
      setMapCenter(coordinates);
    }
  };

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveMap = async () => {
    if (!newMapName.trim() || !coordinates) return;
    setIsSaving(true);
    try {
      const { saveLocation } = await import('../../services/locations');
      const saved = await saveLocation({
        name: newMapName.trim(),
        coordinates,
        address: address || ""
      });
      await refreshLocations();
      selectLocation(saved._id || null);
      setIsSaveModalOpen(false);
      setNewMapName('');
      setIsPopoverOpen(false);
    } catch (e) {
      console.error('Failed to save map', e);
    } finally {
      setIsSaving(false);
    }
  };

  const onMapLoad = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(function callback() {
    mapRef.current = null;
  }, []);

  const onAutocompleteLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();
      
      if (lat && lng) {
        const newCoords = { lat, lng };
        setMapCenter(newCoords);
        if (place.name) {
          setSelectedPlaceName(place.name + (place.formatted_address ? `, ${place.formatted_address.split(',')[0]}` : ''));
        }
        setMapZoom(14);
        if (mapRef.current) {
          mapRef.current.panTo(newCoords);
        }
      }
    }
  };

  const handleConfirmLocation = () => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      if (center) {
        if (selectedPlaceName) {
          selectLocation(null);
          setLocation('planned', { lat: center.lat(), lng: center.lng() }, selectedPlaceName);
          setIsMapModalOpen(false);
          return;
        }

        // Fallback reverse geocoding if they dragged map manually
        if (!geocoderService && window.google) {
          geocoderService = new window.google.maps.Geocoder();
        }
        
        if (geocoderService) {
          geocoderService.geocode({ location: { lat: center.lat(), lng: center.lng() } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const locality = results[0].address_components.find(c => c.types.includes('locality'));
              const fallback = locality ? locality.long_name : results[0].formatted_address.split(',')[0];
              selectLocation(null);
              setLocation('planned', { lat: center.lat(), lng: center.lng() }, fallback);
            } else {
              selectLocation(null);
              setLocation('planned', { lat: center.lat(), lng: center.lng() }, 'Selected Region');
            }
            setIsMapModalOpen(false);
          });
          return;
        }

        selectLocation(null);
        setLocation('planned', { lat: center.lat(), lng: center.lng() }, 'Custom Location');
      }
    }
    setIsMapModalOpen(false);
  };

  return (
    <>
      <Popover.Root open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <Popover.Trigger asChild>
          <button className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-colors ${
            isDark 
              ? 'bg-[#131418] border-[#D13B3B]/30 hover:bg-[#1c1815] text-white' 
              : 'bg-white border-[#D13B3B]/30 hover:bg-[#fffaf4] text-[#141414] shadow-sm'
          }`}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-[#D13B3B] animate-spin" />
            ) : type === 'current' ? (
              <NavigationIcon className="w-4 h-4 text-[#D13B3B]" />
            ) : (
              <MapPin className="w-4 h-4 text-[#D13B3B]" />
            )}
            
            <span className="max-w-[120px] truncate">
              {isLoading ? 'Locating...' : address || 'Select Location'}
            </span>
            
            <span className="text-[10px] ml-1 opacity-50">▼</span>
          </button>
        </Popover.Trigger>
        
        <Popover.Portal>
          <Popover.Content 
            className={`w-56 p-2 rounded-xl shadow-xl border outline-none ${
              isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-black/10'
            }`}
            sideOffset={8}
            align="start"
          >
            <div className="flex flex-col gap-1">
              <button 
                onClick={handleCurrentLocationClick}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  type === 'current' 
                    ? (isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-[#141414]')
                    : (isDark ? 'text-white/70 hover:bg-white/5 hover:text-white' : 'text-[#6E6A63] hover:bg-black/5 hover:text-[#141414]')
                }`}
              >
                <NavigationIcon className={`w-4 h-4 ${type === 'current' ? 'text-[#D13B3B]' : ''}`} />
                Current Location
              </button>
              
              <button 
                onClick={handlePlannedClick}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  type === 'planned' 
                    ? (isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-[#141414]')
                    : (isDark ? 'text-white/70 hover:bg-white/5 hover:text-white' : 'text-[#6E6A63] hover:bg-black/5 hover:text-[#141414]')
                }`}
              >
                <MapIcon className={`w-4 h-4 ${type === 'planned' ? 'text-[#D13B3B]' : ''}`} />
                Explore & Set Region 
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>Map</span>
              </button>

              <div className={`my-2 border-t ${isDark ? 'border-white/10' : 'border-black/5'}`} />

              <div className="px-3 py-2">
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>My sacred spaces</p>
                <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
                    {savedLocations.map(loc => (
                      <button 
                        key={loc._id}
                        onClick={() => { selectLocation(loc._id || null); setIsPopoverOpen(false); }}
                        className={`flex items-center gap-3 w-full px-2 py-2 rounded-lg text-xs transition-colors text-left ${
                          activeLocationId === loc._id ? (isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-[#141414]') : (isDark ? 'text-white/60 hover:text-white' : 'text-[#6E6A63] hover:text-[#141414]')
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" /> {loc.name}
                      </button>
                    ))}
                </div>
              </div>

              {!activeLocationId && (
                <button 
                  onClick={() => setIsSaveModalOpen(true)}
                  className={`mt-2 flex items-center justify-center gap-2 w-full p-2.5 rounded-xl border border-dashed transition-all hover:border-[#0D9488] hover:bg-[#0D9488]/5 text-xs font-semibold ${
                    isDark ? 'border-white/20 text-[#2DD4BF]' : 'border-black/10 text-[#0D9488]'
                  }`}
                >
                  <Save className="w-4 h-4" /> Save as sacred space
                </button>
              )}
            </div>
            <Popover.Arrow className={isDark ? 'fill-[#131418]' : 'fill-white'} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* Save Map Modal */}
      {isSaveModalOpen && (
         <>
           <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" onClick={() => setIsSaveModalOpen(false)} />
           <div className={`fixed z-[120] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm p-6 rounded-2xl shadow-2xl border ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5]'}`}>
             <h3 className="font-display text-xl font-semibold mb-2">Save sacred space</h3>
             <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>Give this location a name to save it as a permanent sacred space. All spiritual spots you pin here will be linked to this trip.</p>
             <input 
               type="text" 
               placeholder="e.g. Varanasi Trip, My Home Base" 
               className={`w-full p-3 rounded-lg border outline-none mb-4 ${isDark ? 'bg-black/20 border-white/20 text-white' : 'bg-white border-black/20 text-black'}`}
               value={newMapName}
               onChange={(e) => setNewMapName(e.target.value)}
               autoFocus
             />
             <div className="flex justify-end gap-3">
               <button className="px-4 py-2 rounded-lg font-medium text-sm transition-colors opacity-70 hover:opacity-100" onClick={() => setIsSaveModalOpen(false)}>Cancel</button>
               <button 
                className="px-4 py-2 rounded-lg font-medium text-sm transition-colors bg-[#0D9488] text-white hover:bg-[#09917d] disabled:opacity-50" 
                onClick={handleSaveMap}
                disabled={isSaving || !newMapName.trim()}
               >
                 {isSaving ? 'Saving...' : 'Save sacred space'}
               </button>
             </div>
           </div>
         </>
       )}

      {/* Map Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsMapModalOpen(false)} 
          />
          <div className={`relative w-[90vw] max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 outline-none ${
            isDark ? 'bg-[#131418] border border-white/10' : 'bg-[#F4F1EA]'
          }`}>
            
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <div>
                <h2 className={`font-display text-xl font-semibold ${isDark ? 'text-white' : 'text-[#141414]'}`}>
                  Explore the World
                </h2>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
                  Drag the map to find temples and sacred spaces.
                </p>
              </div>
              <button 
                onClick={() => setIsMapModalOpen(false)}
                className={`p-2 rounded-full transition-colors ${
                  isDark ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'hover:bg-black/5 text-[#6E6A63] hover:text-[#141414]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={mapCenter}
                  zoom={mapZoom}
                  onLoad={onMapLoad}
                  onUnmount={onMapUnmount}
                  options={{
                    styles: MAP_STYLES,
                    disableDefaultUI: true,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                  }}
                >
                  <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                    options={{ fields: ["geometry", "name"] }}
                  >
                    <div className="absolute top-4 left-4 right-4 md:left-[50%] md:translate-x-[-50%] md:w-[400px] bg-white rounded-lg shadow-lg flex items-center p-2">
                      <Search className="w-5 h-5 text-gray-400 ml-2 mr-3 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="Search for a city or region..."
                        className="w-full bg-transparent text-black outline-none h-10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                          }
                        }}
                      />
                    </div>
                  </Autocomplete>

                  {/* Crosshair to indicate center selection */}
                  <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] pointer-events-none drop-shadow-md">
                    <MapPin className="w-8 h-8 text-[#D13B3B] pb-3" />
                  </div>
                </GoogleMap>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D13B3B]" />
                </div>
              )}
              <div
                className={`absolute bottom-0 left-0 right-0 h-7 pointer-events-none ${isDark ? 'bg-[#131418]' : 'bg-[#F4F1EA]'}`}
                aria-hidden="true"
              />
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex justify-end gap-3 ${isDark ? 'border-white/10 bg-[#0E0F12]' : 'border-black/10 bg-white'}`}>
              <button 
                onClick={() => setIsMapModalOpen(false)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  isDark ? 'text-white hover:bg-white/10' : 'text-[#6E6A63] hover:bg-black/5'
                }`}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmLocation}
                className="px-5 py-2.5 rounded-full text-sm font-medium bg-[#D13B3B] text-white hover:bg-[#b83232] transition-colors shadow-sm"
              >
                Set Location Here
              </button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
