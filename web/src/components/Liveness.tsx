import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Spinner } from "./ui";

type Props = { onPassed: (frameBlob: Blob) => void };

export function LivenessCheck({ onPassed }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [err, setErr] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const constraints = useMemo(() => ({ video: { facingMode: "user", width: 640, height: 480 } }), []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        setErr("");
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    })();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [constraints]);

  async function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    setCapturing(true);
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 0));
    c.toBlob((blob) => {
      setCapturing(false);
      if (blob) onPassed(blob);
    }, "image/jpeg", 0.9);
  }

  return (
    <div className="space-y-3">
      {err ? <Alert variant="error">{err}</Alert> : null}
      <div className="relative inline-block rounded-lg overflow-hidden border">
        <video ref={videoRef} className="block w-[640px] h-[480px] bg-black" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={capture} disabled={!ready || capturing}>
          {capturing ? (<><Spinner className="mr-2"/>Capturing...</>) : "Capture Snapshot"}
        </Button>
        <div className="text-xs text-slate-600">Center your face and click capture.</div>
      </div>
    </div>
  );
}

