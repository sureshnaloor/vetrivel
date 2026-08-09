import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Search, Link2, Loader2, MapPin } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useLocation } from '../../contexts/LocationContext';
import { Autocomplete } from '@react-google-maps/api';
import { addPlace, resolveMapLink, type UserPlace } from '../../services/places';
import { saveLocation } from '../../services/locations';

interface AddTempleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddTempleDialog({ open, onOpenChange }: AddTempleDialogProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { savedLocations, activeLocationId, selectLocation, refreshLocations } = useLocation();

  const [selectedNestId, setSelectedNestId] = useState<string>('');
  const [isCreatingNest, setIsCreatingNest] = useState(false);
  const [newNestName, setNewNestName] = useState('');

  const [addMode, setAddMode] = useState<'search' | 'manual' | 'link'>('search');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const [manualName, setManualName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualPlaceId, setManualPlaceId] = useState('');
  
  const [linkUrl, setLinkUrl] = useState('');
  const [resolvingLink, setResolvingLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize selected nest when dialog opens
  useEffect(() => {
    if (open) {
      if (activeLocationId) {
        setSelectedNestId(activeLocationId);
        setIsCreatingNest(false);
      } else {
        setSelectedNestId('');
        setIsCreatingNest(savedLocations.length === 0);
      }
      // Reset forms
      setAddMode('search');
      setManualName('');
      setManualLat('');
      setManualLng('');
      setManualAddress('');
      setManualPlaceId('');
      setLinkUrl('');
      setNewNestName('');
    }
  }, [open, activeLocationId, savedLocations]);

  const onAutocompleteLoad = (instance: google.maps.places.Autocomplete) => {
    setAutocomplete(instance);
  };

  const onPlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (place.geometry?.location && place.name) {
      setManualName(place.name);
      setManualLat(place.geometry.location.lat().toString());
      setManualLng(place.geometry.location.lng().toString());
      setManualAddress(place.formatted_address || '');
      setManualPlaceId(place.place_id || '');
      setAddMode('manual');
    }
  };

  const handleResolveLink = async () => {
    if (!linkUrl) return;
    setResolvingLink(true);
    try {
      const data = await resolveMapLink(linkUrl);
      setManualName(data.name);
      setManualLat(data.coordinates.lat.toString());
      setManualLng(data.coordinates.lng.toString());
      setManualAddress(data.address);
      setManualPlaceId(data.placeId);
      setAddMode('manual');
      setLinkUrl('');
    } catch (err: any) {
      alert(err.message || 'Failed to resolve link');
    } finally {
      setResolvingLink(false);
    }
  };

  const handleSubmit = async () => {
    if (!manualName || !manualLat || !manualLng) {
      alert('Name, Latitude, and Longitude are required.');
      return;
    }
    
    if (isCreatingNest && !newNestName.trim()) {
      alert('Please enter a name for the new nest.');
      return;
    }

    if (!isCreatingNest && !selectedNestId) {
      alert('Please select a nest or create a new one.');
      return;
    }

    setIsSaving(true);
    try {
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);
      if (isNaN(lat) || isNaN(lng)) throw new Error('Invalid coordinates');

      let targetLocationId = selectedNestId;

      // 1. Create Nest if requested
      if (isCreatingNest) {
        const saved = await saveLocation({
          name: newNestName.trim(),
          coordinates: { lat, lng },
          address: manualAddress || ''
        });
        targetLocationId = saved._id!;
        await refreshLocations();
        selectLocation(targetLocationId); // Auto-select the newly created nest globally
      }

      // 2. Add Temple to Nest
      const newPlace: Partial<UserPlace> = {
        name: manualName,
        coordinates: { lat, lng },
        address: manualAddress || '',
        placeId: manualPlaceId || `manual_${Date.now()}`,
        locationId: targetLocationId,
        category: 'nest',
        status: 'planned'
      };

      await addPlace(newPlace);
      
      // Dispatch event so other components refresh
      window.dispatchEvent(new Event('places-updated'));

      onOpenChange(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add temple');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50 rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#1a1b1e] text-white border border-white/10' : 'bg-white text-black border border-black/10'}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-display font-semibold">Add Temple to Nest</h2>
              <button 
                onClick={() => onOpenChange(false)}
                className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Nest Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                  Select Nest (Location)
                </label>
                {!isCreatingNest ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedNestId}
                      onChange={(e) => setSelectedNestId(e.target.value)}
                      className={`flex-1 px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors ${
                        isDark ? 'bg-black/20 border-white/20 text-white focus:border-[#0D9488]' : 'bg-white border-black/20 text-black focus:border-[#0D9488]'
                      }`}
                    >
                      <option value="" disabled>Choose a nest...</option>
                      {savedLocations.map(loc => (
                        <option key={loc._id} value={loc._id}>{loc.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setIsCreatingNest(true)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
                      }`}
                    >
                      New
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className={`flex-1 flex items-center px-3 py-2.5 rounded-xl border transition-colors ${
                        isDark ? 'bg-black/20 border-white/20 focus-within:border-[#0D9488]' : 'bg-white border-black/20 focus-within:border-[#0D9488]'
                      }`}>
                      <MapPin className="w-4 h-4 opacity-50 mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="New Nest Name (e.g. Varanasi)"
                        value={newNestName}
                        onChange={(e) => setNewNestName(e.target.value)}
                        className="w-full bg-transparent outline-none text-sm"
                      />
                    </div>
                    {savedLocations.length > 0 && (
                      <button
                        onClick={() => setIsCreatingNest(false)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                          isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
                        }`}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Add Mode Tabs */}
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => setAddMode('search')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    addMode === 'search'
                      ? 'bg-[#0D9488] text-white'
                      : isDark ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-black/5 text-[#6E6A63] hover:bg-black/10'
                  }`}
                >
                  Search Maps
                </button>
                <button
                  onClick={() => setAddMode('manual')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    addMode === 'manual'
                      ? 'bg-[#0D9488] text-white'
                      : isDark ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-black/5 text-[#6E6A63] hover:bg-black/10'
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setAddMode('link')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    addMode === 'link'
                      ? 'bg-[#0D9488] text-white'
                      : isDark ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-black/5 text-[#6E6A63] hover:bg-black/10'
                  }`}
                >
                  Link Entry
                </button>
              </div>

              {/* Tab Contents */}
              {addMode === 'search' && (
                <div>
                  <p className={`text-sm mb-3 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>Search for a temple on Google Maps to add it to your nest.</p>
                  <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                    options={{ fields: ["geometry", "name", "formatted_address", "place_id"] }}
                  >
                    <div className={`flex items-center px-3 py-2.5 rounded-xl border transition-colors ${
                      isDark ? 'bg-black/20 border-white/20 focus-within:border-[#0D9488]' : 'bg-white border-black/20 focus-within:border-[#0D9488]'
                    }`}>
                      <Search className="w-4 h-4 opacity-50 mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search Google Maps..."
                        className="w-full bg-transparent outline-none text-sm"
                      />
                    </div>
                  </Autocomplete>
                </div>
              )}

              {addMode === 'link' && (
                <div className="space-y-3">
                  <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>Paste a Google Maps link to automatically resolve details.</p>
                  <div className={`flex items-center px-3 py-2.5 rounded-xl border transition-colors ${
                    isDark ? 'bg-black/20 border-white/20 focus-within:border-[#0D9488]' : 'bg-white border-black/20 focus-within:border-[#0D9488]'
                  }`}>
                    <Link2 className="w-4 h-4 opacity-50 mr-2 shrink-0" />
                    <input
                      type="url"
                      placeholder="https://maps.app.goo.gl/..."
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm"
                    />
                  </div>
                  <button
                    onClick={handleResolveLink}
                    disabled={resolvingLink || !linkUrl}
                    className="w-full py-2.5 rounded-xl bg-[#0D9488] text-white font-medium text-sm hover:bg-[#0F766E] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {resolvingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Resolve Link
                  </button>
                </div>
              )}

              {addMode === 'manual' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Temple Name *"
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors ${
                      isDark ? 'bg-black/20 border-white/20 text-white focus:border-[#0D9488]' : 'bg-white border-black/20 text-black focus:border-[#0D9488]'
                    }`}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Latitude *"
                      value={manualLat}
                      onChange={e => setManualLat(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors ${
                        isDark ? 'bg-black/20 border-white/20 text-white focus:border-[#0D9488]' : 'bg-white border-black/20 text-black focus:border-[#0D9488]'
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="Longitude *"
                      value={manualLng}
                      onChange={e => setManualLng(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors ${
                        isDark ? 'bg-black/20 border-white/20 text-white focus:border-[#0D9488]' : 'bg-white border-black/20 text-black focus:border-[#0D9488]'
                      }`}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Address (optional)"
                    value={manualAddress}
                    onChange={e => setManualAddress(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-colors ${
                      isDark ? 'bg-black/20 border-white/20 text-white focus:border-[#0D9488]' : 'bg-white border-black/20 text-black focus:border-[#0D9488]'
                    }`}
                  />
                  
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving || !manualName || !manualLat || !manualLng || (isCreatingNest && !newNestName)}
                    className="w-full mt-4 py-2.5 rounded-xl bg-[#0D9488] text-white font-medium text-sm hover:bg-[#0F766E] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Add Temple to Nest
                  </button>
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
