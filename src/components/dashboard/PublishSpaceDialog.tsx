import { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { useTheme } from '../../hooks/useTheme';
import { updateLocation, type UserLocation } from '../../services/locations';
import { useCommunities } from '../../contexts/CommunitiesContext';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: UserLocation;
  onUpdated?: () => void;
};

export default function PublishSpaceDialog({
  open,
  onOpenChange,
  location,
  onUpdated,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { refresh } = useCommunities();
  const isPublished = location.visibility === 'published';
  const [purpose, setPurpose] = useState(location.purpose || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const muted = isDark ? 'text-white/55' : 'text-[#6E6A63]';
  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0D9488]/40 resize-none ${
    isDark ? 'bg-[#0c0d10] border-white/10 text-white' : 'bg-white border-[#e5e5e5] text-[#141414]'
  }`;

  const handlePublish = async () => {
    if (!location._id || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateLocation(String(location._id), {
        visibility: 'published',
        purpose: purpose.trim(),
      });
      await refresh();
      onUpdated?.();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!location._id || saving) return;
    if (!confirm('Unpublish this space? It will leave the public community list. Existing members keep access to the board until you delete the space.')) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateLocation(String(location._id), { visibility: 'private' });
      await refresh();
      onUpdated?.();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unpublish');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setPurpose(location.purpose || '');
        onOpenChange(next);
      }}
    >
      <DialogContent className={isDark ? 'bg-[#131418] border-white/10 text-white' : ''}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#0D9488]" />
            {isPublished ? 'Community space' : 'Publish as community'}
          </DialogTitle>
          <DialogDescription className={muted}>
            Make <span className="font-medium">{location.name}</span> visible to everyone for group
            pilgrimage or shared activity. Others can send Interest; you accept or decline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <label className={`text-xs font-medium uppercase tracking-wider ${muted}`}>
            Purpose / invitation
          </label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={4}
            placeholder="e.g. Group pilgrimage to nearby shrines this Navaratri — planning travel together."
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
          {isPublished && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleUnpublish()}
              disabled={saving}
            >
              Unpublish
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handlePublish()}
            disabled={saving}
            className="bg-[#0D9488] hover:bg-[#0f766e] text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Saving…
              </>
            ) : isPublished ? (
              'Update purpose'
            ) : (
              'Publish'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
