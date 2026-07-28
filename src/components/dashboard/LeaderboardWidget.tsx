import { useEffect, useState } from 'react';
import { Loader2, Trophy } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import {
  fetchLeaderboard,
  type LeaderboardRank,
} from '../../services/leaderboard';
import { normalizeDocumentId } from '../../lib/geo';

export default function LeaderboardWidget({ isDark }: { isDark: boolean }) {
  const { activeLocationId, savedLocations } = useLocation();
  const [scope, setScope] = useState<'overall' | 'space'>('overall');
  const [rankings, setRankings] = useState<LeaderboardRank[]>([]);
  const [spaceName, setSpaceName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSpaceLabel =
    savedLocations.find(
      (l) => normalizeDocumentId(l._id) === normalizeDocumentId(activeLocationId)
    )?.name || 'This space';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const run = async () => {
      try {
        if (scope === 'space') {
          if (!activeLocationId) {
            setRankings([]);
            setSpaceName(null);
            setError('Select a sacred space to see its board.');
            return;
          }
          const data = await fetchLeaderboard('space', activeLocationId);
          if (cancelled) return;
          setRankings(data.rankings);
          setSpaceName(data.spaceName || activeSpaceLabel);
        } else {
          const data = await fetchLeaderboard('overall');
          if (cancelled) return;
          setRankings(data.rankings);
          setSpaceName(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load leaderboard');
          setRankings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [scope, activeLocationId, activeSpaceLabel]);

  const muted = isDark ? 'text-white/50' : 'text-[#6E6A63]';
  const tabClass = (on: boolean) =>
    `flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-colors ${
      on
        ? isDark
          ? 'bg-[#0D9488]/25 text-[#2DD4BF]'
          : 'bg-[#0D9488]/15 text-[#0D9488]'
        : isDark
          ? 'text-white/45 hover:bg-white/5'
          : 'text-[#6E6A63] hover:bg-black/5'
    }`;

  return (
    <div
      className={`p-6 rounded-2xl border ${
        isDark ? 'bg-[#131418] border-white/10' : 'bg-white border-[#e5e5e5] shadow-sm'
      }`}
    >
      <h2 className="font-display text-lg font-semibold mb-1 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        Bucket list board
      </h2>
      <p className={`text-[11px] mb-3 ${muted}`}>
        Visited temples among you and your friends — overall and for the active space.
      </p>

      <div
        className={`flex gap-1 p-1 rounded-xl mb-3 ${
          isDark ? 'bg-white/5' : 'bg-black/[0.03]'
        }`}
      >
        <button type="button" className={tabClass(scope === 'overall')} onClick={() => setScope('overall')}>
          Overall
        </button>
        <button type="button" className={tabClass(scope === 'space')} onClick={() => setScope('space')}>
          This space
        </button>
      </div>

      {scope === 'space' && spaceName && (
        <p className={`text-[10px] mb-2 font-medium ${muted}`}>{spaceName}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin opacity-40" />
        </div>
      ) : error ? (
        <p className="text-[11px] text-red-500">{error}</p>
      ) : rankings.length === 0 ? (
        <p
          className={`text-[10px] px-3 py-4 text-center border border-dashed rounded-xl ${
            isDark ? 'border-white/10 text-white/40' : 'border-black/10 text-black/40'
          }`}
        >
          No rankings yet. Log visits and add friends to climb the board.
        </p>
      ) : (
        <ol className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {rankings.map((row, idx) => (
            <li
              key={row.email}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl ${
                row.isSelf
                  ? isDark
                    ? 'bg-amber-500/15 ring-1 ring-amber-500/30'
                    : 'bg-amber-50 ring-1 ring-amber-200'
                  : isDark
                    ? 'bg-white/[0.03]'
                    : 'bg-black/[0.02]'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  idx === 0
                    ? 'bg-amber-400 text-amber-950'
                    : idx === 1
                      ? isDark
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'
                      : idx === 2
                        ? isDark
                          ? 'bg-orange-900/50 text-orange-200'
                          : 'bg-orange-100 text-orange-800'
                        : isDark
                          ? 'bg-white/10 text-white/60'
                          : 'bg-black/5 text-[#6E6A63]'
                }`}
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">
                  {row.name}
                  {row.isSelf ? ' · you' : ''}
                </p>
                <div className={`mt-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                  <div
                    className="h-full rounded-full bg-[#0D9488] transition-all"
                    style={{ width: `${Math.min(100, row.completionPct)}%` }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-[#0D9488]">
                  {row.visited}
                  <span className={`font-medium ${muted}`}>/{row.total || '—'}</span>
                </p>
                <p className={`text-[10px] ${muted}`}>{row.completionPct}%</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
