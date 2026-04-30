import { useEffect, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useLocation } from '../../contexts/LocationContext';
import { useDashboardPinned } from '../../contexts/DashboardPinnedContext';
import { useAuth } from '../../hooks/useAuth';
import { fetchPlaces, type UserPlace } from '../../services/places';
import { MapPin } from 'lucide-react';
import { getDistanceKm, normalizeDocumentId } from '../../lib/geo';

export default function LeftRail() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { savedLocations, activeLocationId, selectLocation } = useLocation();
  const { session } = useAuth();
  const { setPinToAssign, pinToAssign, pinnedListVersion } = useDashboardPinned();
  const [allPlaces, setAllPlaces] = useState<UserPlace[]>([]);
  const [loadingPins, setLoadingPins] = useState(false);

  useEffect(() => {
    if (!session?.user) {
      setAllPlaces([]);
      return;
    }
    setLoadingPins(true);
    // Fetch all places to have context for nests and interests
    fetchPlaces()
      .then((places) => setAllPlaces(places))
      .catch(console.error)
      .finally(() => setLoadingPins(false));
  }, [session, pinnedListVersion]);

  // Derived data
  const nestTemples = allPlaces.filter(p => p.category === 'nest' && p.locationId === activeLocationId);
  const visitedNestCount = nestTemples.filter(p => p.status === 'visited').length;
  const totalNestCount = nestTemples.length;
  
  const plannedNestTemples = nestTemples
    .filter(p => p.status === 'planned')
    .slice(0, 3); // Show top 3 planned

  // Explore pins sorted by distance to nearest nest temple
  const explorePins = allPlaces
    .filter((p) => p.category === 'pin')
    .map(pin => {
      let minDistance = Infinity;
      nestTemples.forEach(nest => {
        const dist = getDistanceKm(pin.coordinates, nest.coordinates);
        if (dist < minDistance) minDistance = dist;
      });
      return { ...pin, minDistance };
    })
    .sort((a, b) => a.minDistance - b.minDistance);

  return (
    <div className={`flex flex-col gap-6 h-full ${isDark ? 'text-white' : 'text-[#141414]'}`}>
      {/* Nest Progress Widget */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'}`}>
        <h2 className="font-display text-xl font-semibold mb-4">My Nest</h2>
        
        {/* Progress Display */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative w-16 h-16 rounded-full border-4 border-[#0D9488]/20 flex items-center justify-center overflow-hidden">
            {visitedNestCount > 0 ? (
              <>
                <div 
                  className="absolute inset-0 border-4 border-[#0D9488] transition-all duration-1000"
                  style={{ 
                    clipPath: `inset(${100 - (visitedNestCount / totalNestCount * 100)}% 0 0 0)`,
                    borderColor: '#0D9488'
                  }}
                />
                <span className="relative font-semibold text-sm">{visitedNestCount}/{totalNestCount}</span>
              </>
            ) : (
              <div className="w-10 h-10 border-2 border-t-[#0D9488] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">Temples Visited</p>
            <p className={`text-xs ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
              {visitedNestCount > 0 ? 'Keep exploring!' : 'Start your journey'}
            </p>
          </div>
        </div>

        {/* Add CTA */}
        <button className="w-full py-3 rounded-xl bg-[#0D9488] text-white font-medium hover:bg-[#09917d] transition-colors flex items-center justify-center gap-2 mb-6">
          <span className="text-lg">+</span> Add to Nest
        </button>

        {/* Upcoming in Nest */}
        {plannedNestTemples.length > 0 && (
          <div>
            <p className="eyebrow mb-3">Next in Nest</p>
            <ul className={`space-y-3 text-sm ${isDark ? 'text-white/80' : 'text-[#141414]/80'}`}>
              {plannedNestTemples.map(temple => (
                <li key={temple._id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]"></span>
                  <span className="truncate">{temple.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Workspaces Section */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'}`}>
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#0D9488]" /> My sacred spaces
        </h2>
        <div className="space-y-2">
          {savedLocations.length > 0 ? (
            savedLocations.map(loc => {
              const isActive = normalizeDocumentId(activeLocationId) === normalizeDocumentId(loc._id);
              return (
                <button 
                  key={String(normalizeDocumentId(loc._id))}
                  onClick={() => selectLocation(normalizeDocumentId(loc._id))}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ${
                    isActive
                      ? (isDark ? 'bg-[#0D9488]/20 text-[#2DD4BF] font-semibold' : 'bg-[#0D9488]/10 text-[#0D9488] font-semibold')
                      : (isDark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-[#6E6A63] hover:bg-black/5 hover:text-black')
                  }`}
                >
                  <MapPin className={`w-4 h-4 ${isActive ? 'text-[#0D9488]' : 'opacity-40'}`} />
                  <span className="truncate">{loc.name}</span>
                </button>
              );
            })
          ) : (
            <p className={`text-[10px] px-3 py-4 text-center border border-dashed rounded-xl ${isDark ? 'border-white/10 text-white/40' : 'border-black/10 text-black/40'}`}>
              No sacred spaces saved yet. Set a location in the header to save one.
            </p>
          )}
        </div>
      </div>

      {/* Pinned from Explore — assign to Nest / Interest on the map */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'}`}>
        <h2 className="font-display text-lg font-semibold mb-2 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#D13B3B]" /> Pinned from Explore
        </h2>
        <p className={`text-[11px] mb-3 ${isDark ? 'text-white/50' : 'text-[#6E6A63]'}`}>
          Tap a temple to open it on the map, then add it to your active sacred space as Nest or Interest.
        </p>
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {loadingPins ? (
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>Loading…</p>
          ) : explorePins.length === 0 ? (
            <p className={`text-[10px] px-3 py-4 text-center border border-dashed rounded-xl ${isDark ? 'border-white/10 text-white/40' : 'border-black/10 text-black/40'}`}>
              No pins yet. Pin temples on Explore Map to see them here.
            </p>
          ) : (
            explorePins.map((place) => (
              <button
                key={place._id || place.placeId || place.name}
                type="button"
                onClick={() => setPinToAssign(place)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ${
                  pinToAssign?._id === place._id
                    ? isDark
                      ? 'bg-[#D13B3B]/20 text-white font-medium ring-1 ring-[#D13B3B]/40'
                      : 'bg-[#D13B3B]/10 text-[#141414] font-medium ring-1 ring-[#D13B3B]/25'
                    : isDark
                      ? 'text-white/70 hover:bg-white/5 hover:text-white'
                      : 'text-[#6E6A63] hover:bg-black/5 hover:text-black'
                }`}
              >
                <MapPin className={`w-4 h-4 flex-shrink-0 ${pinToAssign?._id === place._id ? 'text-[#D13B3B]' : 'opacity-40'}`} />
                <span className="truncate">{place.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Following Feed */}
      <div className={`p-6 rounded-2xl border flex-1 ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'}`}>
        <h2 className="font-display text-lg font-semibold mb-4">Following Feed</h2>
        <div className="space-y-5">
          {/* Placeholder Item 1 — Bell / Notification */}
          <div className="flex gap-3 items-start">
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <style>{`
                  @keyframes feed-ring { 0%,100%{transform:rotate(0)} 15%{transform:rotate(8deg)} 30%{transform:rotate(-8deg)} 45%{transform:rotate(4deg)} 60%{transform:rotate(0)} }
                  .feed-bell { animation: feed-ring 3s ease-in-out infinite; transform-origin: top center; }
                `}</style>
                <path className="feed-bell" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1 space-y-2 pt-0.5">
              <div className={`h-3 rounded-full w-3/4 ${isDark ? 'bg-white/5' : 'bg-black/[0.04]'}`} style={{animation: 'highlights-pulse 2s ease-in-out infinite'}}/>
              <div className={`h-2.5 rounded-full w-full ${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.025]'}`} style={{animation: 'highlights-pulse 2s ease-in-out infinite 0.3s'}}/>
            </div>
          </div>
          {/* Placeholder Item 2 — Footsteps / Visited */}
          <div className="flex gap-3 items-start">
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <style>{`
                  @keyframes feed-walk { 0%,100%{opacity:.2} 30%{opacity:.5} 60%{opacity:.2} }
                  .feed-step1 { animation: feed-walk 2.5s ease-in-out infinite; }
                  .feed-step2 { animation: feed-walk 2.5s ease-in-out infinite 0.8s; }
                `}</style>
                <circle className="feed-step1" cx="9" cy="8" r="3" fill={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}/>
                <path className="feed-step1" d="M9 11c-4 0-6 2-6 5v2h12v-2c0-3-2-5-6-5z" fill={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}/>
                <path className="feed-step2" d="M16 7l2 2m0 0l2 2m-2-2l-2 2m2-2l2-2" stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1 space-y-2 pt-0.5">
              <div className={`h-3 rounded-full w-1/2 ${isDark ? 'bg-white/5' : 'bg-black/[0.04]'}`} style={{animation: 'highlights-pulse 2s ease-in-out infinite 0.5s'}}/>
              <div className={`h-2.5 rounded-full w-5/6 ${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.025]'}`} style={{animation: 'highlights-pulse 2s ease-in-out infinite 0.8s'}}/>
            </div>
          </div>
          {/* Placeholder Item 3 — Om / Temple post */}
          <div className="flex gap-3 items-start">
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <style>{`
                  @keyframes feed-breathe { 0%,100%{opacity:.15;transform:scale(.95)} 50%{opacity:.4;transform:scale(1.05)} }
                  .feed-om { animation: feed-breathe 3.5s ease-in-out infinite; transform-origin: center; }
                `}</style>
                <text className="feed-om" x="12" y="17" textAnchor="middle" fontSize="16" fontFamily="serif" fill={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'}>ॐ</text>
              </svg>
            </div>
            <div className="flex-1 space-y-2 pt-0.5">
              <div className={`h-3 rounded-full w-2/3 ${isDark ? 'bg-white/5' : 'bg-black/[0.04]'}`} style={{animation: 'highlights-pulse 2s ease-in-out infinite 1s'}}/>
              <div className={`h-2.5 rounded-full w-3/4 ${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.025]'}`} style={{animation: 'highlights-pulse 2s ease-in-out infinite 1.3s'}}/>
            </div>
          </div>
        </div>
        <p className={`text-[10px] text-center mt-4 ${isDark ? 'text-white/25' : 'text-black/25'}`}>
          Follow temples & devotees to see their updates
        </p>
      </div>
    </div>
  );
}
