import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useTheme } from '../hooks/useTheme';
import { useDivyaDesam } from '../contexts/DivyaDesamContext';
import { useAuth } from '../hooks/useAuth';
import { List, ChevronRight, Loader2, Plus, Edit2, Trash2 } from 'lucide-react';
import DivyaDesamFormDialog from '../components/dashboard/DivyaDesamFormDialog';

export default function MyDivyaDesams() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { lists, loading, refreshLists, deleteList } = useDivyaDesam();
  const { session } = useAuth();
  const user = session?.user;
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editList, setEditList] = useState<any | null>(null);

  useEffect(() => {
    refreshLists();
  }, []);

  // Filter out lists that the user created or adopted
  const myLists = lists.filter(l => l.creatorEmail === user?.email);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-[#F4F1EA] text-[#141414]'}`}>
      <Navigation />
      
      <main className="max-w-[1200px] mx-auto pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold mb-2">My Tracked Lists</h1>
            <p className={`text-lg ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
              Your adopted curated lists and pilgrimage progress.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setEditList(null); setIsFormOpen(true); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isDark ? 'bg-[#0D9488]/20 text-[#2DD4BF] hover:bg-[#0D9488]/30' : 'bg-[#0D9488]/10 text-[#0D9488] hover:bg-[#0D9488]/20'
              }`}
            >
              <Plus className="w-4 h-4" /> Create Custom List
            </button>
            <button 
              onClick={() => navigate('/nests')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'
              }`}
            >
              Explore More Lists
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading your lists...</span>
          </div>
        ) : myLists.length === 0 ? (
          <div className={`p-8 rounded-2xl border border-dashed text-center ${isDark ? 'border-white/10 text-white/50' : 'border-black/10 text-black/50'}`}>
            <p className="mb-4">You haven't adopted any curated lists yet.</p>
            <button 
              onClick={() => navigate('/nests')}
              className="px-6 py-2 rounded-xl bg-[#0D9488] text-white font-medium hover:bg-[#09917d] transition-colors"
            >
              Browse Lists
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myLists.map((list) => {
              return (
                <div key={list._id} className="relative">
                  <button
                    onClick={() => navigate(`/dashboard/divyadesams/${list._id}`)}
                    className={`text-left p-6 rounded-2xl border flex flex-col h-full transition-transform hover:-translate-y-1 ${
                      isDark ? 'bg-[#131418] border-white/10 hover:border-[#0D9488]/50' : 'bg-white border-[#e5e5e5] shadow-sm hover:border-[#0D9488]/50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
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
                        <ChevronRight className="w-5 h-5 opacity-40" />
                      </div>
                      <p className={`text-sm line-clamp-3 mb-4 ${isDark ? 'text-white/70' : 'text-[#6E6A63]'}`}>{list.description || "No description provided."}</p>
                      <p className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-black/50'}`}>{list.temples.length} Temples</p>
                    </div>
                  </button>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditList(list); setIsFormOpen(true); }}
                      className={`p-1 rounded ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this list?')) {
                          deleteList(list._id).then(() => {
                            refreshLists();
                            alert('List deleted successfully');
                          });
                        }
                      }}
                      className={`p-1 rounded ${isDark ? 'bg-red-500/10 hover:bg-red-500/20' : 'bg-red-50 hover:bg-red-100'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <DivyaDesamFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        list={editList ?? undefined}
        onSaved={() => {
          // Refresh lists after create or edit
          refreshLists();
          setIsFormOpen(false);
          setEditList(null);
        }}
      />
    </div>
  );
}
