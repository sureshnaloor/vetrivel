import { useEffect, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useLocation } from '../../contexts/LocationContext';
import { useDashboardPinned } from '../../contexts/DashboardPinnedContext';
import { useAuth } from '../../hooks/useAuth';
import { useFriends } from '../../contexts/FriendsContext';
import { fetchPlaces, type UserPlace } from '../../services/places';
import { MapPin, UserPlus, Check, X, Trash2, Link2, Copy, ChevronDown, ChevronUp, Loader2, Users } from 'lucide-react';
import { getDistanceKm, normalizeDocumentId } from '../../lib/geo';

export default function LeftRail() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { savedLocations, activeLocationId, selectLocation } = useLocation();
  const { friendNests } = useFriends();
  const { session } = useAuth();
  const { setPinToAssign, pinToAssign, pinnedListVersion } = useDashboardPinned();
  const [allPlaces, setAllPlaces] = useState<UserPlace[]>([]);
  const [friendPlaces, setFriendPlaces] = useState<UserPlace[]>([]);
  const [loadingPins, setLoadingPins] = useState(false);

  const activeFriendNest = friendNests.find(n => normalizeDocumentId(n._id) === normalizeDocumentId(activeLocationId));
  const isFriendNest = !!activeFriendNest;

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

  useEffect(() => {
    if (isFriendNest && activeLocationId) {
      fetchPlaces(activeLocationId)
        .then(setFriendPlaces)
        .catch(console.error);
    } else {
      setFriendPlaces([]);
    }
  }, [isFriendNest, activeLocationId]);

  // Derived data
  const nestTemples = isFriendNest 
    ? friendPlaces.filter(p => p.category === 'nest')
    : allPlaces.filter(p => p.category === 'nest' && normalizeDocumentId(p.locationId) === normalizeDocumentId(activeLocationId));
  
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
        <h2 className="font-display text-xl font-semibold mb-4">
          {isFriendNest ? `${activeFriendNest.ownerName}'s Nest` : 'My Nest'}
        </h2>
        
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
        {!isFriendNest && (
          <button className="w-full py-3 rounded-xl bg-[#0D9488] text-white font-medium hover:bg-[#09917d] transition-colors flex items-center justify-center gap-2 mb-6">
            <span className="text-lg">+</span> Add to Nest
          </button>
        )}

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

      {/* Friend's Nests Section */}
      <FriendNestsWidget isDark={isDark} />

      {/* Friends Section */}
      <FriendsWidget isDark={isDark} />
    </div>
  );
}

