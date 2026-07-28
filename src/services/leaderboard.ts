export type LeaderboardRank = {
  email: string;
  name: string;
  visited: number;
  total: number;
  completionPct: number;
  isSelf: boolean;
};

export type LeaderboardResponse = {
  scope: 'overall' | 'space';
  locationId?: string;
  spaceName?: string;
  rankings: LeaderboardRank[];
};

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leaderboard`;

export async function fetchLeaderboard(
  scope: 'overall' | 'space' = 'overall',
  locationId?: string | null
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({ scope });
  if (scope === 'space' && locationId) {
    params.set('locationId', locationId);
  }
  const res = await fetch(`${API_BASE}?${params}`, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to load leaderboard');
  }
  return res.json();
}

/** Opens Google Maps write-review UI. Google does not allow posting reviews via API. */
export function googleMapsWriteReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export async function shareVisitToGoogleMaps(opts: {
  placeId: string;
  remarks?: string;
  visitDate?: string;
  templeName?: string;
}): Promise<{ copied: boolean }> {
  const lines = [
    opts.templeName ? `Visit to ${opts.templeName}` : 'Temple visit',
    opts.visitDate ? `Date: ${opts.visitDate}` : '',
    opts.remarks?.trim() || '',
  ].filter(Boolean);
  const text = lines.join('\n\n');

  let copied = false;
  if (text && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
  }

  window.open(googleMapsWriteReviewUrl(opts.placeId), '_blank', 'noopener');
  return { copied };
}
