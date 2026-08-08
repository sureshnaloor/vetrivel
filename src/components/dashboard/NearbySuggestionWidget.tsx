import { useNearbyTemples } from '../../hooks/useNearbyTemples';
import { useTheme } from '../../hooks/useTheme';
import { MapPin, Navigation, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function NearbySuggestionWidget() {
  const { suggestions, isCalculating } = useNearbyTemples(25); // 25km radius
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (isCalculating && suggestions.length === 0) {
    return (
      <div className={`p-4 rounded-2xl border flex items-center justify-center gap-2 ${
        isDark ? 'bg-[#1a1b23] border-white/10 text-white/60' : 'bg-white border-[#e5e5e5] text-black/60'
      }`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Scanning for nearby temples...</span>
      </div>
    );
  }

  const activeSuggestions = suggestions.filter(s => !dismissed.has(s.placeId));

  if (activeSuggestions.length === 0) {
    return null;
  }

  const suggestion = activeSuggestions[0]; // Show the closest one

  const totalTimeMins = suggestion.journeyTimeMins + suggestion.insideTimeMins;
  const hours = Math.floor(totalTimeMins / 60);
  const mins = totalTimeMins % 60;
  const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const handleDismiss = () => {
    setDismissed(prev => new Set(prev).add(suggestion.placeId));
  };

  const handleNavigate = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${suggestion.coordinates.lat},${suggestion.coordinates.lng}`, '_blank');
  };

  return (
    <div className={`relative p-5 rounded-3xl border shadow-lg overflow-hidden ${
      isDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'
    }`}>
      <div className="absolute top-0 right-0 p-4">
        <button onClick={handleDismiss} className={`text-sm font-medium ${isDark ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'}`}>
          Dismiss
        </button>
      </div>

      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
          isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
        }`}>
          <MapPin className="w-6 h-6" />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isDark ? 'bg-indigo-500/30 text-indigo-300' : 'bg-indigo-200 text-indigo-700'
            }`}>
              Nearby {suggestion.source === 'list' ? 'in ' + suggestion.listName : 'in ' + suggestion.source}
            </span>
          </div>
          
          <h3 className={`font-semibold text-lg mb-1 ${isDark ? 'text-white' : 'text-[#141414]'}`}>
            {suggestion.name}
          </h3>
          
          <p className={`text-sm flex items-center gap-3 ${isDark ? 'text-white/70' : 'text-[#6E6A63]'}`}>
            <span className="flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5" />
              {suggestion.distanceText} ({suggestion.journeyTimeMins}m drive)
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Total visit: ~{timeString}
            </span>
          </p>

          {!suggestion.isOpen && suggestion.closingWarning && (
            <div className={`mt-3 p-2 rounded-lg flex items-start gap-2 text-sm ${
              isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{suggestion.closingWarning}</p>
            </div>
          )}
          {suggestion.isOpen && suggestion.closingWarning && (
            <div className={`mt-3 p-2 rounded-lg flex items-start gap-2 text-sm ${
              isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{suggestion.closingWarning}</p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleNavigate}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Start Navigation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
