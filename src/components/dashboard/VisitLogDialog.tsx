import { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, ImagePlus, Loader2, Trash2, Video, X } from 'lucide-react';
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
import {
  addVisitMedia,
  createPlaceVisit,
  deletePlaceVisit,
  deleteVisitMedia,
  fetchPlaceVisits,
  formatVisitDate,
  todayDateInputValue,
  type PlaceVisit,
} from '../../services/placeVisits';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeDocId: string;
  placeName: string;
  /** Called after a visit is created/updated/deleted so parent can refresh place status */
  onVisitsChanged?: () => void;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function VisitLogDialog({
  open,
  onOpenChange,
  placeDocId,
  placeName,
  onVisitsChanged,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [visits, setVisits] = useState<PlaceVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitDate, setVisitDate] = useState(todayDateInputValue());
  const [remarks, setRemarks] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingForVisitId, setUploadingForVisitId] = useState<string | null>(null);
  const [mediaTargetVisitId, setMediaTargetVisitId] = useState<string | null>(null);

  const loadVisits = useCallback(async () => {
    if (!placeDocId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchPlaceVisits(placeDocId);
      setVisits(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, [placeDocId]);

  useEffect(() => {
    if (!open) return;
    setVisitDate(todayDateInputValue());
    setRemarks('');
    setPendingFiles([]);
    setError(null);
    void loadVisits();
  }, [open, loadVisits]);

  const handleCreate = async () => {
    if (!placeDocId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const mediaPayload = await Promise.all(
        pendingFiles.map(async (file) => ({
          mediaUrl: await fileToDataUrl(file),
          mediaType: file.type || 'application/octet-stream',
          source: 'upload' as const,
        }))
      );
      await createPlaceVisit({
        placeDocId,
        visitDate,
        remarks,
        media: mediaPayload,
      });
      setRemarks('');
      setPendingFiles([]);
      setVisitDate(todayDateInputValue());
      await loadVisits();
      onVisitsChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log visit');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVisit = async (visitId: string) => {
    if (!confirm('Delete this visit log?')) return;
    try {
      await deletePlaceVisit(visitId);
      await loadVisits();
      onVisitsChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete visit');
    }
  };

  const openFilePickerForVisit = (visitId: string | null) => {
    setMediaTargetVisitId(visitId);
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);

    // New visit form: stash files until save
    if (!mediaTargetVisitId) {
      setPendingFiles((prev) => [...prev, ...list].slice(0, 8));
      return;
    }

    setUploadingForVisitId(mediaTargetVisitId);
    setError(null);
    try {
      for (const file of list) {
        const mediaUrl = await fileToDataUrl(file);
        await addVisitMedia(mediaTargetVisitId, {
          mediaUrl,
          mediaType: file.type || 'application/octet-stream',
          source: 'upload',
        });
      }
      await loadVisits();
      onVisitsChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload media');
    } finally {
      setUploadingForVisitId(null);
      setMediaTargetVisitId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteMedia = async (visitId: string, mediaId: string) => {
    try {
      await deleteVisitMedia(visitId, mediaId);
      await loadVisits();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove media');
    }
  };

  const muted = isDark ? 'text-white/60' : 'text-[#6E6A63]';
  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0D9488]/40 ${
    isDark ? 'bg-[#0c0d10] border-white/10 text-white' : 'bg-white border-[#e5e5e5] text-[#141414]'
  }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-lg max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-[#131418] border-white/10 text-white' : ''
        }`}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Visit log</DialogTitle>
          <DialogDescription className={muted}>
            Record when you visited <span className="font-medium">{placeName}</span>, add remarks,
            and attach photos or videos.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => void handleFilesSelected(e.target.files)}
        />

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <label className={`text-xs font-medium uppercase tracking-wider ${muted}`}>
              Visit date
            </label>
            <div className="relative">
              <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${muted}`} />
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-xs font-medium uppercase tracking-wider ${muted}`}>
              Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="What stood out on this visit?"
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className={`text-xs font-medium uppercase tracking-wider ${muted}`}>
                Photos & videos
              </label>
              <button
                type="button"
                onClick={() => openFilePickerForVisit(null)}
                className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md border transition-colors ${
                  isDark
                    ? 'border-white/15 hover:bg-white/5'
                    : 'border-[#e5e5e5] hover:bg-black/5'
                }`}
              >
                <ImagePlus className="w-3.5 h-3.5" />
                Add media
              </button>
            </div>
            {pendingFiles.length > 0 && (
              <ul className="space-y-1">
                {pendingFiles.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className={`flex items-center justify-between gap-2 text-xs rounded-md px-2 py-1.5 ${
                      isDark ? 'bg-white/5' : 'bg-black/5'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      {f.type.startsWith('video/') ? (
                        <Video className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ImagePlus className="w-3.5 h-3.5 shrink-0" />
                      )}
                      {f.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePending(i)}
                      className="opacity-60 hover:opacity-100"
                      aria-label="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className={`text-[11px] ${muted}`}>
              Photos up to ~2MB, videos up to ~5MB. In-app camera capture coming later.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving || !visitDate}
            className="bg-[#0D9488] hover:bg-[#0f766e] text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Saving…
              </>
            ) : (
              'Log visit'
            )}
          </Button>
        </DialogFooter>

        <div className={`border-t pt-4 mt-2 ${isDark ? 'border-white/10' : 'border-[#e5e5e5]'}`}>
          <h3 className={`text-sm font-semibold mb-3 ${muted}`}>Past visits</h3>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin opacity-60" />
            </div>
          ) : visits.length === 0 ? (
            <p className={`text-sm ${muted}`}>No visits logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {visits.map((v) => {
                const id = String(v._id);
                return (
                  <li
                    key={id}
                    className={`rounded-xl border p-3 space-y-2 ${
                      isDark ? 'border-white/10 bg-white/[0.03]' : 'border-[#e5e5e5] bg-black/[0.02]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{formatVisitDate(v.visitDate)}</p>
                        {v.remarks ? (
                          <p className={`text-sm mt-1 whitespace-pre-wrap ${muted}`}>{v.remarks}</p>
                        ) : (
                          <p className={`text-xs mt-1 italic ${muted}`}>No remarks</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteVisit(id)}
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                          isDark
                            ? 'border-red-400/30 text-red-300 hover:bg-red-400/15'
                            : 'border-red-200 text-red-600 hover:bg-red-50'
                        }`}
                        aria-label="Delete visit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {(v.media?.length ?? 0) > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {v.media.map((m) => (
                          <div
                            key={m.id}
                            className="relative aspect-square rounded-lg overflow-hidden bg-black/20 group"
                          >
                            {m.mediaType.startsWith('video/') ? (
                              <video
                                src={m.mediaUrl}
                                className="w-full h-full object-cover"
                                controls
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={m.mediaUrl}
                                alt="Visit media"
                                className="w-full h-full object-cover"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => void handleDeleteMedia(id, m.id)}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Remove media"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={uploadingForVisitId === id}
                      onClick={() => openFilePickerForVisit(id)}
                      className={`text-xs flex items-center gap-1 ${muted} hover:underline disabled:opacity-50`}
                    >
                      {uploadingForVisitId === id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ImagePlus className="w-3 h-3" />
                      )}
                      Add photo or video
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
