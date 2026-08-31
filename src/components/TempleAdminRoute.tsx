import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
import TempleAdminOnboarding from './TempleAdminOnboarding';

/** Temple admin area — shows onboarding if user lacks temple admin access. */
export default function TempleAdminRoute() {
  const { profile, loading, error } = useUserProfile();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white px-6 text-center">
        <div>
          <p className="text-red-400 mb-2">Could not load your profile.</p>
          <p className="text-sm text-white/60">
            The API server may be down. Run <code className="text-[#2DD4BF]">npm run dev</code>{' '}
            (starts Vite + Express on port 3000).
          </p>
          <p className="text-xs text-white/40 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile?.isTempleAdmin) {
    return <TempleAdminOnboarding />;
  }

  return <Outlet />;
}