// ─── Friends Widget ──────────────────────────────────────────────────────────
function FriendsWidget({ isDark }: { isDark: boolean }) {
  const { friends, incomingRequests, sentRequests, loading, error, sendRequest, acceptRequest, rejectRequest, unfriend, getInviteLink } = useFriends();
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [showSent, setShowSent] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const handleSendRequest = async () => {
    if (!emailInput.trim()) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(null);
    try {
      await sendRequest(emailInput.trim().toLowerCase());
      setSendSuccess(`Request sent to ${emailInput.trim()}`);
      setEmailInput('');
      setTimeout(() => setSendSuccess(null), 3000);
    } catch (e: any) {
      setSendError(e.message);
    } finally {
      setSending(false);
    }
  };

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      const token = await getInviteLink();
      setInviteToken(token);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteToken) return;
    const url = `${window.location.origin}/dashboard?invite=${inviteToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className={`p-6 rounded-2xl border flex-1 ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'}`}>
      <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-[#D13B3B]" />
        Friends
        {friends.length > 0 && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-white/10 text-white/60' : 'bg-black/5 text-[#6E6A63]'}`}>
            {friends.length}
          </span>
        )}
      </h2>

      {/* Search by email */}
      <div className="mb-3">
        <div className="flex gap-1.5">
          <input
            type="email"
            placeholder="Add friend by email..."
            value={emailInput}
            onChange={(e) => { setEmailInput(e.target.value); setSendError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
            className={`flex-1 px-3 py-2 rounded-lg text-xs border outline-none transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/25' : 'bg-black/[0.02] border-black/10 text-[#141414] placeholder:text-black/30 focus:border-black/20'}`}
          />
          <button
            onClick={handleSendRequest}
            disabled={sending || !emailInput.trim()}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-40 ${isDark ? 'bg-[#D13B3B]/20 text-[#D13B3B] hover:bg-[#D13B3B]/30' : 'bg-[#D13B3B]/10 text-[#D13B3B] hover:bg-[#D13B3B]/15'}`}
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
          </button>
        </div>
        {sendError && <p className="text-[10px] text-red-500 mt-1">{sendError}</p>}
        {sendSuccess && <p className="text-[10px] text-green-500 mt-1">{sendSuccess}</p>}
      </div>

      {/* Invite Link */}
      <div className="mb-4">
        {!inviteToken ? (
          <button
            onClick={handleGenerateLink}
            disabled={generatingLink}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] border border-dashed transition-colors ${isDark ? 'border-white/15 text-white/50 hover:text-white/70 hover:border-white/25' : 'border-black/15 text-[#6E6A63] hover:text-[#141414] hover:border-black/25'}`}
          >
            {generatingLink ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
            Generate invite link
          </button>
        ) : (
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
            <Link2 className="w-3 h-3 flex-shrink-0 opacity-40" />
            <span className="truncate flex-1 opacity-60">Invite link ready</span>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${copiedLink ? 'text-green-500' : isDark ? 'text-white/60 hover:text-white' : 'text-[#6E6A63] hover:text-[#141414]'}`}
            >
              <Copy className="w-3 h-3" />
              {copiedLink ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <div className="mb-4">
          <p className={`text-[10px] uppercase tracking-wider font-medium mb-2 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
            Pending Requests ({incomingRequests.length})
          </p>
          <div className="space-y-1.5">
            {incomingRequests.map((req) => (
              <div
                key={req._id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-600'}`}>
                  {(req.fromName || req.fromEmail)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{req.fromName || req.fromEmail}</p>
                  <p className={`text-[10px] truncate ${isDark ? 'text-white/40' : 'text-[#6E6A63]'}`}>{req.fromEmail}</p>
                </div>
                <button
                  onClick={() => acceptRequest(req._id)}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isDark ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                  title="Accept"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => rejectRequest(req._id)}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                  title="Decline"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center gap-2 py-3 justify-center">
            <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-white/30' : 'text-black/20'}`} />
            <span className={`text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>Loading...</span>
          </div>
        ) : friends.length === 0 ? (
          <p className={`text-[10px] px-3 py-4 text-center border border-dashed rounded-xl ${isDark ? 'border-white/10 text-white/40' : 'border-black/10 text-black/40'}`}>
            No friends yet. Search by email or share your invite link.
          </p>
        ) : (
          friends.map((friend) => (
            <div
              key={friend._id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg group transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/[0.02]'}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${isDark ? 'bg-[#0D9488]/20 text-[#2DD4BF]' : 'bg-[#0D9488]/10 text-[#0D9488]'}`}>
                {(friend.name || friend.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{friend.name}</p>
                <p className={`text-[10px] truncate ${isDark ? 'text-white/35' : 'text-[#6E6A63]'}`}>{friend.email}</p>
              </div>
              <button
                onClick={() => unfriend(friend._id)}
                className={`w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/15' : 'text-red-400/40 hover:text-red-600 hover:bg-red-50'}`}
                title="Remove friend"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Sent Requests (collapsible) */}
      {sentRequests.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowSent(!showSent)}
            className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium ${isDark ? 'text-white/40 hover:text-white/60' : 'text-[#6E6A63] hover:text-[#141414]'}`}
          >
            {showSent ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Sent ({sentRequests.length})
          </button>
          {showSent && (
            <div className="space-y-1 mt-1.5">
              {sentRequests.map((req) => (
                <div
                  key={req._id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-white/[0.03] text-white/50' : 'bg-black/[0.02] text-[#6E6A63]'}`}
                >
                  <span className="truncate flex-1">{req.toEmail}</span>
                  <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${isDark ? 'bg-yellow-500/15 text-yellow-400' : 'bg-yellow-50 text-yellow-600'}`}>Pending</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-[10px] text-red-500 mt-2 text-center">{error}</p>
      )}
    </div>
  );
}

// ─── Friend's Nests Widget ───────────────────────────────────────────────────
function FriendNestsWidget({ isDark }: { isDark: boolean }) {
  const { friendNests, followedNestIds, followNest, unfollowNest, loading } = useFriends();
  const { savedLocations, activeLocationId, deviceCoordinates, selectLocation } = useLocation();

  // Determine origin for distance calculation
  const activeLoc = savedLocations.find(l => normalizeDocumentId(l._id) === normalizeDocumentId(activeLocationId));
  const originCoords = activeLoc?.coordinates || deviceCoordinates;

  if (loading && friendNests.length === 0) {
    return (
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'}`}>
        <div className="flex items-center gap-2 py-2">
          <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-white/30' : 'text-black/20'}`} />
          <span className={`text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>Loading friend nests...</span>
        </div>
      </div>
    );
  }

  if (friendNests.length === 0) return null;

  // Process nests: calculate distance and determine status
  const processedNests = friendNests.map(nest => {
    const distance = originCoords ? getDistanceKm(originCoords, nest.coordinates) : null;
    const isNearby = distance !== null && distance <= 50;
    const isFollowed = followedNestIds.has(nest._id);
    const shouldShow = isNearby || isFollowed;

    return { ...nest, distance, isNearby, isFollowed, shouldShow };
  });

  const visibleNests = processedNests.filter(n => n.shouldShow);
  const remoteNests = processedNests.filter(n => !n.isNearby && !n.isFollowed);

  return (
    <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'}`}>
      <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-[#D13B3B]" />
        Friend's Nests
      </h2>

      <div className="space-y-3">
        {/* Visible Nests (Nearby or Followed) */}
        {visibleNests.length > 0 ? (
          <div className="space-y-2">
            {visibleNests.map(nest => (
              <div key={nest._id} className="flex flex-col gap-1">
                <button
                  onClick={() => selectLocation(nest._id, nest.coordinates, nest.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ${
                    normalizeDocumentId(activeLocationId) === normalizeDocumentId(nest._id)
                      ? (isDark ? 'bg-[#D13B3B]/20 text-white font-semibold' : 'bg-[#D13B3B]/10 text-[#141414] font-semibold')
                      : (isDark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-[#6E6A63] hover:bg-black/5 hover:text-black')
                  }`}
                >
                  <MapPin className={`w-4 h-4 flex-shrink-0 ${normalizeDocumentId(activeLocationId) === normalizeDocumentId(nest._id) ? 'text-[#D13B3B]' : 'opacity-40'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{nest.name}</span>
                      {nest.isNearby && (
                        <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-bold tracking-tighter ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                          Nearby
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] truncate opacity-50`}>By {nest.ownerName} • {nest.distance?.toFixed(1)} km</p>
                  </div>
                  {!nest.isNearby && nest.isFollowed && (
                    <button
                      onClick={(e) => { e.stopPropagation(); unfollowNest(nest._id); }}
                      className={`p-1.5 rounded-md hover:bg-black/10 transition-colors ${isDark ? 'hover:bg-white/10' : ''}`}
                      title="Unfollow Nest"
                    >
                      <Trash2 className="w-3 h-3 text-red-500/60 hover:text-red-500" />
                    </button>
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-[10px] text-center opacity-40 py-2`}>No friend nests nearby.</p>
        )}

        {/* Discovery / Remote Nests */}
        {remoteNests.length > 0 && (
          <div className="mt-4 pt-4 border-t border-dashed border-white/10">
            <p className="eyebrow mb-2">Discover Friend's Nests</p>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
              {remoteNests.map(nest => (
                <div key={nest._id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/[0.02]'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{nest.name}</p>
                    <p className="text-[9px] opacity-50 truncate">By {nest.ownerName} • {nest.distance?.toFixed(0)} km away</p>
                  </div>
                  <button
                    onClick={() => followNest(nest._id)}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
                    }`}
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
