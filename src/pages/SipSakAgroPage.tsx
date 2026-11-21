import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, RefreshCw, Image as ImageIcon, X, Send, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { createSipSakAgroPost } from "@/lib/api";
import { createSafePreviewUrl } from "@/lib/media";

export default function SipSakAgroPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);

  const start = async (mode: "environment" | "user") => {
    setError(null);
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      setError("Kameraya erişilemedi. Galeriden bir fotoğraf seçebilirsin.");
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    start(facing);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const shoot = () => {
    const v = videoRef.current; const c = canvasRef.current;
    if (!v || !c) return;
    const w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) return;
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    c.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `sipsak-${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      setPreview({ file, url });
      stop();
    }, "image/jpeg", 0.92);
  };

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview({ file: f, url: await createSafePreviewUrl(f) });
    stop();
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setCaption("");
    start(facing);
  };

  const share = async () => {
    if (!preview) return;
    setPosting(true);
    try {
      const res = await createSipSakAgroPost(preview.file, caption);
      const ok = res?.ok ?? res?.success ?? !!res?.id ?? true;
      if (ok) {
        URL.revokeObjectURL(preview.url);
        navigate("/feed");
      } else {
        alert(res?.message || "Paylaşılamadı.");
      }
    } catch {
      alert("Paylaşılamadı, internet bağlantını kontrol et.");
    } finally { setPosting(false); }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <header className="sticky top-0 z-30 bg-gradient-to-b from-black/80 to-transparent">
        <div className="max-w-2xl mx-auto flex items-center gap-3 h-16 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold leading-tight">Şip Şak Agro</h1>
              <p className="text-[11px] text-white/70">Tarladan tek tıkla paylaş</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4">
        {!preview ? (
          <section className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] sm:aspect-square ring-1 ring-white/10">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/70 text-center text-sm">
                {error}
              </div>
            )}

            {/* viewfinder grid */}
            <div className="pointer-events-none absolute inset-6 border border-white/20 rounded-2xl" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

            {/* controls */}
            <div className="absolute inset-x-0 bottom-0 p-5 flex items-center justify-around">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center backdrop-blur"
                aria-label="Galeriden seç"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                onClick={shoot}
                className="w-20 h-20 rounded-full bg-white/95 text-black ring-4 ring-white/30 active:scale-95 transition shadow-2xl flex items-center justify-center"
                aria-label="Çek"
              >
                <Camera className="w-8 h-8" />
              </button>
              <button
                onClick={() => setFacing(f => f === "environment" ? "user" : "environment")}
                className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center backdrop-blur"
                aria-label="Kamera değiştir"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
          </section>
        ) : (
          <section className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] sm:aspect-square ring-1 ring-white/10">
              <img src={preview.url} alt="Önizleme" className="w-full h-full object-cover" />
              <button onClick={retake} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 backdrop-blur">
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Bir açıklama yaz (isteğe bağlı)..."
                rows={3}
                className="w-full bg-transparent outline-none text-sm placeholder:text-white/50"
                maxLength={500}
              />
              <div className="text-right text-[10px] text-white/40">{caption.length}/500</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={retake} className="h-12 rounded-2xl bg-white/10 hover:bg-white/20 font-semibold">
                Yeniden çek
              </button>
              <button
                onClick={share}
                disabled={posting}
                className="h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Paylaş
              </button>
            </div>
          </section>
        )}

        <p className="mt-4 text-center text-xs text-white/50">
          Çektiğin fotoğraf, anasayfa akışında normal bir gönderi olarak görünür.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}

