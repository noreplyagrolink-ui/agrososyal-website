import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { Plus, Loader2, X, Send, Volume2, VolumeX, Type } from "lucide-react";
import { getStoredUser, createStory, getToken } from "@/lib/api";
import StoryViewer from "./StoryViewer";
import { createSafePreviewUrl } from "@/lib/media";

const API_BASE = "https://sehitumitkestitarimmtal.com/api";

interface StoryItem {
  id: string;
  mediaUrl: string;
  mediaType?: string;
  text?: string;
  createdAt: string;
  isViewed?: boolean;
}

interface StoryGroup {
  userId: string;
  username: string;
  profilePic?: string;
  stories: StoryItem[];
}

interface OriginRect { x: number; y: number; w: number; h: number; }

const absoluteUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `https://sehitumitkestitarimmtal.com${url}`;
};

const StoriesBar = () => {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [originRect, setOriginRect] = useState<OriginRect | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(true);
  const [captionOpen, setCaptionOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const desktopFileRef = useRef<HTMLInputElement>(null);
  const currentUser = getStoredUser();
  const isVideoFile = !!selectedFile?.type.startsWith("video");

  const location = useLocation();
  const [pickPrompt, setPickPrompt] = useState(false);
  useEffect(() => { loadStories(); }, []);
  useEffect(() => {
    const h = () => fileRef.current?.click();
    window.addEventListener("agro:add-story", h);
    return () => window.removeEventListener("agro:add-story", h);
  }, []);
  useEffect(() => {
    if ((location.state as any)?.addStory) setPickPrompt(true);
  }, [location.state]);

  const openGroup = (g: StoryGroup, e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget.querySelector("img") as HTMLElement | null;
    const el = target || (e.currentTarget as HTMLElement);
    const r = el.getBoundingClientRect();
    setOriginRect({ x: r.left, y: r.top, w: r.width, h: r.height });
    setViewingGroup(g);
  };

  const loadStories = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/stories`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const raw = data.stories || [];
      const mapped: StoryGroup[] = raw.map((g: any) => ({
        userId: g.userId,
        username: g.username,
        profilePic: g.profilePic ? absoluteUrl(g.profilePic) : undefined,
        stories: (g.stories || []).map((s: any) => ({
          ...s,
          mediaUrl: s.mediaUrl ? absoluteUrl(s.mediaUrl) : "",
        })),
      }));
      setGroups(mapped);
    } catch {}
    setLoading(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(await createSafePreviewUrl(file));
    setShowAddModal(false);
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("media", selectedFile);
      if (caption.trim()) fd.append("caption", caption.trim());
      await createStory(fd);
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(null);
      setCaptionOpen(false);
      setSelectedFile(null);
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      if (desktopFileRef.current) desktopFileRef.current.value = "";
      await loadStories();
    } catch {}
    setUploading(false);
  };

  const cancelUpload = () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setCaptionOpen(false);
    setPreviewMuted(true);
    setSelectedFile(null);
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";
    if (desktopFileRef.current) desktopFileRef.current.value = "";
  };

  const triggerFilePick = () => {
    // Works on both mobile and desktop
    fileRef.current?.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const StoryCircle = ({ g }: { g: StoryGroup }) => {
    const hasUnviewed = g.stories.some((s) => !s.isViewed);
    const avatar = g.profilePic || "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
    return (
      <button
        key={g.userId}
        onClick={(e) => openGroup(g, e)}
        className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform"
      >
        <div className={`w-16 h-16 ${hasUnviewed ? "story-ring" : "story-ring-seen"}`}>
          <img src={avatar} alt={g.username} className="w-full h-full rounded-full object-cover border-2 border-card" />
        </div>
        <span className="text-[10px] text-muted-foreground font-medium truncate w-16 text-center">{g.username}</span>
      </button>
    );
  };

  return (
    <>
      {pickPrompt && createPortal(
        <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => setPickPrompt(false)}>
          <div className="w-full max-w-md bg-background rounded-t-[28px] md:rounded-[28px] p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold mb-1">Hikaye paylaş</h3>
            <p className="text-sm text-muted-foreground mb-4">Bir fotoğraf veya video seç, 24 saat boyunca görünsün.</p>
            <button onClick={() => { setPickPrompt(false); fileRef.current?.click(); }} className="w-full h-[54px] rounded-full nex-gradient text-white font-bold">Fotoğraf / Video seç</button>
          </div>
        </div>, document.body)}
      {/* ── Mobile stories row ── */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-3 md:hidden">
        {/* Add story button */}
        <button onClick={triggerFilePick} className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="relative w-16 h-16">
            <img
              src={currentUser?.profilePic ? absoluteUrl(currentUser.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"}
              alt="Sen"
              className="w-16 h-16 rounded-full object-cover border-2 border-border"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-card">
              <Plus className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">Hikayen</span>
        </button>

        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

        {groups.map((g) => <StoryCircle key={g.userId} g={g} />)}
      </div>

      {/* ── Desktop stories row (inside feed column, above posts) ── */}
      <div className="hidden md:flex gap-3 overflow-x-auto scrollbar-hide px-0 py-3 border-b border-border mb-4">
        {/* Add story — desktop */}
        <button
          onClick={triggerFilePick}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
        >
          <div className="relative w-16 h-16">
            <img
              src={currentUser?.profilePic ? absoluteUrl(currentUser.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"}
              alt="Sen"
              className="w-16 h-16 rounded-full object-cover border-2 border-border group-hover:border-primary/50 transition-colors"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-card shadow-sm">
              <Plus className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">Hikaye Ekle</span>
        </button>

        {groups.map((g) => <StoryCircle key={g.userId} g={g} />)}
      </div>

      {/* ── Instagram tarzı hikaye ön izlemesi ──
          Portal: üst öğelerdeki transform/animasyon "fixed"i bozmasın diye body'ye render edilir. */}
      {preview && createPortal(
        <div
          className="fixed inset-0 z-[400] bg-black flex flex-col items-center"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          role="dialog"
          aria-modal="true"
        >
          {/* Bulanık arka plan */}
          {isVideoFile ? (
            <video src={preview} className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-125" muted autoPlay loop playsInline />
          ) : (
            <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-125" />
          )}

          {/* 9:16 hikaye çerçevesi */}
          <div className="relative flex-1 w-full min-h-0 flex items-center justify-center px-3 py-3">
            <div
              className="relative h-full max-h-full aspect-[9/16] max-w-full rounded-[28px] overflow-hidden bg-black shadow-2xl ring-1 ring-white/15"
            >
              {isVideoFile ? (
                <video
                  src={preview}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay loop playsInline muted={previewMuted}
                />
              ) : (
                <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}

              {/* Üst/alt gradyan */}
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

              {/* İlerleme çubuğu (tek parça) */}
              <div className="absolute top-2.5 inset-x-3 h-[3px] rounded-full bg-white/35 overflow-hidden">
                <div className="h-full w-full bg-white rounded-full" />
              </div>

              {/* Üst bar: kullanıcı + kapat */}
              <div className="absolute top-5 inset-x-3 flex items-center gap-2">
                <img
                  src={currentUser?.profilePic ? absoluteUrl(currentUser.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-white/60"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[13px] font-semibold truncate leading-tight">{currentUser?.username || "Hikayen"}</p>
                  <p className="text-white/70 text-[11px] leading-tight">Şimdi · Ön izleme</p>
                </div>
                {isVideoFile && (
                  <button
                    onClick={() => setPreviewMuted((m) => !m)}
                    className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center active:scale-90 transition"
                    aria-label={previewMuted ? "Sesi aç" : "Sesi kapat"}
                  >
                    {previewMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                  </button>
                )}
                <button
                  onClick={cancelUpload}
                  className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center active:scale-90 transition"
                  aria-label="Kapat"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Açıklama — görselin üstünde, hikayedeki gibi */}
              {caption.trim() && !captionOpen && (
                <button
                  onClick={() => setCaptionOpen(true)}
                  className="absolute left-4 right-4 bottom-24 text-center"
                >
                  <span className="inline-block max-w-full px-3.5 py-2 rounded-xl bg-black/55 backdrop-blur text-white text-[15px] font-medium leading-snug break-words">
                    {caption}
                  </span>
                </button>
              )}

              {/* Açıklama giriş alanı */}
              {captionOpen && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center px-6 gap-4">
                  <textarea
                    autoFocus
                    value={caption}
                    onChange={(e) => setCaption(e.target.value.slice(0, 200))}
                    placeholder="Bir şeyler yaz..."
                    rows={3}
                    maxLength={200}
                    className="w-full bg-transparent text-white text-center text-xl font-semibold placeholder:text-white/50 outline-none resize-none"
                  />
                  <button
                    onClick={() => setCaptionOpen(false)}
                    className="px-6 py-2 rounded-full bg-white text-black text-sm font-bold active:scale-95 transition"
                  >
                    Bitti
                  </button>
                </div>
              )}

              {/* Alt bar: Aa + paylaş */}
              {!captionOpen && (
                <div className="absolute bottom-4 inset-x-4 flex items-center gap-3">
                  <button
                    onClick={() => setCaptionOpen(true)}
                    className="w-11 h-11 rounded-full bg-black/45 backdrop-blur ring-1 ring-white/20 flex items-center justify-center active:scale-90 transition flex-shrink-0"
                    aria-label="Metin ekle"
                  >
                    <Type className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1 h-11 rounded-full font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 bg-white text-black active:scale-[0.98] transition"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {uploading ? "Yükleniyor..." : "Hikayene ekle"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {viewingGroup && (
        <StoryViewer
          group={viewingGroup}
          originRect={originRect || undefined}
          onClose={() => { setViewingGroup(null); setOriginRect(null); loadStories(); }}
        />
      )}
    </>
  );
};

export default StoriesBar;




