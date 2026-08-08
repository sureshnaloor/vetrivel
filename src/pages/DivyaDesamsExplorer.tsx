import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useTheme } from '../hooks/useTheme';
import { useDivyaDesam } from '../contexts/DivyaDesamContext';
import { useAuth } from '../hooks/useAuth';
import { List, Plus, Loader2, CheckCircle2 } from 'lucide-react';

export default function DivyaDesamsExplorer() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { lists, loading, cloneList } = useDivyaDesam();
  const { session } = useAuth();
  const user = session?.user;
  const navigate = useNavigate();
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Separate global/published lists (source lists) from user's own lists
  const sourceLists = lists.filter(l => l.isGlobalTemplate || l.isPublished);
  const userOwnedLists = lists.filter(l => l.creatorEmail === user?.email);

  // Build a set of parentListIds the user has already adopted
  const adoptedParentIds = new Set(
    userOwnedLists
      .filter(l => l.parentListId)
      .map(l => l.parentListId!)
  );

  const handleClone = async (id: string) => {
    setCloningId(id);
    try {
      const cloned = await cloneList(id);
      alert('List successfully adopted!');
      navigate(`/dashboard/divyadesams/${cloned._id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to adopt list.';
      alert(msg);
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-[#F4F1EA] text-[#141414]'}`}>
      <Navigation />
      
      <main className="max-w-[1200px] mx-auto pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="font-display text-4xl font-semibold mb-2">Explore Divya Desams & Curated Lists</h1>
          <p className={`text-lg ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
            Adopt curated temple lists and start tracking your pilgrimage.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading curated lists...</span>
          </div>
        ) : sourceLists.length === 0 ? (
          <div className={`p-8 rounded-2xl border border-dashed text-center ${isDark ? 'border-white/10 text-white/50' : 'border-black/10 text-black/50'}`}>
            No curated lists published yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sourceLists.map((list) => {
              const isTemplate = list.isGlobalTemplate;
              const isAdopted = adoptedParentIds.has(list._id);
              return (
                <div key={list._id} className={`p-6 rounded-2xl border flex flex-col h-full ${isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      {list.iconSvg ? (
                        <div
                          className="w-5 h-5 flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5 [&>svg]:fill-current text-[#0D9488]"
                          dangerouslySetInnerHTML={{ __html: list.iconSvg }}
                        />
                      ) : (
                        <List className="w-5 h-5 text-[#0D9488]" />
                      )}
                      <h2 className="font-display text-xl font-semibold">{list.name}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {isTemplate && (
                        <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-1 rounded font-semibold ${isDark ? 'bg-[#0D9488]/20 text-[#2DD4BF]' : 'bg-[#0D9488]/15 text-[#0D9488]'}`}>
                          Global Template
                        </span>
                      )}
                      {isAdopted && (
                        <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded font-semibold ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                          <CheckCircle2 className="w-3 h-3" /> Adopted
                        </span>
                      )}
                    </div>
                    <p className={`text-sm line-clamp-3 mb-4 ${isDark ? 'text-white/70' : 'text-[#6E6A63]'}`}>
                      {list.description || "No description provided."}
                    </p>
                    <p className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                      {list.temples.length} Temples
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-dashed border-gray-500/20">
                    {isAdopted ? (
                      <button
                        onClick={() => {
                          // Navigate to the user's adopted copy
                          const adoptedList = userOwnedLists.find(l => l.parentListId === list._id);
                          if (adoptedList) navigate(`/dashboard/divyadesams/${adoptedList._id}`);
                        }}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-colors ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-[#141414] hover:bg-black/10'}`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        View My Copy
                      </button>
                    ) : (
                      <button
                        onClick={() => handleClone(list._id)}
                        disabled={cloningId === list._id}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0D9488] text-white font-medium hover:bg-[#09917d] transition-colors disabled:opacity-50"
                      >
                        {cloningId === list._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Adopt this List
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
