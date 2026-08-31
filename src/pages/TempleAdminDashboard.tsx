import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Search, Settings } from 'lucide-react';
import DashboardShell from '../components/dashboard/DashboardShell';
import { useTheme } from '../hooks/useTheme';
import { useUserProfile } from '../hooks/useUserProfile';
import {
  assignTempleAdmin,
  claimTemple,
  fetchMyAdminTemples,
  searchGoogleTemples,
  type AdministeredTemple,
} from '../services/templeBook';

export default function TempleAdminDashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { profile } = useUserProfile();
  const [temples, setTemples] = useState<AdministeredTemple[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ placeId: string; name: string; address: string; coordinates: { lat: number; lng: number } }>
  >([]);
  const [searching, setSearching] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  const [assignEmail, setAssignEmail] = useState('');
  const [assignPlaceId, setAssignPlaceId] = useState('');
  const [assignName, setAssignName] = useState('');
  const [assignAddress, setAssignAddress] = useState('');

  const load = () => {
    setLoading(true);
    fetchMyAdminTemples()
      .then(setTemples)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const runSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const results = await searchGoogleTemples(searchQ.trim());
      setSearchResults(results);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleClaim = async (t: {
    placeId: string;
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
  }) => {
    setClaiming(t.placeId);
    try {
      await claimTemple({
        placeId: t.placeId,
        templeName: t.name,
        templeAddress: t.address,
        coordinates: t.coordinates,
      });
      load();
      setSearchResults([]);
      setSearchQ('');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Claim failed');
    } finally {
      setClaiming(null);
    }
  };

  const handleAssign = async () => {
    try {
      await assignTempleAdmin({
        userEmail: assignEmail,
        placeId: assignPlaceId,
        templeName: assignName,
        templeAddress: assignAddress,
      });
      alert('Temple admin assigned');
      setAssignEmail('');
      setAssignPlaceId('');
      setAssignName('');
      setAssignAddress('');
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Assign failed');
    }
  };

  return (
    <DashboardShell>
        <header className="mb-8">
          <h1 className="font-display text-4xl font-semibold mb-2 flex items-center gap-2">
            <Settings className="w-8 h-8 text-[#0D9488]" /> Temple admin
          </h1>
          <p className={`text-lg ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
            Create and manage booking pages for temples on Google Maps — puja, prasad, donations.
          </p>
          {profile?.isPlatformAdmin && (
            <p className={`mt-3 text-sm px-4 py-2 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-900'}`}>
              You are signed in as <strong>platform admin</strong>. Use the form below to approve
              temple hosts (grant role + link temple). Hosts cannot self-approve.
            </p>
          )}
        </header>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="font-semibold text-lg mb-4">Your temples</h2>
            {temples.length === 0 ? (
              <p className={isDark ? 'text-white/50' : 'text-[#6E6A63]'}>
                No temples linked yet. Search Google Maps below to claim yours.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {temples.map((t) => (
                  <Link
                    key={t.placeId}
                    to={`/temple-admin/${encodeURIComponent(t.placeId)}`}
                    className={`p-5 rounded-2xl border transition hover:border-[#0D9488]/50 ${
                      isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-white'
                    }`}
                  >
                    <h3 className="font-semibold text-lg">{t.templeName}</h3>
                    <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-[#6E6A63]'}`}>
                      {t.templeAddress || t.placeId}
                    </p>
                    <p className="mt-2 text-sm text-[#0D9488]">
                      {t.page?.isPublished ? 'Published' : 'Draft'} — Edit page →
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section
            className={`p-6 rounded-2xl border ${isDark ? 'border-white/10' : 'border-black/10'}`}
          >
            <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" /> Link a temple from Google Maps
            </h2>
            <div className="flex gap-2 mb-4">
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Temple name or area…"
                className={`flex-1 px-3 py-2 rounded-xl border ${
                  isDark ? 'bg-black/30 border-white/10' : 'border-black/10'
                }`}
              />
              <button
                onClick={runSearch}
                disabled={searching}
                className="px-4 py-2 rounded-xl bg-[#0D9488] text-white text-sm font-medium"
              >
                {searching ? '…' : 'Search'}
              </button>
            </div>
            <ul className="space-y-2">
              {searchResults.map((r) => (
                <li
                  key={r.placeId}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl ${
                    isDark ? 'bg-white/5' : 'bg-black/5'
                  }`}
                >
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs opacity-60">{r.address}</p>
                  </div>
                  <button
                    onClick={() => handleClaim(r)}
                    disabled={claiming === r.placeId}
                    className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm shrink-0"
                  >
                    {claiming === r.placeId ? '…' : 'Claim'}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {profile?.isPlatformAdmin && (
            <section
              className={`p-6 rounded-2xl border ${isDark ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-200 bg-amber-50'}`}
            >
              <h2 className="font-semibold text-lg mb-3">Platform: assign temple admin</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  placeholder="User email"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10' : ''}`}
                />
                <input
                  placeholder="Google place ID"
                  value={assignPlaceId}
                  onChange={(e) => setAssignPlaceId(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10' : ''}`}
                />
                <input
                  placeholder="Temple name"
                  value={assignName}
                  onChange={(e) => setAssignName(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10' : ''}`}
                />
                <input
                  placeholder="Address"
                  value={assignAddress}
                  onChange={(e) => setAssignAddress(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10' : ''}`}
                />
              </div>
              <button
                onClick={handleAssign}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Grant temple admin + assign temple
              </button>
            </section>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
