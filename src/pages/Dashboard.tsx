import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import Navigation from '../components/Navigation';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useFriends } from '../contexts/FriendsContext';
import { Plus, Maximize, Bell, CheckCircle2, XCircle } from 'lucide-react';

import LeftRail from '../components/dashboard/LeftRail';
import CenterColumn from '../components/dashboard/CenterColumn';
import RightRail from '../components/dashboard/RightRail';
import DashboardFooter from '../components/dashboard/DashboardFooter';
import LocationSelector from '../components/dashboard/LocationSelector';
import NearbySuggestionWidget from '../components/dashboard/NearbySuggestionWidget';
import { DashboardPinnedProvider } from '../contexts/DashboardPinnedContext';
import { SelectedTempleProvider } from '../contexts/SelectedTempleContext';
import AddTempleDialog from '../components/dashboard/AddTempleDialog';

export default function Dashboard() {
  const { session } = useAuth();
  const { theme } = useTheme();
  const { acceptInvite } = useFriends();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inviteToast, setInviteToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isAddTempleOpen, setIsAddTempleOpen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  const isDark = theme === 'dark';

  // GSAP Entrance Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to('.dashboard-header-animate', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
      gsap.to('.dashboard-col-animate', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        delay: 0.1
      });
    }, dashboardRef);

    return () => ctx.revert();
  }, []);

  // Auto-accept invite link from URL
  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (!inviteToken || !session?.user) return;

    // Remove the param from URL immediately to prevent re-processing
    searchParams.delete('invite');
    setSearchParams(searchParams, { replace: true });

    acceptInvite(inviteToken)
      .then((msg) => {
        setInviteToast({ type: 'success', message: msg || 'You are now friends!' });
        setTimeout(() => setInviteToast(null), 5000);
      })
      .catch((e: any) => {
        setInviteToast({ type: 'error', message: e.message || 'Failed to accept invite' });
        setTimeout(() => setInviteToast(null), 5000);
      });
  }, [searchParams, session]);

  return (
    <DashboardPinnedProvider>
    <SelectedTempleProvider>
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-[#F4F1EA] text-[#141414]'}`}>
      
      {/* 
        We use Navigation which has the standard logo.
        To maintain the full screen "app" feel, Dashboard gets its own tight padding top.
      */}
      <Navigation />

      {/* Invite Toast */}
      {inviteToast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all animate-[fadeIn_0.3s_ease-out] ${
          inviteToast.type === 'success'
            ? (isDark ? 'bg-green-900/90 text-green-200 border border-green-700/50' : 'bg-green-50 text-green-800 border border-green-200')
            : (isDark ? 'bg-red-900/90 text-red-200 border border-red-700/50' : 'bg-red-50 text-red-800 border border-red-200')
        }`}>
          {inviteToast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {inviteToast.message}
        </div>
      )}

      <main className="max-w-[1600px] mx-auto pt-24 pb-12 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col" ref={dashboardRef}>
        
        {/* Top Bar / Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 flex-shrink-0 dashboard-header-animate opacity-0 translate-y-4">
          <div>
            <h1 className="font-display text-4xl font-semibold">
              Namaste, {session?.user?.name?.split(' ')[0] || 'Devotee'} 🙏
            </h1>
            <p className={`text-lg mt-1 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
              Your spiritual journey, mapped and guided.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {/* Location Toggle */}
            <LocationSelector />

            {/* Quick Actions */}
            <button 
              onClick={() => setIsAddTempleOpen(true)}
              className="btn-primary whitespace-nowrap !px-4 !py-2 !text-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Temple
            </button>
            <button className="btn-secondary !p-3 rounded-full flex-shrink-0" title="Scan QR">
              <Maximize className="w-4 h-4" />
            </button>
            <button className="btn-secondary !p-3 rounded-full relative flex-shrink-0" title="Notifications">
              <Bell className="w-4 h-4" />
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-[#D13B3B] border-2 border-[var(--page-bg)]"></span>
            </button>
          </div>
        </header>

        {/* 3-Column Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 pb-4 pt-4">
          
          {/* Left Rail (25%) */}
          <div className="lg:col-span-1 dashboard-col-animate opacity-0 translate-y-8">
            <LeftRail onOpenAddTemple={() => setIsAddTempleOpen(true)} />
          </div>

          {/* Center Column (50%) */}
          <div className="lg:col-span-2 px-1 dashboard-col-animate opacity-0 translate-y-8">
            <CenterColumn />
          </div>

          {/* Right Rail (25%) */}
          <div className="lg:col-span-1 dashboard-col-animate opacity-0 translate-y-8">
            <RightRail />
          </div>

        </div>
      </main>

      {/* Floating Nearby Widget */}
      <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full">
        <NearbySuggestionWidget />
      </div>

      {/* Dashboard Specific Footer */}
      <DashboardFooter />

      <AddTempleDialog
        open={isAddTempleOpen}
        onOpenChange={setIsAddTempleOpen}
      />
    </div>
    </SelectedTempleProvider>
    </DashboardPinnedProvider>
  );
}
