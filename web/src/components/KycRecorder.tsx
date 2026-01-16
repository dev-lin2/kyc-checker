import { useEffect, useRef, useState } from "react";
import { Alert, Button, Spinner } from "./ui";

type Props = {
  onSubmit: (blob: Blob) => Promise<void> | void;
};

export function KycRecorder({ onSubmit }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Start camera immediately on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) return;
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.muted = true;
          (v as any).playsInline = true;
          try {
            await v.play();
          } catch {
            // Some browsers require a user gesture; controls allow manual play
          }
        }
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  async function startRecording() {
    try {
      setErr("");
      setRecordedBlob(null);
      const stream = streamRef.current;
      if (!stream) throw new Error("Camera not ready");
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        setRecordedBlob(blob);
      };
      // Ensure preview is playing
      const v = videoRef.current;
      if (v && v.paused) {
        try {
          await v.play();
        } catch {}
      }
      mr.start();
      setRecording(true);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function submit() {
    try {
      setErr("");
      setSubmitting(true);
      // If still recording, stop and wait for blob
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") {
        await new Promise<void>((resolve) => {
          const handleStop = () => resolve();
          mr.addEventListener("stop", handleStop, { once: true });
          mr.stop();
          setRecording(false);
        });
      }
      const blob = recordedBlob || (chunksRef.current.length ? new Blob(chunksRef.current, { type: "video/webm" }) : null);
      if (!blob) throw new Error("Nothing recorded. Click Start Recording first.");
      await onSubmit(blob);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {err ? <Alert variant="error">{err}</Alert> : null}
      <div className="overflow-hidden rounded-lg border">
        <video ref={videoRef} className="block w-[640px] h-[480px] bg-black" muted playsInline />
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={startRecording} disabled={recording}>
          {recording ? (<><Spinner className="mr-2"/>Recording...</>) : "Start Recording"}
        </Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? (<><Spinner className="mr-2"/>Submitting...</>) : "Submit"}
        </Button>
      </div>
      <div className="text-xs text-slate-600">Move head left, right and blink before submitting.</div>
    </div>
  );
}
