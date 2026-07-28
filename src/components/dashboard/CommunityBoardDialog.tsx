import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Trash2, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import {
  deleteCommunityMessage,
  fetchCommunityMembers,
  fetchCommunityMessages,
  postCommunityMessage,
  type CommunityMember,
  type CommunityMessage,
} from '../../services/communities';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  spaceName: string;
};

export default function CommunityBoardDialog({
  open,
  onOpenChange,
  spaceId,
  spaceName,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { session } = useAuth();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [msgs, mems] = await Promise.all([
        fetchCommunityMessages(spaceId),
        fetchCommunityMembers(spaceId),
      ]);
      setMessages(msgs);
      setMembers(mems);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !spaceId) return;
    setDraft('');
    void load();
  }, [open, spaceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePost = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      const msg = await postCommunityMessage(spaceId, draft.trim());
      setMessages((prev) => [...prev, msg]);
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteCommunityMessage(spaceId, messageId);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const muted = isDark ? 'text-white/50' : 'text-[#6E6A63]';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-lg max-h-[90vh] flex flex-col ${
          isDark ? 'bg-[#131418] border-white/10 text-white' : ''
        }`}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Community board</DialogTitle>
          <DialogDescription className={muted}>
            {spaceName} · decisions & planning chat for members. Voting comes later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowMembers((v) => !v)}
            className={`text-xs flex items-center gap-1.5 ${muted} hover:underline`}
          >
            <Users className="w-3.5 h-3.5" />
            {members.length} member{members.length === 1 ? '' : 's'}
          </button>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        </div>

        {showMembers && (
          <ul
            className={`rounded-lg border p-2 max-h-28 overflow-y-auto text-xs space-y-1 ${
              isDark ? 'border-white/10 bg-white/5' : 'border-[#e5e5e5] bg-black/[0.02]'
            }`}
          >
            {members.map((m) => (
              <li key={m.userEmail} className="flex justify-between gap-2">
                <span className="truncate">{m.userName}</span>
                <span className={muted}>{m.role}</span>
              </li>
            ))}
          </ul>
        )}

        <div
          className={`flex-1 min-h-[240px] max-h-[40vh] overflow-y-auto rounded-xl border p-3 space-y-2 ${
            isDark ? 'border-white/10 bg-[#0c0d10]' : 'border-[#e5e5e5] bg-[#fafafa]'
          }`}
        >
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin opacity-50" />
            </div>
          ) : messages.length === 0 ? (
            <p className={`text-sm text-center py-8 ${muted}`}>
              No posts yet. Start the conversation about this pilgrimage or activity.
            </p>
          ) : (
            messages.map((m) => {
              const isMine = m.userEmail === session?.user?.email;
              const isSystem = m.userEmail === 'system';
              return (
                <div
                  key={m._id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    isSystem
                      ? isDark
                        ? 'bg-white/5 text-white/50 text-center text-xs italic'
                        : 'bg-black/5 text-[#6E6A63] text-center text-xs italic'
                      : isMine
                        ? 'bg-[#0D9488]/15 border border-[#0D9488]/25'
                        : isDark
                          ? 'bg-white/5 border border-white/10'
                          : 'bg-white border border-[#e5e5e5]'
                  }`}
                >
                  {!isSystem && (
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className={`text-[10px] font-semibold ${muted}`}>{m.userName}</p>
                      {(isMine || members.some((x) => x.userEmail === session?.user?.email && x.role === 'owner')) && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(m._id)}
                          className="opacity-40 hover:opacity-100"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void handlePost()}
            placeholder="Write to the board…"
            className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0D9488]/40 ${
              isDark
                ? 'bg-[#0c0d10] border-white/10 text-white'
                : 'bg-white border-[#e5e5e5] text-[#141414]'
            }`}
          />
          <Button
            type="button"
            onClick={() => void handlePost()}
            disabled={posting || !draft.trim()}
            className="bg-[#0D9488] hover:bg-[#0f766e] text-white"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
