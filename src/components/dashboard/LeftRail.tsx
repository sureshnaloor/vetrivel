import { useTheme } from '../../hooks/useTheme';
import { useLocation } from '../../contexts/LocationContext';
import { MapPin } from 'lucide-react';

export default function LeftRail() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { savedLocations, activeLocationId, selectLocation } = useLocation();

  return (
    <div className={`flex flex-col gap-6 h-full ${isDark ? 'text-white' : 'text-[#141414]'}`}>
      {/* Nest Progress Widget */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'}`}>
        <h2 className="font-display text-xl font-semibold mb-4">My Nest</h2>
        
        {/* Placeholder Circular Progress */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-[#0D9488] flex items-center justify-center">
            <span className="font-semibold text-sm">2/6</span>
          </div>
          <div>
            <p className="text-sm font-medium">Temples Visited</p>
            <p className={`text-xs ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>Keep exploring!</p>
          </div>
        </div>

        {/* Add CTA */}
        <button className="w-full py-3 rounded-xl bg-[#0D9488] text-white font-medium hover:bg-[#09917d] transition-colors flex items-center justify-center gap-2 mb-6">
          <span className="text-lg">+</span> Add to Nest
        </button>

        {/* Upcoming in Nest */}
        <div>
          <p className="eyebrow mb-3">Next in Nest</p>
          <ul className={`space-y-3 text-sm ${isDark ? 'text-white/80' : 'text-[#141414]/80'}`}>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]"></span> Kashi Vishwanath</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]"></span> Tirupati Balaji</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]"></span> Jagannath Puri</li>
          </ul>
        </div>
      </div>

      {/* Workspaces Section */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'}`}>
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#0D9488]" /> My sacred spaces
        </h2>
        <div className="space-y-2">
          {savedLocations.length > 0 ? (
            savedLocations.map(loc => (
              <button 
                key={loc._id}
                onClick={() => selectLocation(loc._id || null)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ${
                  activeLocationId === loc._id
                    ? (isDark ? 'bg-[#0D9488]/20 text-[#2DD4BF] font-semibold' : 'bg-[#0D9488]/10 text-[#0D9488] font-semibold')
                    : (isDark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-[#6E6A63] hover:bg-black/5 hover:text-black')
                }`}
              >
                <MapPin className={`w-4 h-4 ${activeLocationId === loc._id ? 'text-[#0D9488]' : 'opacity-40'}`} />
                <span className="truncate">{loc.name}</span>
              </button>
            ))
          ) : (
            <p className={`text-[10px] px-3 py-4 text-center border border-dashed rounded-xl ${isDark ? 'border-white/10 text-white/40' : 'border-black/10 text-black/40'}`}>
              No sacred spaces saved yet. Set a location in the header to save one.
            </p>
          )}
        </div>
      </div>

      {/* Following Feed */}
      <div className={`p-6 rounded-2xl border flex-1 ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'}`}>
        <h2 className="font-display text-lg font-semibold mb-4">Following Feed</h2>
        <div className="space-y-5">
          <div className="flex gap-3">
            <div className={`w-8 h-8 rounded-full flex-shrink-0 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}></div>
            <div>
              <p className="text-sm"><strong>ISKCON</strong> posted:</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-white/70' : 'text-[#6E6A63]'}`}>"Special Janmashtami Pooja registration is now open."</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className={`w-8 h-8 rounded-full flex-shrink-0 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}></div>
            <div>
              <p className="text-sm"><strong>@riya_m</strong> visited</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-white/70' : 'text-[#6E6A63]'}`}>Ram Mandir, Ayodhya.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
