import Navigation from '../components/Navigation';
import { useTheme } from '../hooks/useTheme';

export default function PlaceholderPage({ title }: { title: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-[#F4F1EA] text-[#141414]'}`}>
      <Navigation />
      <div className="container mx-auto py-24 px-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-4xl font-display font-bold mb-4">{title}</h1>
        <p className={`text-lg max-w-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          This section is currently being constructed. Check back soon for updates to your spiritual journey.
        </p>
        <a href="/dashboard" className="mt-8 px-6 py-3 rounded-full bg-[#D13B3B] text-white font-medium hover:bg-[#b83232] transition-colors">
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
