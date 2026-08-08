import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useTheme } from '../hooks/useTheme';
import { fetchListDetails } from '../services/divyadesam';
import type { DivyaDesamList } from '../services/divyadesam';
import { fetchPlaces, savePlace, type UserPlace } from '../services/places';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Loader2, Edit2, Trash2, Search, BookOpen, Sparkles, Map as MapIcon } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import { useDivyaDesam } from '../contexts/DivyaDesamContext';
import { Autocomplete } from '@react-google-maps/api';
import DivyaDesamFormDialog from '../components/dashboard/DivyaDesamFormDialog';
import TempleDetailDialog from '../components/dashboard/TempleDetailDialog';
import VisitLogDialog from '../components/dashboard/VisitLogDialog';
import { formatVisitDate } from '../services/placeVisits';

export default function DivyaDesamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { session } = useAuth();
  const user = session?.user;
  const { isLoaded } = useLocation();
  const { updateList, deleteList } = useDivyaDesam();

  const [list, setList] = useState<DivyaDesamList | null>(null);
  const [userPlacesMap, setUserPlacesMap] = useState<Map<string, UserPlace>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTempleDialog, setSelectedTempleDialog] = useState<any | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addMode, setAddMode] = useState<'search' | 'manual'>('search');
  const [manualName, setManualName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualSaving, setManualSaving] = useState(false);
  
  const [visitLogTarget, setVisitLogTarget] = useState<{
    place: UserPlace;
    initialView: 'log' | 'history';
  } | null>(null);

  const refreshUserPlaces = () => {
    fetchPlaces().then(userPlaces => {
      const map = new Map<string, UserPlace>();
      userPlaces.forEach((p: UserPlace) => {
        if (p.placeId) {
          map.set(p.placeId, p);
        }
      });
      setUserPlacesMap(map);
    });
  };

  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);

    Promise.all([
      fetchListDetails(id),
      fetchPlaces()
    ]).then(([listData, userPlaces]) => {
      setList(listData);
      
      const map = new Map<string, UserPlace>();
      userPlaces.forEach((p: UserPlace) => {
        if (p.placeId) {
          map.set(p.placeId, p);
        }
      });
      setUserPlacesMap(map);
    }).catch(err => {
      setError(err.message || 'Failed to load details');
    }).finally(() => {
      setLoading(false);
    });
  }, [id, user]);

  const handleTempleClick = (temple: any) => {
    setSelectedTempleDialog(temple);
  };

  const handleRemoveTemple = async (placeId: string) => {
    if (!list) return;
    const newTemples = list.temples.filter(t => t.placeId !== placeId);
    try {
      const updated = await updateList(list._id, { temples: newTemples });
      setList(updated);
    } catch (err) {
      console.error(err);
      alert('Failed to remove temple');
    }
  };

  const handleDeleteList = async () => {
    if (!list) return;
    if (confirm('Are you sure you want to delete this list?')) {
      try {
        await deleteList(list._id);
        navigate('/dashboard/divyadesams');
      } catch (err) {
        console.error(err);
        alert('Failed to delete list');
      }
    }
  };

  const handleLogVisit = async (temple: any, e: React.MouseEvent) => {
    e.stopPropagation();
    let place = userPlacesMap.get(temple.placeId);
    if (!place) {
      try {
        place = await savePlace({
          placeId: temple.placeId,
          name: temple.name,
          coordinates: temple.coordinates,
          category: 'nest',
          status: 'planned',
          address: temple.address
        });
        refreshUserPlaces();
      } catch (err) {
        console.error(err);
        alert('Failed to save place for logging visit');
        return;
      }
    }
    setVisitLogTarget({ place, initialView: place.hasVisitDetails ? 'history' : 'log' });
  };

  const handleAddInterest = async (temple: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (userPlacesMap.has(temple.placeId)) {
      alert('Temple is already in your tracked places.');
      return;
    }
    try {
      await savePlace({
        placeId: temple.placeId,
        name: temple.name,
        coordinates: temple.coordinates,
        category: 'interest',
        status: 'place of interest',
        address: temple.address
      });
      refreshUserPlaces();
      alert('Added to your Interests!');
    } catch (err) {
      console.error(err);
      alert('Failed to add to Interests');
    }
  };

  const onAutocompleteLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = async () => {
    if (autocomplete && list) {
      const place = autocomplete.getPlace();
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();
      const placeId = place.place_id;
      
      if (lat && lng && placeId) {
        // Check if already in list
        if (list.temples.some(t => t.placeId === placeId)) {
          alert("Temple is already in the list");
          setIsAdding(false);
          return;
        }

        const newTemple = {
          placeId,
          name: place.name || "Unknown Temple",
          coordinates: { lat, lng },
          address: place.formatted_address || ""
        };

        try {
          const updated = await updateList(list._id, { temples: [...list.temples, newTemple] });
          setList(updated);
        } catch (err) {
          console.error(err);
          alert('Failed to add temple');
        }
      }
      setIsAdding(false);
    }
  };

  const handleManualAdd = async () => {
    if (!list) return;
    if (!manualName.trim()) { alert('Name is required'); return; }
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) { alert('Valid latitude and longitude are required'); return; }

    const placeId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newTemple = {
      placeId,
      name: manualName.trim(),
      coordinates: { lat, lng },
      address: manualAddress.trim()
    };

    setManualSaving(true);
    try {
      const updated = await updateList(list._id, { temples: [...list.temples, newTemple] });
      setList(updated);
      setManualName('');
      setManualLat('');
      setManualLng('');
      setManualAddress('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      alert('Failed to add temple');
    } finally {
      setManualSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-300 flex flex-col ${isDark ? 'bg-black text-white' : 'bg-[#F4F1EA] text-[#141414]'}`}>
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin opacity-50" />
        </main>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className={`min-h-screen transition-colors duration-300 flex flex-col ${isDark ? 'bg-black text-white' : 'bg-[#F4F1EA] text-[#141414]'}`}>
        <Navigation />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p className="text-red-500 mb-4">{error || 'List not found'}</p>
          <button onClick={() => navigate('/dashboard/divyadesams')} className="text-[#0D9488] font-medium hover:underline">
            Go back to my lists
          </button>
        </main>
      </div>
    );
  }

  const visitedCount = list.temples.filter(t => userPlacesMap.get(t.placeId)?.status === 'visited').length;
  const totalCount = list.temples.length;
  const progressPercent = totalCount > 0 ? (visitedCount / totalCount) * 100 : 0;

  const isOwner = list.creatorEmail === user?.email;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-[#F4F1EA] text-[#141414]'}`}>
      <Navigation />
      
      <main className="max-w-[1000px] mx-auto pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 mb-6 text-sm font-medium transition-colors ${isDark ? 'text-white/60 hover:text-white' : 'text-[#6E6A63] hover:text-[#141414]'}`}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <header className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="font-display text-4xl font-semibold">{list.name}</h1>
              {list.isPublished && (
                <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded font-semibold ${isDark ? 'bg-[#0D9488]/20 text-[#2DD4BF]' : 'bg-[#0D9488]/15 text-[#0D9488]'}`}>
                  Published
                </span>
              )}
            </div>
            <p className={`text-lg mb-6 ${isDark ? 'text-white/70' : 'text-[#6E6A63]'}`}>
              {list.description || "No description provided."}
            </p>

            {/* Progress Bar */}
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-sm">Pilgrimage Progress</span>
                <span className="font-bold text-[#0D9488]">{visitedCount} / {totalCount} Visited</span>
              </div>
              <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                <div 
                  className="h-full bg-[#0D9488] transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
          
          {isOwner && (
            <div className="flex flex-row md:flex-col gap-2 shrink-0">
              <button 
                onClick={() => setIsEditOpen(true)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'
                }`}
              >
                <Edit2 className="w-4 h-4" /> Edit List
              </button>
              <button 
                onClick={handleDeleteList}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                <Trash2 className="w-4 h-4" /> Delete List
              </button>
            </div>
          )}
        </header>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Temples ({totalCount})</h3>
            {isOwner && (
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className="text-sm font-medium text-[#0D9488] hover:underline"
              >
                {isAdding ? 'Cancel' : '+ Add Temple'}
              </button>
            )}
          </div>
          
          {isOwner && isAdding && (
            <div className={`p-5 rounded-xl border mb-4 ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5]'}`}>
              {/* Mode tabs */}
              <div className="flex gap-1 mb-4">
                <button
                  onClick={() => setAddMode('search')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    addMode === 'search'
                      ? 'bg-[#0D9488] text-white'
                      : isDark ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-black/5 text-[#6E6A63] hover:bg-black/10'
                  }`}
                >
                  Search Google Maps
                </button>
                <button
                  onClick={() => setAddMode('manual')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    addMode === 'manual'
                      ? 'bg-[#0D9488] text-white'
                      : isDark ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-black/5 text-[#6E6A63] hover:bg-black/10'
                  }`}
                >
                  Manual Entry
                </button>
              </div>

              {addMode === 'search' && isLoaded && (
                <div>
                  <p className={`text-sm mb-3 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>Search for a temple on Google Maps to add it to your list.</p>
                  <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                    options={{ fields: ["geometry", "name", "formatted_address", "place_id"] }}
                  >
                    <div className={`flex items-center px-3 py-2.5 rounded-xl border transition-colors ${
                      isDark ? 'bg-black/20 border-white/20 focus-within:border-[#0D9488]' : 'bg-white border-black/20 focus-within:border-[#0D9488]'
                    }`}>
                      <Search className="w-4 h-4 opacity-50 mr-2" />
                      <input
                        type="text"
                        placeholder="Search Google Maps..."
                        className="w-full bg-transparent outline-none text-sm"
                        autoFocus
                      />
                    </div>
                  </Autocomplete>
                </div>
              )}

              {addMode === 'manual' && (
                <div className="space-y-3">
                  <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>Manually enter the temple details and coordinates.</p>
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
                    onClick={handleManualAdd}
                    disabled={manualSaving}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#0D9488] text-white hover:bg-[#09917d] transition-colors disabled:opacity-50"
                  >
                    {manualSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Add Temple
                  </button>
                </div>
              )}
            </div>
          )}


          <p className={`text-sm mb-4 ${isDark ? 'text-white/50' : 'text-black/50'}`}>
            Click on a temple to view it on the map and add it to your space. Marking it as 'Visited' in your space will update your progress here.
          </p>

          <div className="grid gap-4">
            {list.temples.map((temple, idx) => {
              const userPlace = userPlacesMap.get(temple.placeId);
              const isVisited = userPlace?.status === 'visited';
              const hasVisitDetails = userPlace?.hasVisitDetails;
              
              return (
                <div
                  key={idx}
                  className={`relative p-5 rounded-3xl border transition-all ${
                    isVisited 
                      ? (isDark ? 'bg-emerald-500/10 border-emerald-400/40' : 'bg-[#e6ffea] border-emerald-300')
                      : (isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5]')
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    {/* Badge */}
                    <div>
                      {isVisited && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          isDark ? 'bg-emerald-500 text-white' : 'bg-[#10b981] text-white'
                        }`}>
                          ✓ VISITED
                        </span>
                      )}
                    </div>

                    {/* Top Right Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTempleClick(temple)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${
                          isDark ? 'border-indigo-400/30 text-indigo-300 hover:bg-indigo-400/15' : 'border-indigo-200 text-indigo-500 hover:bg-indigo-50'
                        }`}
                        title="Show Map and Info"
                      >
                        <MapIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleAddInterest(temple, e)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${
                          isDark ? 'border-blue-400/30 text-blue-300 hover:bg-blue-400/15' : 'border-blue-200 text-blue-500 hover:bg-blue-50'
                        }`}
                        title="Add to Interests"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveTemple(temple.placeId)}
                          className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${
                            isDark ? 'border-red-400/30 text-red-400 hover:bg-red-400/15' : 'border-red-200 text-red-500 hover:bg-red-50'
                          }`}
                          title="Remove from list"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Temple Details */}
                  <div className="mb-6">
                    <h3 className={`font-semibold text-xl ${isDark ? 'text-white' : 'text-[#141414]'}`}>
                      {temple.name}
                    </h3>
                    {isVisited && userPlace?.lastVisitDate && (
                      <p className={`text-sm mt-1 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
                        Last visit · {formatVisitDate(userPlace.lastVisitDate)}
                      </p>
                    )}
                  </div>

                  {/* Bottom Action */}
                  <div>
                    <button
                      onClick={(e) => handleLogVisit(temple, e)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        isDark ? 'border-[#0D9488]/40 text-[#2DD4BF] hover:bg-[#0D9488]/15' : 'border-[#0D9488]/30 text-[#0D9488] hover:bg-[#0D9488]/10'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      {hasVisitDetails ? 'Previous visit' : 'Log visit'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <DivyaDesamFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        list={list}
        onSaved={setList}
      />

      <TempleDetailDialog
        open={!!selectedTempleDialog}
        onOpenChange={(open) => !open && setSelectedTempleDialog(null)}
        temple={selectedTempleDialog}
      />

      {visitLogTarget && visitLogTarget.place._id && (
        <VisitLogDialog
          open={!!visitLogTarget}
          onOpenChange={(open) => !open && setVisitLogTarget(null)}
          placeDocId={visitLogTarget.place._id}
          placeName={visitLogTarget.place.name}
          placeId={visitLogTarget.place.placeId}
          initialView={visitLogTarget.initialView}
          onVisitsChanged={refreshUserPlaces}
        />
      )}
    </div>
  );
}
