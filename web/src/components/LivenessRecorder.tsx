import { useEffect, useRef, useState } from "react";
import { Alert, Button, Spinner } from "./ui";

type Props = {
  onRecorded: (blob: Blob | null) => void;
};

type Status = "idle" | "recording" | "recorded";

export function LivenessRecorder({ onRecorded }: Props) {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const playbackRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [hint, setHint] = useState<string>("");
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  async function startRecording() {
    try {
      setErr("");
      onRecorded(null);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      const stream1 = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
      streamRef.current = stream1;
      // Ensure preview element is mounted
      await new Promise((r) => setTimeout(r, 0));
      const v = previewRef.current;
      if (v) {
        v.srcObject = stream1;
        v.muted = true;
        v.playsInline = true as any;
        // Wait for metadata
        await new Promise<void>((resolve) => {
          if (v.readyState >= 1) return resolve();
          const handler = () => { v.removeEventListener("loadedmetadata", handler); resolve(); };
          v.addEventListener("loadedmetadata", handler, { once: true });
        });
        try { await v.play(); setPreviewReady(true); } catch { setPreviewReady(false); }
        // Give the browser a frame to paint the preview before starting recorder
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      }
      setHint("Move your head left, right and blink");
      const stream2 = streamRef.current;
      if (!stream2) return;
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const mr = new MediaRecorder(stream2, { mimeType: mime });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setStatus("recorded");
        onRecorded(blob);
      };
      const v2 = previewRef.current;
      if (v2 && v2.paused) { try { await v2.play(); setPreviewReady(true); } catch {} }
      mr.start();
      setRecording(true);
      setStatus("recording");
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  function stopAndCapture() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
      setRecording(false);
    }
  }

  function restart() {
    // cleanup existing
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    // Keep stream active for quick retakes. It will be stopped on unmount.
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
    chunksRef.current = [];
    setStatus("idle");
    setRecording(false);
    onRecorded(null);
    setHint("");
    // no-op
  }

  return (
    <div className="space-y-3">
      {err ? <Alert variant="error">{err}</Alert> : null}
      {/* Live preview while recording */}
      {(status === "recording") && (
        <div className="overflow-hidden rounded-lg border">
          <video
            ref={previewRef}
            className="block w-[640px] h-[480px] bg-black"
            muted
            playsInline
            onClick={async () => {
              const v = previewRef.current;
              if (v && v.paused) {
                try { await v.play(); setPreviewReady(true); } catch {}
              }
            }}
            controls
          />
        </div>
      )}
      {/* Playback after capture */}
      {status === "recorded" && blobUrl && (
        <div className="overflow-hidden rounded-lg border">
          <video ref={playbackRef} className="block w-[640px] h-[480px] bg-black" controls src={blobUrl} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={startRecording} disabled={recording || status === "recording"}>
          {recording ? (<><Spinner className="mr-2"/>Recording...</>) : "Start Recording"}
        </Button>
        <Button onClick={stopAndCapture} disabled={!recording} variant="secondary">Stop & Capture</Button>
        <Button onClick={restart} variant="secondary" disabled={recording && status !== "recorded"}>Restart</Button>
      </div>
      {(status === "recording") && (
        <div className="space-y-1">
          <div className="text-sm text-slate-700">{previewReady ? (hint || "Move head left, right and blink") : "Click video to start preview if blocked."}</div>
        </div>
      )}
    </div>
  );
}
