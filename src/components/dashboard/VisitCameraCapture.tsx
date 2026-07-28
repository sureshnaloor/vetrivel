import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, SwitchCamera, Video, X } from 'lucide-react';
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with a captured File (photo or video) ready to attach */
  onCapture: (file: File) => void;
};

type Facing = 'user' | 'environment';

export default function VisitCameraCapture({ open, onOpenChange, onCapture }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [facing, setFacing] = useState<Facing>('environment');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  const stopStream = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setReady(false);
    setRecording(false);
    setRecordSeconds(0);
  }, []);

  const startStream = useCallback(
    async (face: Facing) => {
      setError(null);
      setReady(false);
      try {
        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            facingMode: { ideal: face },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch (e) {
        const msg =
          e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'Camera permission denied. Allow camera access in your browser settings.'
            : e instanceof Error
              ? e.message
              : 'Could not open camera';
        setError(msg);
        setReady(false);
      }
    },
    [stopStream]
  );

  useEffect(() => {
    if (!open) {
      stopStream();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not supported in this browser.');
      return;
    }
    void startStream(facing);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when dialog opens
  }, [open]);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      setRecordSeconds((s) => {
        if (s >= 29) {
          // auto-stop near 30s limit
          void stopRecording();
          return s;
        }
        return s + 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const flipCamera = async () => {
    const next: Facing = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    await startStream(next);
  };

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video || !ready || busy) return;
    setBusy(true);
    try {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not capture frame');
      ctx.drawImage(video, 0, 0, w, h);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to encode photo'))),
          'image/jpeg',
          0.85
        );
      });
      const file = new File([blob], `visit-photo-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      onCapture(file);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to take photo');
    } finally {
      setBusy(false);
    }
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
      recorder.stop();
    });
  };

  const toggleRecord = async () => {
    if (recording) {
      await stopRecording();
      return;
    }
    const stream = streamRef.current;
    if (!stream || busy) return;

    const mimeCandidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    const mimeType =
      mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

    try {
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        setRecording(false);
        const type = recorder.mimeType || mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (blob.size === 0) {
          setError('Recording was empty. Try again.');
          return;
        }
        const ext = type.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `visit-video-${Date.now()}.${ext}`, { type });
        onCapture(file);
        onOpenChange(false);
      };
      recorder.start(250);
      setRecording(true);
      setRecordSeconds(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start recording');
    }
  };

  const muted = isDark ? 'text-white/55' : 'text-[#6E6A63]';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) stopStream();
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={`max-w-lg ${isDark ? 'bg-[#131418] border-white/10 text-white' : ''}`}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#0D9488]" />
            Capture visit media
          </DialogTitle>
          <DialogDescription className={muted}>
            Take a photo or record a short clip (up to ~30s) at the temple.
          </DialogDescription>
        </DialogHeader>

        <div
          className={`relative aspect-video rounded-xl overflow-hidden border ${
            isDark ? 'border-white/10 bg-black' : 'border-[#e5e5e5] bg-black'
          }`}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {recording && (
            <span className="absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded bg-red-600 text-white">
              REC {String(recordSeconds).padStart(2, '0')}s
            </span>
          )}
          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void flipCamera()}
            disabled={!ready || recording || busy}
          >
            <SwitchCamera className="w-4 h-4 mr-1.5" />
            Flip
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void takePhoto()}
            disabled={!ready || recording || busy}
            className="bg-[#0D9488] hover:bg-[#0f766e] text-white"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Camera className="w-4 h-4 mr-1.5" />
            )}
            Take photo
          </Button>
          <Button
            type="button"
            size="sm"
            variant={recording ? 'destructive' : 'outline'}
            onClick={() => void toggleRecord()}
            disabled={!ready || busy}
          >
            {recording ? (
              <>
                <X className="w-4 h-4 mr-1.5" />
                Stop
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-1.5" />
                Record video
              </>
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
