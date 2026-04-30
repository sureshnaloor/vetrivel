import { useTheme } from '../../hooks/useTheme';
import { useSelectedTemple } from '../../contexts/SelectedTempleContext';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../hooks/useAuth';
import { fetchTempleContent, createTempleContent, deleteTempleContent, getTempleKey, type TempleContent } from '../../services/templeContent';
import { MapPin, Info, Clock, Image as ImageIcon, MessageSquare, ExternalLink, Loader2, Trash2, Plus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface PlaceDetails {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { weekday_text?: string[] };
  reviews?: google.maps.places.PlaceReview[];
  editorial_summary?: { overview?: string };
  photos?: google.maps.places.PlacePhoto[];
  url?: string; // Google Maps URL
  types?: string[];
}

export default function RightRail() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { selectedTemple } = useSelectedTemple();
  const { isLoaded } = useLocation();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'pooja' | 'media' | 'qa'>('info');
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  const serviceRef = useRef<google.maps.places.PlacesService | null>(null);

  // UGC State
  const [ugcList, setUgcList] = useState<TempleContent[]>([]);
  const [loadingUgc, setLoadingUgc] = useState(false);
  const [ugcInput, setUgcInput] = useState('');
  const [isSubmittingUgc, setIsSubmittingUgc] = useState(false);
  const [showUgcForm, setShowUgcForm] = useState(false);

  const tabs = [
    { id: 'info', label: 'Info', icon: Info },
    { id: 'pooja', label: 'Pooja', icon: Clock },
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'qa', label: 'Q&A', icon: MessageSquare },
  ] as const;

  const templeKey = selectedTemple ? getTempleKey(selectedTemple.placeId, selectedTemple.name) : null;

  // Fetch place details when selected temple changes
  useEffect(() => {
    if (!selectedTemple || !isLoaded) {
      setPlaceDetails(null);
      setPhotoUrls([]);
      return;
    }

    // If no placeId, set basic info from what we have
    if (!selectedTemple.placeId) {
      setPlaceDetails({
        name: selectedTemple.name,
        rating: selectedTemple.rating,
        user_ratings_total: selectedTemple.userRatingsTotal,
      });
      setPhotoUrls([]);
      return;
    }

    setLoadingDetails(true);

    // Create service if needed
    if (!serviceRef.current) {
      const mapDiv = document.createElement('div');
      serviceRef.current = new window.google.maps.places.PlacesService(mapDiv);
    }

    serviceRef.current.getDetails(
      {
        placeId: selectedTemple.placeId,
        fields: [
          'name', 'formatted_address', 'formatted_phone_number', 'website',
          'rating', 'user_ratings_total', 'opening_hours', 'reviews',
          'editorial_summary', 'photos', 'url', 'types'
        ],
      },
      (result, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
          setPlaceDetails({
            name: result.name,
            formatted_address: result.formatted_address,
            formatted_phone_number: result.formatted_phone_number,
            website: result.website,
            rating: result.rating,
            user_ratings_total: result.user_ratings_total,
            opening_hours: result.opening_hours ? { weekday_text: result.opening_hours.weekday_text } : undefined,
            reviews: result.reviews,
            editorial_summary: (result as any).editorial_summary,
            photos: result.photos,
            url: result.url,
            types: result.types,
          });

          // Extract photo URLs
          if (result.photos && result.photos.length > 0) {
            const urls = result.photos.slice(0, 8).map(photo =>
              photo.getUrl({ maxWidth: 600, maxHeight: 400 })
            );
            setPhotoUrls(urls);
          } else {
            setPhotoUrls([]);
          }
        } else {
          setPlaceDetails({
            name: selectedTemple.name,
            rating: selectedTemple.rating,
            user_ratings_total: selectedTemple.userRatingsTotal,
          });
          setPhotoUrls([]);
        }
        setLoadingDetails(false);
      }
    );
  }, [selectedTemple, isLoaded]);

  // Fetch UGC
  useEffect(() => {
    if (templeKey) {
      setLoadingUgc(true);
      fetchTempleContent(templeKey)
        .then(setUgcList)
        .catch(console.error)
        .finally(() => setLoadingUgc(false));
    } else {
      setUgcList([]);
    }
  }, [templeKey]);

  // Handle Tab change to clear form
  useEffect(() => {
    setShowUgcForm(false);
    setUgcInput('');
  }, [activeTab]);

  const handleAddUgc = async () => {
    if (!templeKey || !session?.user) return;
    if (!ugcInput.trim() && activeTab !== 'media') return;

    setIsSubmittingUgc(true);
    try {
      const newEntry = await createTempleContent({
        templeKey,
        tab: activeTab as any,
        content: activeTab === 'media' ? 'Photo' : ugcInput, // Need to handle file upload
      });
      setUgcList(prev => [newEntry, ...prev]);
      setUgcInput('');
      setShowUgcForm(false);
    } catch (e) {
      console.error(e);
      alert('Failed to add content');
    } finally {
      setIsSubmittingUgc(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !templeKey || !session?.user) return;
    
    if (file.size > 2_000_000) {
      alert("File size exceeds 2MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setIsSubmittingUgc(true);
      try {
        const newEntry = await createTempleContent({
          templeKey,
          tab: 'media',
          content: 'User uploaded photo',
          mediaUrl: base64,
          mediaType: file.type
        });
        setUgcList(prev => [newEntry, ...prev]);
      } catch (e) {
        console.error(e);
        alert('Failed to upload photo');
      } finally {
        setIsSubmittingUgc(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteUgc = async (id: string) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      const success = await deleteTempleContent(id);
      if (success) {
        setUgcList(prev => prev.filter(c => c._id !== id));
      }
    } catch (e) {
      console.error(e);
      alert('Failed to delete content');
    }
  };

  const openGoogleMaps = () => {
    if (placeDetails?.url) {
      window.open(placeDetails.url, '_blank', 'noopener');
    } else if (selectedTemple) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${selectedTemple.coordinates.lat},${selectedTemple.coordinates.lng}`,
        '_blank', 'noopener'
      );
    }
  };

  const openWikipedia = () => {
    const name = placeDetails?.name || selectedTemple?.name || '';
    window.open(`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(name)}`, '_blank', 'noopener');
  };

  const displayName = placeDetails?.name || selectedTemple?.name || 'Select a Temple';
  const displayAddress = placeDetails?.formatted_address || selectedTemple?.vicinity || '';
  const summary = (placeDetails as any)?.editorial_summary?.overview || null;

  const currentUgc = ugcList.filter(item => item.tab === activeTab);

  // Empty state — no temple selected
  if (!selectedTemple) {
    return (
      <div className={`flex flex-col h-full rounded-2xl border overflow-hidden ${isDark ? 'bg-[#131418] border-white/10 text-white' : 'bg-white border-[#e5e5e5] text-[#141414] shadow-sm'}`}>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <style>{`
              @keyframes temple-breathe { 0%,100%{opacity:.3;transform:scale(.95)} 50%{opacity:.6;transform:scale(1)} }
              .empty-temple { animation: temple-breathe 3s ease-in-out infinite; transform-origin: center; }
            `}</style>
            <path className="empty-temple" d="M32 8L42 22H22L32 8Z" fill={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(209,59,59,0.08)'} stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(209,59,59,0.2)'} strokeWidth="1.5"/>
            <rect className="empty-temple" x="18" y="22" width="28" height="6" rx="1" fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(209,59,59,0.06)'} stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(209,59,59,0.15)'} strokeWidth="1.5" style={{animationDelay: '0.4s'}}/>
            <rect className="empty-temple" x="20" y="28" width="24" height="24" rx="1" fill={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(209,59,59,0.04)'} stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(209,59,59,0.12)'} strokeWidth="1.5" style={{animationDelay: '0.8s'}}/>
            <rect className="empty-temple" x="28" y="38" width="8" height="14" rx="1" fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(209,59,59,0.08)'} style={{animationDelay: '1.2s'}}/>
            <line x1="12" y1="52" x2="52" y2="52" stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(209,59,59,0.12)'} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div>
            <p className={`font-display text-lg font-semibold mb-1 ${isDark ? 'text-white/60' : 'text-black/50'}`}>No temple selected</p>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-white/35' : 'text-black/30'}`}>
              Click on a temple card, map marker, or nest item to see its details, photos, and history here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderUgcSection = (title: string, placeholder: string) => (
    <div className={`mt-6 pt-6 border-t ${isDark ? 'border-white/10' : 'border-[#e5e5e5]'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-sm">{title}</h3>
        {session?.user && !showUgcForm && activeTab !== 'media' && (
          <button onClick={() => setShowUgcForm(true)} className="text-[#D13B3B] text-xs hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
        {session?.user && activeTab === 'media' && (
          <label className="text-[#D13B3B] text-xs hover:underline flex items-center gap-1 cursor-pointer">
            <Plus className="w-3 h-3" /> Upload Photo
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        )}
      </div>

      {showUgcForm && activeTab !== 'media' && (
        <div className={`p-3 rounded-lg border mb-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#f8f8f8] border-[#e5e5e5]'}`}>
          <textarea
            value={ugcInput}
            onChange={e => setUgcInput(e.target.value)}
            placeholder={placeholder}
            className={`w-full text-sm bg-transparent border-none focus:ring-0 p-0 resize-none ${isDark ? 'text-white' : 'text-black'}`}
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowUgcForm(false)} className={`text-xs px-3 py-1.5 rounded ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'}`}>Cancel</button>
            <button onClick={handleAddUgc} disabled={isSubmittingUgc} className="text-xs px-3 py-1.5 rounded bg-[#D13B3B] text-white hover:bg-[#B93232] disabled:opacity-50">
              {isSubmittingUgc ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
      
      {!session?.user && (
         <p className={`text-xs italic mb-4 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Log in to add your own content.</p>
      )}

      {loadingUgc ? (
        <div className="flex justify-center p-4">
           <Loader2 className="w-4 h-4 animate-spin text-[#D13B3B]" />
        </div>
      ) : currentUgc.length > 0 ? (
        activeTab === 'media' ? (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {currentUgc.map(item => (
              <div key={item._id} className="relative group aspect-square rounded-lg border overflow-hidden border-[#e5e5e5] dark:border-white/10">
                {item.mediaUrl && <img src={item.mediaUrl} alt="User upload" className="w-full h-full object-cover" />}
                {session?.user?.email === item.userEmail && (
                   <button onClick={() => item._id && handleDeleteUgc(item._id)} className="absolute top-1 right-1 p-1.5 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                     <Trash2 className="w-3 h-3" />
                   </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {currentUgc.map(item => (
              <div key={item._id} className={`p-3 rounded-lg text-sm border relative group ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/[0.02] border-[#e5e5e5]'}`}>
                <p className={`text-xs mb-1 font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{item.userName}</p>
                <p className="whitespace-pre-wrap">{item.content}</p>
                {session?.user?.email === item.userEmail && (
                  <button onClick={() => item._id && handleDeleteUgc(item._id)} className="absolute top-2 right-2 p-1.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <p className={`text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>No community content yet.</p>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col h-full rounded-2xl border overflow-hidden ${isDark ? 'bg-[#131418] border-white/10 text-white' : 'bg-white border-[#e5e5e5] text-[#141414] shadow-sm'}`}>
      
      {/* Context Header */}
      <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-[#e5e5e5]'}`}>
        {loadingDetails ? (
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#D13B3B]" />
            <span className={`text-sm ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>Loading details…</span>
          </div>
        ) : (
          <>
            <h2 className="font-display text-2xl font-semibold mb-2 leading-tight">{displayName}</h2>
            <button
              onClick={openGoogleMaps}
              className={`text-sm flex items-center gap-1 hover:underline transition-colors ${isDark ? 'text-[#D13B3B]' : 'text-[#D13B3B]'}`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {displayAddress ? `${displayAddress.split(',').slice(0, 2).join(',')}` : 'View Location'} (Open Map)
            </button>
            {placeDetails?.rating && (
              <div className={`flex items-center gap-2 mt-2 text-xs ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
                <span>⭐ {placeDetails.rating}</span>
                {placeDetails.user_ratings_total && (
                  <span className="opacity-60">({placeDetails.user_ratings_total} reviews)</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex border-b overflow-x-auto hide-scrollbar ${isDark ? 'border-white/10' : 'border-[#e5e5e5]'}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center p-3 gap-1 border-b-2 transition-colors ${
                isActive 
                  ? 'border-[#D13B3B] text-[#D13B3B]' 
                  : `border-transparent ${isDark ? 'text-white/50 hover:text-white/80' : 'text-[#6E6A63] hover:text-[#141414]'}`
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="p-6 flex-1 overflow-y-auto relative">
        {isSubmittingUgc && activeTab === 'media' && (
           <div className="absolute inset-0 z-10 bg-white/50 dark:bg-black/50 flex justify-center items-center backdrop-blur-sm">
             <Loader2 className="w-8 h-8 animate-spin text-[#D13B3B]" />
           </div>
        )}
        
        {activeTab === 'info' && (
          <div className="space-y-4 text-sm leading-relaxed">
            {loadingDetails ? (
              <div className="space-y-3">
                <div className={`h-4 rounded w-1/3 ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />
                <div className={`h-3 rounded w-full ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`} />
                <div className={`h-3 rounded w-5/6 ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`} />
                <div className={`h-3 rounded w-2/3 ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`} />
              </div>
            ) : (
              <>
                {summary && (
                  <>
                    <p className="font-medium">About</p>
                    <p className={isDark ? 'text-white/80' : 'text-[#141414]/80'}>
                      {expandedHistory ? summary : summary.slice(0, 200) + (summary.length > 200 ? '…' : '')}
                    </p>
                    {summary.length > 200 && (
                      <button
                        onClick={() => setExpandedHistory(!expandedHistory)}
                        className="text-[#D13B3B] hover:underline text-xs"
                      >
                        {expandedHistory ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </>
                )}
                {!summary && (
                  <>
                    <p className="font-medium">About</p>
                    <p className={isDark ? 'text-white/60' : 'text-[#141414]/60'}>
                      No editorial summary available for this temple. You can learn more through external sources.
                    </p>
                  </>
                )}

                {/* Read full history — Wikipedia */}
                <button
                  onClick={openWikipedia}
                  className="text-[#D13B3B] hover:underline flex items-center gap-1.5"
                >
                  Read full history <ExternalLink className="w-3 h-3" />
                </button>

                {/* Contact & Links */}
                {(placeDetails?.formatted_phone_number || placeDetails?.website) && (
                  <div className={`mt-4 pt-4 border-t space-y-2 ${isDark ? 'border-white/10' : 'border-[#e5e5e5]'}`}>
                    {placeDetails.formatted_phone_number && (
                      <p className={`text-xs ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
                        📞 {placeDetails.formatted_phone_number}
                      </p>
                    )}
                    {placeDetails.website && (
                      <a
                        href={placeDetails.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#D13B3B] hover:underline flex items-center gap-1"
                      >
                        🌐 Official Website <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* Reviews snippet */}
                {placeDetails?.reviews && placeDetails.reviews.length > 0 && (
                  <div className={`mt-4 pt-4 border-t space-y-3 ${isDark ? 'border-white/10' : 'border-[#e5e5e5]'}`}>
                    <p className="font-medium text-xs uppercase tracking-wider opacity-60">Recent Reviews</p>
                    {placeDetails.reviews.slice(0, 2).map((review, i) => (
                      <div key={i} className={`p-3 rounded-lg text-xs ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{review.author_name?.split(' ')[0] || 'User'}</span>
                          <span>{'⭐'.repeat(Math.min(review.rating || 0, 5))}</span>
                        </div>
                        <p className={`line-clamp-3 ${isDark ? 'text-white/70' : 'text-[#141414]/70'}`}>
                          {review.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {renderUgcSection("Community Notes", "Share something about this temple...")}
              </>
            )}
          </div>
        )}

        {activeTab === 'pooja' && (
          <div className="space-y-4">
            <p className="font-medium text-sm">Timings & Offerings</p>
            {placeDetails?.opening_hours?.weekday_text && placeDetails.opening_hours.weekday_text.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                {placeDetails.opening_hours.weekday_text.map((text, i) => {
                  const [day, ...timeParts] = text.split(':');
                  const time = timeParts.join(':').trim();
                  return (
                    <div key={i} className="py-2 flex justify-between items-center">
                      <span className={`text-xs ${isDark ? 'text-white/70' : 'text-[#141414]/70'}`}>{day?.trim()}</span>
                      <span className="font-medium text-xs">{time || 'N/A'}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`p-4 rounded-xl text-center text-xs ${isDark ? 'bg-white/5 text-white/40' : 'bg-black/[0.03] text-black/40'}`}>
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p>Opening hours not available from Google Places.</p>
                <p className="mt-1 opacity-60">Check the temple's official website for pooja timings.</p>
              </div>
            )}
            
            {renderUgcSection("Community Pooja Timings", "Add a pooja timing (e.g., 'Ganesh Pooja at 6 AM')")}
          </div>
        )}
        
        {activeTab === 'media' && (
          <div className="space-y-3">
            {loadingDetails ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`aspect-square rounded-lg animate-pulse ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
                ))}
              </div>
            ) : photoUrls.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {photoUrls.map((url, i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-lg border overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] ${isDark ? 'border-white/10' : 'border-[#e5e5e5]'}`}
                      onClick={() => setSelectedPhotoIdx(i)}
                    >
                      <img
                        src={url}
                        alt={`${displayName} photo ${i + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
                <p className={`text-[10px] text-center ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                  Photos from Google Places · {photoUrls.length} available
                </p>
              </>
            ) : (
              <div className={`p-6 rounded-xl text-center ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
                <ImageIcon className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-white/20' : 'text-black/15'}`} />
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  No photos available for this temple.
                </p>
              </div>
            )}
            
            {renderUgcSection("Community Photos", "")}
          </div>
        )}
        
        {activeTab === 'qa' && (
          <div className="space-y-4">
             {/* AI Summary Stub */}
             <p className="font-medium text-sm">AI Assistant</p>
             <div className="h-full flex flex-col mb-4">
              <div className={`p-3 rounded-xl ml-4 mt-2 text-sm border ${isDark ? 'border-[#D13B3B]/30 bg-[#D13B3B]/10' : 'border-[#D13B3B]/30 bg-[#D13B3B]/5'}`}>
                <strong>AI Assistant:</strong>{' '}
                {summary
                  ? summary.slice(0, 150) + (summary.length > 150 ? '…' : '')
                  : `${displayName} is a Hindu temple${displayAddress ? ` located in ${displayAddress.split(',')[0]}` : ''}.`}
              </div>
            </div>
            
            {renderUgcSection("Community Q&A", "Ask a question or share an answer...")}
          </div>
        )}
      </div>

      {/* Photo Lightbox */}
      {selectedPhotoIdx !== null && photoUrls.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedPhotoIdx(null)}
          />
          <div className="fixed inset-4 z-[210] flex items-center justify-center">
            <img
              src={photoUrls[selectedPhotoIdx]}
              alt={`${displayName} full photo`}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={() => setSelectedPhotoIdx(null)}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {photoUrls.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setSelectedPhotoIdx(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${i === selectedPhotoIdx ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'}`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
