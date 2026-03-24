import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapPin, Instagram, Twitter, Youtube, ArrowRight } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

gsap.registerPlugin(ScrollTrigger);

interface FooterSectionProps {
  className?: string;
}

const FooterSection = ({ className = '' }: FooterSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;

    if (!section || !content) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        content,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail('');
      setTimeout(() => setIsSubscribed(false), 3000);
    }
  };

  const footerLinks = {
    explore: [
      { label: 'Map', href: '/map' },
      { label: 'Temples', href: '/temples' },
      { label: 'Events', href: '/events' },
      { label: 'Nests', href: '/nests' },
    ],
    company: [
      { label: 'About', href: '#' },
      { label: 'Guidelines', href: '#' },
      { label: 'Privacy', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  };

  // Theme-aware color helpers
  const fg = isDark ? 'text-white' : 'text-[#141414]';
  const fgMuted = isDark ? 'text-white/60' : 'text-[#6E6A63]';
  const fgSubtle = isDark ? 'text-white/40' : 'text-[#6E6A63]/60';
  const fgLink = isDark ? 'text-white/70 hover:text-white' : 'text-[#6E6A63] hover:text-[#141414]';
  const fgSecondary = isDark ? 'text-white/80' : 'text-[#141414]/80';
  const bgSocial = isDark ? 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white' : 'bg-black/5 text-[#6E6A63] hover:bg-black/10 hover:text-[#141414]';
  const bgInput = isDark ? 'bg-white/10 border-white/10 text-white placeholder:text-white/40' : 'bg-black/5 border-black/10 text-[#141414] placeholder:text-[#6E6A63]/60';
  const borderBottom = isDark ? 'border-white/10' : 'border-black/10';
  const watermark = isDark ? 'text-white/[0.03]' : 'text-black/[0.03]';

  return (
    <footer
      ref={sectionRef}
      className={`relative py-16 lg:py-24 transition-colors duration-300 ${className}`}
      style={{ backgroundColor: 'var(--page-bg)' }}
    >
      {/* Large watermark */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        <span
          className={`font-display text-[15vw] ${watermark} whitespace-nowrap`}
          style={{ letterSpacing: '-0.02em' }}
        >
          SacredSpaces
        </span>
      </div>

      <div ref={contentRef} className="relative w-full px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 mb-16">
          {/* Left - Brand & Newsletter */}
          <div className="lg:w-[40%]">
            <a
              href="#"
              className={`flex items-center gap-2 ${fg} mb-6`}
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <MapPin className="w-5 h-5 text-[#D13B3B]" />
              <span className="font-display text-xl font-semibold tracking-tight">
                SacredSpaces
              </span>
            </a>
            <p className={`${fgMuted} mb-6 max-w-sm`}>
              A map of temples, shrines, and quiet corners—built by travelers,
              locals, and devotees.
            </p>

            {/* Newsletter */}
            <div>
              <p className={`text-sm ${fgSecondary} mb-3`}>Stay connected</p>
              {isSubscribed ? (
                <p className="text-green-400 text-sm">
                  Thanks for subscribing!
                </p>
              ) : (
                <form
                  onSubmit={handleSubscribe}
                  className="flex gap-2"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className={`flex-1 px-4 py-3 rounded-lg border ${bgInput} focus:outline-none focus:ring-2 focus:ring-[#D13B3B]/50 transition-all`}
                  />
                  <button
                    type="submit"
                    className="px-4 py-3 rounded-lg bg-[#D13B3B] text-white hover:bg-[#b83232] transition-colors"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right - Links */}
          <div className="lg:w-[60%] grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <p className={`eyebrow ${fgSubtle} mb-4`}>EXPLORE</p>
              <ul className="space-y-3">
                {footerLinks.explore.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[#D13B3B] font-semibold hover:text-[#b83232] transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={`eyebrow ${fgSubtle} mb-4`}>COMPANY</p>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className={`${fgLink} transition-colors`}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={`eyebrow ${fgSubtle} mb-4`}>FOLLOW</p>
              <div className="flex gap-4">
                <a
                  href="#"
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${bgSocial}`}
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${bgSocial}`}
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${bgSocial}`}
                >
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className={`pt-8 border-t ${borderBottom} flex flex-col md:flex-row justify-between items-center gap-4`}>
          <p className={`${fgSubtle} text-sm`}>
            © {new Date().getFullYear()} SacredSpaces. Built with care.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`${fgMuted} hover:${fg} text-sm transition-colors`}
          >
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
