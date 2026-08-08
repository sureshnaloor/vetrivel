import { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useDivyaDesam } from '../../contexts/DivyaDesamContext';
import type { DivyaDesamList } from '../../services/divyadesam';
import { X, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list?: DivyaDesamList; // If provided, we are editing this list
  onSaved?: (list: DivyaDesamList) => void;
}

export default function DivyaDesamFormDialog({ open, onOpenChange, list, onSaved }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { createList, updateList } = useDivyaDesam();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (list) {
        setName(list.name);
        setDescription(list.description || '');
        setIsPublished(list.isPublished);
      } else {
        setName('');
        setDescription('');
        setIsPublished(false);
      }
      setError(null);
    }
  }, [open, list]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let saved: DivyaDesamList;
      if (list) {
        saved = await updateList(list._id, { name, description, isPublished });
      } else {
        saved = await createList({ name, description, isPublished });
      }
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save list');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={() => onOpenChange(false)} 
      />
      <div className={`relative w-[90vw] max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 ${
        isDark ? 'bg-[#131418] border border-white/10' : 'bg-white border border-[#e5e5e5]'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-black/10'}`}>
          <h2 className={`font-display text-xl font-semibold ${isDark ? 'text-white' : 'text-[#141414]'}`}>
            {list ? 'Edit List' : 'Create Custom List'}
          </h2>
          <button 
            onClick={() => onOpenChange(false)}
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'hover:bg-black/5 text-[#6E6A63] hover:text-[#141414]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/80' : 'text-[#141414]'}`}>
                List Name
              </label>
              <input
                type="text"
                placeholder="e.g. My Favorite Shiva Temples"
                value={name}
                onChange={e => setName(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border outline-none transition-colors ${
                  isDark ? 'bg-black/20 border-white/20 text-white focus:border-[#0D9488]' : 'bg-white border-black/20 text-black focus:border-[#0D9488]'
                }`}
                autoFocus
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/80' : 'text-[#141414]'}`}>
                Description
              </label>
              <textarea
                placeholder="What is this list about?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className={`w-full px-3 py-2.5 rounded-xl border outline-none transition-colors resize-none ${
                  isDark ? 'bg-black/20 border-white/20 text-white focus:border-[#0D9488]' : 'bg-white border-black/20 text-black focus:border-[#0D9488]'
                }`}
              />
            </div>

            <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
              isDark ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
            }`}>
              <input 
                type="checkbox" 
                checked={isPublished}
                onChange={e => setIsPublished(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#0D9488] rounded"
              />
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-[#141414]'}`}>
                  Publish this list
                </p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
                  Make it visible to others so they can explore and adopt it.
                </p>
              </div>
            </label>
          </div>

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

          <div className="mt-8 flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => onOpenChange(false)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isDark ? 'text-white hover:bg-white/10' : 'text-[#6E6A63] hover:bg-black/5'
              }`}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#0D9488] text-white hover:bg-[#09917d] transition-colors disabled:opacity-50 min-w-[120px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (list ? 'Save Changes' : 'Create List')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
