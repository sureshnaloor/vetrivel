import { useTheme } from '../../hooks/useTheme';
import { MapPin, Info, Clock, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function RightRail() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'info' | 'pooja' | 'media' | 'chat'>('info');

  const tabs = [
    { id: 'info', label: 'Info', icon: Info },
    { id: 'pooja', label: 'Pooja', icon: Clock },
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'chat', label: 'Q&A', icon: MessageSquare },
  ] as const;

  return (
    <div className={`flex flex-col h-full rounded-2xl border overflow-hidden ${isDark ? 'bg-[#131418] border-white/10 text-white' : 'bg-white border-[#e5e5e5] text-[#141414] shadow-sm'}`}>
      
      {/* Context Header */}
      <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-[#e5e5e5]'}`}>
        <h2 className="font-display text-2xl font-semibold mb-2">Kashi Vishwanath</h2>
        <a href="#" className={`text-sm flex items-center gap-1 hover:underline ${isDark ? 'text-[#D13B3B]' : 'text-[#D13B3B]'}`}>
          <MapPin className="w-3.5 h-3.5" />
          Varanasi, UP (Open Map)
        </a>
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
      <div className="p-6 flex-1 overflow-y-auto">
        {activeTab === 'info' && (
          <div className="space-y-4 text-sm leading-relaxed">
            <p className="font-medium">AI Summary</p>
            <p className={isDark ? 'text-white/80' : 'text-[#141414]/80'}>
              Standing on the western bank of the holy river Ganga, this is one of the twelve Jyotirlingas, the holiest of Shiva temples. Standard dress code applies.
            </p>
            <button className="text-[#D13B3B] hover:underline mt-2">Read full history</button>
          </div>
        )}

        {activeTab === 'pooja' && (
          <div className="space-y-4">
            <p className="font-medium text-sm">Timings & Offerings</p>
            <div className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <div className="py-2 flex justify-between items-center">
                <span>Mangala Aarti</span>
                <span className="font-medium">04:30 AM</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span>Bhog Aarti</span>
                <span className="font-medium">11:30 AM</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span>Sandhya Aarti</span>
                <span className="font-medium">07:00 PM</span>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'media' && (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`aspect-square rounded border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}></div>
            ))}
          </div>
        )}
        
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <div className={`p-3 rounded-xl mb-auto text-sm ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
              What is the dress code?
            </div>
            <div className={`p-3 rounded-xl ml-4 mt-2 text-sm border ${isDark ? 'border-[#D13B3B]/30 bg-[#D13B3B]/10' : 'border-[#D13B3B]/30 bg-[#D13B3B]/5'}`}>
              <strong>AI Assistant:</strong> As per temple guidelines, men should wear dhoti-kurta, and women should wear sarees or salwar suits.
            </div>
            <div className="mt-4 relative">
              <input type="text" placeholder="Ask AI..." className={`w-full py-2 pl-3 pr-8 rounded-lg text-sm bg-transparent border focus:outline-none focus:border-[#D13B3B] ${isDark ? 'border-white/20' : 'border-gray-300'}`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
