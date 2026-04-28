import Navigation from '../components/Navigation';
import { useTheme } from '../hooks/useTheme';
import LocationSelector from '../components/dashboard/LocationSelector';
import CenterColumn from '../components/dashboard/CenterColumn';
import { DashboardPinnedProvider } from '../contexts/DashboardPinnedContext';

export default function ExploreMap() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <DashboardPinnedProvider>
      <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-[#F4F1EA] text-[#141414]'}`}>
        <Navigation />

        <main className="max-w-[1600px] mx-auto pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl font-semibold">Explore Map</h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
                Create sacred spaces and save temples as Nest or Interest — same workflow as your dashboard.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
              <LocationSelector />
            </div>
          </header>

          <CenterColumn />
        </main>
      </div>
    </DashboardPinnedProvider>
  );
}
