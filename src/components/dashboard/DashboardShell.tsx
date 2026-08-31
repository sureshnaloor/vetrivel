import type { ReactNode } from 'react';
import Navigation from '../Navigation';
import { useTheme } from '../../hooks/useTheme';
import LeftRail from './LeftRail';
import RightRail from './RightRail';
import DashboardFooter from './DashboardFooter';

type Props = {
  children: ReactNode;
  /** Show the temple detail right rail (requires SelectedTempleProvider). */
  showRightRail?: boolean;
  onOpenAddTemple?: () => void;
};

/**
 * Shared dashboard chrome: top nav + left sidebar + main content (+ optional right rail).
 */
export default function DashboardShell({
  children,
  showRightRail = false,
  onOpenAddTemple,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#F4F1EA] text-[#141414]'
      }`}
    >
      <Navigation />

      <main className="max-w-[1600px] mx-auto pt-24 pb-12 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 pb-4 pt-4">
          <div className="lg:col-span-1">
            <LeftRail onOpenAddTemple={onOpenAddTemple} />
          </div>

          <div className={`px-1 ${showRightRail ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {children}
          </div>

          {showRightRail ? (
            <div className="lg:col-span-1">
              <RightRail />
            </div>
          ) : null}
        </div>
      </main>

      <DashboardFooter />
    </div>
  );
}
