import { useEffect, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useLocation } from '../../contexts/LocationContext';
import { useDashboardPinned } from '../../contexts/DashboardPinnedContext';
import { useAuth } from '../../hooks/useAuth';
import { useFriends } from '../../contexts/FriendsContext';
import { useCommunities } from '../../contexts/CommunitiesContext';
import { fetchPlaces, type UserPlace } from '../../services/places';
import type { UserLocation } from '../../services/locations';
import { MapPin, UserPlus, Check, X, Trash2, Link2, Copy, ChevronDown, ChevronUp, Loader2, Users, Globe, MessageSquare, HandHeart } from 'lucide-react';
import { GopuramIcon } from '../icons/GopuramIcon';
import { getDistanceKm, normalizeDocumentId } from '../../lib/geo';
import PublishSpaceDialog from './PublishSpaceDialog';
import CommunityBoardDialog from './CommunityBoardDialog';
import LeaderboardWidget from './LeaderboardWidget';

export default function LeftRail({ onOpenAddTemple }: { onOpenAddTemple?: () => void } = {}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { savedLocations, activeLocationId, selectLocation, refreshLocations } = useLocation();
  const { friendNests } = useFriends();
  const { session } = useAuth();
  const { setPinToAssign, pinToAssign, pinnedListVersion } = useDashboardPinned();
  const [allPlaces, setAllPlaces] = useState<UserPlace[]>([]);
  const [friendPlaces, setFriendPlaces] = useState<UserPlace[]>([]);
  const [loadingPins, setLoadingPins] = useState(false);
  const [publishTarget, setPublishTarget] = useState<UserLocation | null>(null);

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
  }, [session?.user, pinnedListVersion]);

  useEffect(() => {
    const handlePlacesUpdated = () => {
      fetchPlaces()
        .then((places) => setAllPlaces(places))
        .catch(console.error);
    };
    window.addEventListener('places-updated', handlePlacesUpdated);
    return () => window.removeEventListener('places-updated', handlePlacesUpdated);
  }, []);

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
      <div className={`dashboard-card p-6`}>
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
          <button 
            onClick={onOpenAddTemple}
            className="w-full py-3 rounded-xl bg-[#0D9488] text-white font-medium hover:bg-[#09917d] transition-colors flex items-center justify-center gap-2 mb-6"
          >
            <span className="text-lg">+</span> Add to Nest
          </button>
        )}

        {/* Upcoming in Nest */}
        {plannedNestTemples.length > 0 && (
          <div>
            <p className="eyebrow mb-3">Next in Nest</p>
            <ul className="space-y-3">
              {plannedNestTemples.map(temple => (
                <li key={temple._id} className={`flex items-center gap-3 p-3 rounded-xl shadow-sm border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/5 text-[#141414]'} transition-transform hover:-translate-y-0.5 cursor-default`}>
                  <div className="w-8 h-8 rounded-full bg-[#0D9488]/10 flex items-center justify-center flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#0D9488]"></span>
                  </div>
                  <span className="truncate font-medium text-sm">{temple.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <LeaderboardWidget isDark={isDark} />

      {/* Workspaces Section */}
      {/* Divya Desams */}
      <div className={`dashboard-card p-6 ${isDark ? 'bg-gradient-to-br from-[#1a1b1e] to-[#141517]' : 'bg-gradient-to-br from-white to-[#fafafa]'}`}>
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <GopuramIcon className="w-4 h-4 text-[#0D9488]" /> Divya Desams
        </h2>
        <div className="space-y-2 mb-2">
          <a
            href="/nests"
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ${
              isDark
                ? 'text-white/70 hover:bg-white/5 hover:text-white'
                : 'text-[#6E6A63] hover:bg-black/5 hover:text-black'
            }`}
          >
            <GopuramIcon className="w-4 h-4 flex-shrink-0 opacity-40" />
            <span className="truncate">Explore Lists</span>
          </a>
          <a
            href="/dashboard/divyadesams"
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ${
              isDark
                ? 'text-white/70 hover:bg-white/5 hover:text-white'
                : 'text-[#6E6A63] hover:bg-black/5 hover:text-black'
            }`}
          >
            <GopuramIcon className="w-4 h-4 flex-shrink-0 opacity-40" />
            <span className="truncate">My Tracked Lists</span>
          </a>
        </div>
      </div>

      {/* My sacred spaces */}
      <div className={`dashboard-card p-6 ${isDark ? 'bg-gradient-to-br from-[#161719] to-[#111214] border-white/5 shadow-inner' : 'bg-gradient-to-br from-[#f8f9fa] to-white shadow-inner border-black/5'}`}>
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#0D9488]" /> My sacred spaces
        </h2>
        <div className="space-y-2">
          {savedLocations.length > 0 ? (
            savedLocations.map(loc => {
              const isActive = normalizeDocumentId(activeLocationId) === normalizeDocumentId(loc._id);
              const isPublished = loc.visibility === 'published';
              return (
                  <div
                    key={String(normalizeDocumentId(loc._id))}
                    className={`rounded-xl transition-all shadow-sm border ${
                      isActive
                        ? (isDark ? 'bg-white/10 border-white/20' : 'bg-[#0D9488]/10 border-[#0D9488]/20')
                        : (isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10')
                    }`}
                  >
                  <button
                    onClick={() => selectLocation(normalizeDocumentId(loc._id))}
                    className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 ${
                      isActive
                        ? (isDark ? 'text-[#2DD4BF] font-semibold' : 'text-[#0D9488] font-semibold')
                        : (isDark ? 'text-white/60 hover:text-white' : 'text-[#6E6A63] hover:text-black')
                    }`}
                  >
                    <MapPin className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0D9488]' : 'opacity-40'}`} />
                    <span className="truncate flex-1">{loc.name}</span>
                    {isPublished && (
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${isDark ? 'bg-[#0D9488]/25 text-[#2DD4BF]' : 'bg-[#0D9488]/15 text-[#0D9488]'}`}>
                        Public
                      </span>
                    )}
                  </button>
                  <div className="px-3 pb-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPublishTarget(loc)}
                      className={`text-[10px] px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${
                        isDark
                          ? 'border-white/15 text-white/55 hover:bg-white/5'
                          : 'border-black/10 text-[#6E6A63] hover:bg-black/5'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      {isPublished ? 'Edit publish' : 'Publish'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className={`text-[10px] px-3 py-4 text-center border border-dashed rounded-xl ${isDark ? 'border-white/10 text-white/40' : 'border-black/10 text-black/40'}`}>
              No sacred spaces saved yet. Set a location in the header to save one.
            </p>
          )}
        </div>
      </div>

      {/* Communities */}
      <CommunitiesWidget isDark={isDark} />

      {/* Pinned from Explore — assign to Nest / Interest on the map */}
      <div className={`dashboard-card p-6`}>
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

      {publishTarget && (
        <PublishSpaceDialog
          open={!!publishTarget}
          onOpenChange={(open) => {
            if (!open) setPublishTarget(null);
          }}
          location={publishTarget}
          onUpdated={() => {
            void refreshLocations();
          }}
        />
      )}
    </div>
  );
}

// ─── Communities Widget ──────────────────────────────────────────────────────
function CommunitiesWidget({ isDark }: { isDark: boolean }) {
  const {
    published,
    incomingInterests,
    loading,
    error,
    expressInterest,
    acceptInterest,
    rejectInterest,
    leave,
    refresh,
  } = useCommunities();
  const { selectLocation } = useLocation();
  const [boardSpace, setBoardSpace] = useState<{ id: string; name: string } | null>(null);
  const [interestMessage, setInterestMessage] = useState('');
  const [interestForId, setInterestForId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleInterest = async (spaceId: string) => {
    setBusyId(spaceId);
    setActionError(null);
    try {
      await expressInterest(spaceId, interestMessage.trim());
      setInterestForId(null);
      setInterestMessage('');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not send interest');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={`dashboard-card p-6`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#0D9488]" />
          Communities
          {published.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-white/10 text-white/60' : 'bg-black/5 text-[#6E6A63]'}`}>
              {published.length}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className={`text-[10px] ${isDark ? 'text-white/40 hover:text-white/70' : 'text-[#6E6A63] hover:text-black'}`}
        >
          Refresh
        </button>
      </div>

      <p className={`text-[11px] mb-3 ${isDark ? 'text-white/45' : 'text-[#6E6A63]'}`}>
        Published spaces open to everyone for pilgrimages and shared activity. Send Interest to join; hosts accept members. Decisions happen on the community board.
      </p>

      {incomingInterests.length > 0 && (
        <div className="mb-4">
          <p className={`text-[10px] uppercase tracking-wider font-medium mb-2 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
            Interest requests ({incomingInterests.length})
          </p>
          <div className="space-y-1.5">
            {incomingInterests.map((req) => (
              <div
                key={req._id}
                className={`px-3 py-2 rounded-lg ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'}`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{req.fromName || req.fromEmail}</p>
                    <p className={`text-[10px] truncate ${isDark ? 'text-white/40' : 'text-[#6E6A63]'}`}>
                      wants to join {req.spaceName}
                    </p>
                  </div>
                  <button
                    onClick={() => void acceptInterest(req._id)}
                    className={`w-6 h-6 rounded-md flex items-center justify-center ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-600'}`}
                    title="Accept"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => void rejectInterest(req._id)}
                    className={`w-6 h-6 rounded-md flex items-center justify-center ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'}`}
                    title="Decline"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {req.message ? (
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-white/50' : 'text-[#6E6A63]'}`}>{req.message}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {(error || actionError) && (
        <p className="text-[10px] text-red-500 mb-2">{actionError || error}</p>
      )}

      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
        {loading && published.length === 0 ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin opacity-40" />
          </div>
        ) : published.length === 0 ? (
          <p className={`text-[10px] px-3 py-4 text-center border border-dashed rounded-xl ${isDark ? 'border-white/10 text-white/40' : 'border-black/10 text-black/40'}`}>
            No published communities yet. Publish one of your sacred spaces to invite others.
          </p>
        ) : (
          published.map((c) => (
            <div
              key={c._id}
              className={`rounded-xl border p-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-[#e5e5e5] bg-black/[0.015]'}`}
            >
              <button
                type="button"
                onClick={() => selectLocation(c._id)}
                className="w-full text-left"
              >
                <p className="text-sm font-semibold truncate">{c.name}</p>
                <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/40' : 'text-[#6E6A63]'}`}>
                  Host · {c.ownerName} · {c.memberCount} member{c.memberCount === 1 ? '' : 's'}
                </p>
              </button>
              {c.purpose ? (
                <p className={`text-[11px] mt-2 line-clamp-2 ${isDark ? 'text-white/65' : 'text-[#141414]/75'}`}>
                  {c.purpose}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-1.5 mt-2">
                {(c.isMember || c.isOwner) && (
                  <button
                    type="button"
                    onClick={() => setBoardSpace({ id: c._id, name: c.name })}
                    className={`text-[10px] px-2 py-1 rounded-md border flex items-center gap-1 ${
                      isDark
                        ? 'border-[#0D9488]/40 text-[#2DD4BF] hover:bg-[#0D9488]/15'
                        : 'border-[#0D9488]/30 text-[#0D9488] hover:bg-[#0D9488]/10'
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    Board
                  </button>
                )}

                {!c.isOwner && !c.isMember && c.interestStatus !== 'pending' && (
                  interestForId === c._id ? (
                    <div className="w-full space-y-1.5 mt-1">
                      <input
                        value={interestMessage}
                        onChange={(e) => setInterestMessage(e.target.value)}
                        placeholder="Optional note to the host…"
                        className={`w-full px-2 py-1.5 rounded-md text-[11px] border outline-none ${
                          isDark
                            ? 'bg-white/5 border-white/10 text-white'
                            : 'bg-white border-black/10'
                        }`}
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === c._id}
                          onClick={() => void handleInterest(c._id)}
                          className="text-[10px] px-2 py-1 rounded-md bg-[#0D9488] text-white"
                        >
                          {busyId === c._id ? 'Sending…' : 'Send Interest'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setInterestForId(null)}
                          className={`text-[10px] px-2 py-1 rounded-md ${isDark ? 'text-white/50' : 'text-[#6E6A63]'}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setInterestForId(c._id)}
                      className={`text-[10px] px-2 py-1 rounded-md border flex items-center gap-1 ${
                        isDark
                          ? 'border-orange-400/30 text-orange-300 hover:bg-orange-400/10'
                          : 'border-orange-200 text-orange-700 hover:bg-orange-50'
                      }`}
                    >
                      <HandHeart className="w-3 h-3" />
                      Interested
                    </button>
                  )
                )}

                {c.interestStatus === 'pending' && !c.isMember && (
                  <span className={`text-[10px] px-2 py-1 rounded-md ${isDark ? 'bg-orange-500/15 text-orange-300' : 'bg-orange-50 text-orange-700'}`}>
                    Interest pending
                  </span>
                )}

                {c.isMember && !c.isOwner && (
                  <button
                    type="button"
                    onClick={() => void leave(c._id)}
                    className={`text-[10px] px-2 py-1 rounded-md ${isDark ? 'text-red-300/70 hover:text-red-300' : 'text-red-500/70 hover:text-red-600'}`}
                  >
                    Leave
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {boardSpace && (
        <CommunityBoardDialog
          open={!!boardSpace}
          onOpenChange={(open) => {
            if (!open) setBoardSpace(null);
          }}
          spaceId={boardSpace.id}
          spaceName={boardSpace.name}
        />
      )}
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
  const [inviteEmailInput, setInviteEmailInput] = useState('');
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
    const inviteEmail = inviteEmailInput.trim().toLowerCase();
    if (!inviteEmail) {
      setSendError('Enter the recipient email before generating an invite link');
      return;
    }
    setGeneratingLink(true);
    setSendError(null);
    try {
      const token = await getInviteLink(inviteEmail);
      setInviteToken(token);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to generate invite link');
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
          <div className="space-y-1.5">
            <input
              type="email"
              placeholder="Invite link for email..."
              value={inviteEmailInput}
              onChange={(e) => { setInviteEmailInput(e.target.value); setSendError(null); }}
              className={`w-full px-3 py-2 rounded-lg text-xs border outline-none transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/25' : 'bg-black/[0.02] border-black/10 text-[#141414] placeholder:text-black/30 focus:border-black/20'}`}
            />
            <button
              onClick={handleGenerateLink}
              disabled={generatingLink || !inviteEmailInput.trim()}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] border border-dashed transition-colors disabled:opacity-40 ${isDark ? 'border-white/15 text-white/50 hover:text-white/70 hover:border-white/25' : 'border-black/15 text-[#6E6A63] hover:text-[#141414] hover:border-black/25'}`}
            >
              {generatingLink ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
              Generate invite link
            </button>
          </div>
        ) : (
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
            <Link2 className="w-3 h-3 flex-shrink-0 opacity-40" />
            <span className="truncate flex-1 opacity-60">Invite for {inviteEmailInput.trim()}</span>
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
  const { friendNests, followNest, unfollowNest, loading } = useFriends();
  const { savedLocations, activeLocationId, deviceCoordinates, selectLocation } = useLocation();

  // Determine origin for distance calculation
  const activeLoc = savedLocations.find(l => normalizeDocumentId(l._id) === normalizeDocumentId(activeLocationId));
  const originCoords = activeLoc?.coordinates || deviceCoordinates;

  if (loading && friendNests.length === 0) {
    return (
      <div className={`dashboard-card p-6`}>
        <div className="flex items-center gap-2 py-2">
          <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-white/30' : 'text-black/20'}`} />
          <span className={`text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>Loading friend nests...</span>
        </div>
      </div>
    );
  }

  if (friendNests.length === 0) return null;

  // Process nests: prefer server follow state, with client distance retained for display fallback.
  const processedNests = friendNests.map(nest => {
    const distance = nest.distanceKm ?? (originCoords ? getDistanceKm(originCoords, nest.coordinates) : null);
    const isAutoFollowed = nest.followStatus === 'auto';
    const isManuallyFollowed = nest.followStatus === 'manual';
    const shouldShow = nest.canOpen;

    return { ...nest, distance, isAutoFollowed, isManuallyFollowed, shouldShow };
  });

  const visibleNests = processedNests.filter(n => n.shouldShow);
  const remoteNests = processedNests.filter(n => !n.canOpen);

  return (
    <div className={`dashboard-card p-6`}>
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
                      {nest.isAutoFollowed && (
                        <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-bold tracking-tighter ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                          Auto
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] truncate opacity-50`}>By {nest.ownerName} • {nest.distance?.toFixed(1)} km</p>
                  </div>
                  {nest.isManuallyFollowed && (
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
                    <p className="text-[9px] opacity-50 truncate">
                      By {nest.ownerName}{nest.distance != null ? ` • ${nest.distance.toFixed(0)} km away` : ''}
                    </p>
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
