import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import SacredSpacesLogo from './SacredSpacesLogo';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../lib/utils';

const docLinks = [
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/child-safety', label: 'Child Safety' },
] as const;

interface LegalDocumentLayoutProps {
  title: string;
  children: ReactNode;
}

export default function LegalDocumentLayout({ title, children }: LegalDocumentLayoutProps) {
  const { theme } = useTheme();
  const { pathname } = useLocation();
  const isDark = theme === 'dark';

  const pageBg = isDark ? 'bg-[#0a0a0a]' : 'bg-[#F4F1EA]';
  const card = isDark
    ? 'border-white/10 bg-white/[0.06] shadow-black/40'
    : 'border-black/[0.06] bg-white/75 shadow-black/10';
  const eyebrow = isDark ? 'text-white/45' : 'text-[#6E6A63]';
  const titleClass = isDark ? 'text-white' : 'text-[#141414]';
  const prose = cn(
    'max-w-none space-y-4 text-[15px] sm:text-[16px] leading-[1.7]',
    isDark ? 'text-white/80' : 'text-[#141414]/88',
    '[&_strong]:font-semibold [&_strong]:text-[#141414] dark:[&_strong]:text-white',
    '[&_p]:mb-0',
    '[&_a]:font-medium [&_a]:text-[#D13B3B] [&_a]:underline [&_a]:underline-offset-[3px] hover:[&_a]:text-[#b83232]',
    '[&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-[#141414] dark:[&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-2',
    '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2',
    isDark ? '[&_li]:marker:text-white/35' : '[&_li]:marker:text-[#D13B3B]/50',
    '[&_hr]:my-10 [&_hr]:border-0 [&_hr]:h-px [&_hr]:bg-black/10 dark:[&_hr]:bg-white/15'
  );

  return (
    <div className={cn('relative min-h-screen overflow-hidden transition-colors duration-300', pageBg)}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={cn(
            'absolute -top-1/4 -left-1/4 w-[560px] h-[560px] rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite]',
            isDark ? 'bg-gradient-to-br from-[#D13B3B]/18 to-[#E8724A]/8' : 'bg-gradient-to-br from-[#D13B3B]/12 to-[#E8724A]/6'
          )}
        />
        <div
          className={cn(
            'absolute -bottom-1/4 -right-1/4 w-[480px] h-[480px] rounded-full blur-[100px] animate-[pulse_7s_ease-in-out_infinite_1s]',
            isDark ? 'bg-gradient-to-br from-[#F4A261]/12 to-[#D13B3B]/8' : 'bg-gradient-to-br from-[#F4A261]/8 to-[#D13B3B]/5'
          )}
        />
      </div>
      <div className="grain-overlay" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col px-5 sm:px-6 pb-16 pt-6 sm:pt-10">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#D13B3B]/50"
            aria-label="SacredSpaces home"
          >
            <SacredSpacesLogo size={44} />
          </Link>
          <Link
            to="/"
            className={cn(
              'text-sm font-medium transition-colors whitespace-nowrap',
              isDark ? 'text-white/55 hover:text-white' : 'text-[#6E6A63] hover:text-[#141414]'
            )}
          >
            ← Back to home
          </Link>
        </header>

        <nav
          className={cn(
            'mb-6 flex flex-wrap gap-2 rounded-2xl border p-1.5 sm:inline-flex sm:flex-nowrap',
            isDark ? 'border-white/10 bg-black/20' : 'border-black/[0.06] bg-black/[0.03]'
          )}
          aria-label="Legal documents"
        >
          {docLinks.map(({ to, label }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#D13B3B] text-white shadow-sm'
                    : isDark
                      ? 'text-white/65 hover:bg-white/10 hover:text-white'
                      : 'text-[#6E6A63] hover:bg-white/60 hover:text-[#141414]'
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <main
          className={cn(
            'rounded-3xl border p-8 sm:p-10 shadow-2xl backdrop-blur-xl',
            card
          )}
        >
          <p className={cn('text-[10px] font-bold uppercase tracking-[0.2em]', eyebrow)}>Legal</p>
          <h1 className={cn('font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl', titleClass)}>
            {title}
          </h1>
          <div className={cn('mt-8 border-t pt-8', isDark ? 'border-white/10' : 'border-black/[0.08]')}>
            <div className={prose}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
