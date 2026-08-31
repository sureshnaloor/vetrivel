import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Settings, Search } from 'lucide-react';
import Navigation from '../components/Navigation';
import { useTheme } from '../hooks/useTheme';
import { useUserProfile } from '../hooks/useUserProfile';
import { fetchPublishedTemplePages } from '../services/templeBook';
import type { TemplePage } from '../services/templeBook';
import { GopuramIcon as Gopuram } from '../components/icons/GopuramIcon';

export default function BookPoojas() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { profile } = useUserProfile();
  const [pages, setPages] = useState<TemplePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublishedTemplePages()
      .then(setPages)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#F4F1EA] text-[#141414]'
      }`}
    >
      <Navigation />
      <main className="max-w-5xl mx-auto pt-28 pb-16 px-4 sm:px-6">
        <header className="mb-10">
          <h1 className="font-display text-4xl font-semibold mb-3">Book Puja & Offerings</h1>
          <p className={`text-lg max-w-2xl ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
            Small temples can host bookings here — puja, prasad, donations via UPI or bank transfer.
            Browse temples with official pages below.
          </p>
          {profile?.isTempleAdmin && (
            <Link
              to="/temple-admin"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D9488] text-white text-sm font-medium hover:bg-[#09917d]"
            >
              <Settings className="w-4 h-4" /> Manage my temple pages
            </Link>
          )}
        </header>

        {loading ? (
          <div className="flex items-center gap-2 py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading temples…</span>
          </div>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : pages.length === 0 ? (
          <div
            className={`p-10 rounded-2xl border border-dashed text-center ${
              isDark ? 'border-white/10 text-white/50' : 'border-black/10'
            }`}
          >
            <Gopuram className="w-10 h-10 mx-auto mb-4 opacity-40" />
            <p>No temple booking pages published yet.</p>
            {profile?.isTempleAdmin && (
              <Link to="/temple-admin" className="mt-4 text-[#0D9488] underline">
                Set up your temple page
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pages.map((page) => (
              <Link
                key={page.placeId}
                to={`/poojas/${encodeURIComponent(page.placeId)}`}
                className={`p-6 rounded-2xl border transition-transform hover:-translate-y-1 ${
                  isDark
                    ? 'bg-[#131418] border-white/10 hover:border-[#0D9488]/40'
                    : 'bg-white border-[#e5e5e5] shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Gopuram className="w-6 h-6 text-[#0D9488] shrink-0 mt-1" />
                  <div>
                    <h2 className="font-display text-xl font-semibold">{page.name}</h2>
                    {page.address && (
                      <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-[#6E6A63]'}`}>
                        {page.address}
                      </p>
                    )}
                    <span className="mt-3 inline-block text-sm text-[#0D9488] font-medium">
                      View & book →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className={`mt-12 p-6 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <Search className="w-4 h-4" /> Temple hosts
          </h3>
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
            If you administer a temple on Google Maps, contact platform support to receive the{' '}
            <strong>temple admin</strong> role, then claim your temple from the admin dashboard.
          </p>
        </div>
      </main>
    </div>
  );
}
