import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { MapPin, Instagram, Twitter, Youtube, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export default function DashboardFooter() {
  const { theme } = useTheme();
  const { session, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const isDark = theme === 'dark';

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail('');
      setTimeout(() => setIsSubscribed(false), 3000);
    }
  };

  // Theme-aware color helpers for Dashboard (we use background colors from the dashboard page)
  const bgFooter = isDark ? 'bg-black' : 'bg-[#e5ddd3]';
  const fg = isDark ? 'text-white' : 'text-[#141414]';
  const fgMuted = isDark ? 'text-white/60' : 'text-[#6E6A63]';
  const fgSubtle = isDark ? 'text-white/40' : 'text-[#6E6A63]/60';
  const watermark = isDark ? 'text-white/[0.03]' : 'text-black/[0.03]';
  const fgLink = isDark ? 'text-white/70 hover:text-white' : 'text-[#6E6A63] hover:text-[#141414]';
  const bgSocial = isDark ? 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white' : 'bg-black/5 text-[#6E6A63] hover:bg-black/10 hover:text-[#141414]';
  const bgInput = isDark ? 'bg-white/10 border-white/10 text-white placeholder:text-white/40' : 'bg-white/50 border-black/10 text-[#141414] placeholder:text-[#6E6A63]/60';
  const borderBottom = isDark ? 'border-white/10' : 'border-black/10';

  return (
    <footer className={`relative py-12 md:py-16 transition-colors duration-300 ${bgFooter} overflow-hidden`}>
      {/* Large watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className={`font-display text-[15vw] ${watermark} whitespace-nowrap`}
          style={{ letterSpacing: '-0.02em' }}
        >
          SacredSpaces
        </span>
      </div>

      <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 mb-12">

          {/* Left - Brand & Newsletter */}
          <div className="lg:w-[35%]">
            <a href="/dashboard" className={`flex items-center gap-2 ${fg} mb-4`}>
              <MapPin className="w-5 h-5 text-[#D13B3B]" />
              <span className="font-display text-xl font-semibold tracking-tight">
                SacredSpaces
              </span>
            </a>
            <p className={`${fgMuted} mb-6 max-w-sm text-sm leading-relaxed`}>
              Your personalized portal to the divine. Track your visits, follow communities, and discover inner peace.
            </p>

            {/* Newsletter */}
            <div>
              <p className={`text-sm ${fgMuted} mb-3`}>Stay connected</p>
              {isSubscribed ? (
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                  Thanks for subscribing!
                </p>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className={`flex-1 px-4 py-2.5 text-sm rounded-lg border ${bgInput} focus:outline-none focus:ring-2 focus:ring-[#D13B3B]/50 transition-all`}
                  />
                  <button type="submit" className="px-4 py-2.5 rounded-lg bg-[#D13B3B] text-white hover:bg-[#b83232] transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right - Links Panel */}
          <div className="lg:w-[65%] grid grid-cols-2 md:grid-cols-4 gap-8">

            {/* Dynamic Dashboard Links (Session dependent) */}
            <div>
              <p className={`text-[10px] font-bold tracking-wider ${fgSubtle} mb-4 uppercase`}>My Journey</p>
              <ul className="space-y-3 text-sm">
                <li><a href="/dashboard/agent" className="text-red-500 dark:text-red-400 font-normal hover:text-red-600 dark:hover:text-red-300 transition-colors">My Agent</a></li>
                <li><a href="/dashboard/nest" className="text-red-500 dark:text-red-400 font-normal hover:text-red-600 dark:hover:text-red-300 transition-colors">My Nest</a></li>
                <li><a href="/dashboard/feed" className="text-red-500 dark:text-red-400 font-normal hover:text-red-600 dark:hover:text-red-300 transition-colors">Following Feed</a></li>
                <li><a href="/dashboard/reviews" className="text-red-500 dark:text-red-400 font-normal hover:text-red-600 dark:hover:text-red-300 transition-colors">My Reviews</a></li>
                <li><a href="/dashboard/settings" className="text-red-500 dark:text-red-400 font-normal hover:text-red-600 dark:hover:text-red-300 transition-colors">Settings</a></li>
                {session && (
                  <li>
                    <button onClick={logout} className={`text-[#D13B3B] hover:text-[#b83232] transition-colors mt-2 font-medium`}>
                      Sign Out
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* Standard Explore Links */}
            <div>
              <p className={`text-[10px] font-bold tracking-wider ${fgSubtle} mb-4 uppercase`}>Explore</p>
              <ul className="space-y-3 text-sm">
                <li><a href="/map" className="text-[#D13B3B] font-semibold hover:text-[#b83232] transition-colors">Temple Map</a></li>
                <li><a href="/events" className="text-[#D13B3B] font-semibold hover:text-[#b83232] transition-colors">Community Events</a></li>
                <li><a href="/poojas" className="text-[#D13B3B] font-semibold hover:text-[#b83232] transition-colors">Book Pooja</a></li>
                <li><a href="/add" className="text-[#D13B3B] font-semibold hover:text-[#b83232] transition-colors">Add Temple</a></li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <p className={`text-[10px] font-bold tracking-wider ${fgSubtle} mb-4 uppercase`}>SacredSpaces</p>
              <ul className="space-y-3 text-sm">
                <li><a href="/about" className={`${fgLink} transition-colors`}>About Us</a></li>
                <li><a href="/guidelines" className={`${fgLink} transition-colors`}>Guidelines</a></li>
                <li><a href="/privacy" className={`${fgLink} transition-colors`}>Privacy Policy</a></li>
                <li><a href="/contact" className={`${fgLink} transition-colors`}>Contact Support</a></li>
              </ul>
            </div>

            {/* Social Links */}
            <div>
              <p className={`text-[10px] font-bold tracking-wider ${fgSubtle} mb-4 uppercase`}>Follow</p>
              <div className="flex gap-3">
                <a href="#" className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${bgSocial}`}>
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="#" className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${bgSocial}`}>
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="#" className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${bgSocial}`}>
                  <Youtube className="w-4 h-4" />
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className={`pt-6 border-t ${borderBottom} flex flex-col md:flex-row justify-between items-center gap-4`}>
          <p className={`${fgSubtle} text-xs`}>
            © {new Date().getFullYear()} SacredSpaces Dashboard.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`${fgMuted} hover:${fg} text-xs transition-colors`}
          >
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
