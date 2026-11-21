import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ImagePlus, X, Loader2, Film, BarChart3, MapPin, Loader,
  Music, Play, Pause, Check, ChevronLeft, ArrowRight,
  Crop, Sparkles, Volume2, VolumeX, Plus, Trash2, Clock, Scissors,
  Radio, Video, Tag, Search, MessageCircle, MessageCircleOff,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import OmniRewriteBar from "@/components/OmniRewriteBar";
import PostPreviewCard from "@/components/PostPreviewCard";
import { uploadWithProgress, getHlsStatus, getMusicTracks, getToken } from "@/lib/api";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { Progress } from "@/components/ui/progress";
import { createSafePreviewUrl } from "@/lib/media";
import { useLanguage } from "@/contexts/LanguageContext";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface MusicTrack { id: string; name: string; filename: string; url: string; }
interface MediaItem {
  file: File;
  url: string;
  type: "image" | "video";
  filter: string;
  muted: boolean;
  /** Görsel için saniye cinsinden gösterim süresi (yalnızca image). */
  duration: number;
}

const FILTERS = [
  { id: "none",       labelKey: "filterNone" as const,     css: "",                                                   ffmpeg: "" },
  { id: "vivid",      labelKey: "filterVivid" as const,    css: "saturate(1.8) contrast(1.1)",                        ffmpeg: "eq=saturation=1.8:contrast=1.1" },
  { id: "warm",       labelKey: "filterWarm" as const,     css: "sepia(0.4) saturate(1.3) brightness(1.05)",          ffmpeg: "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0,eq=saturation=1.3:brightness=0.05" },
  { id: "cool",       labelKey: "filterCool" as const,     css: "hue-rotate(30deg) saturate(1.2) brightness(1.05)",   ffmpeg: "hue=h=30,eq=saturation=1.2:brightness=0.05" },
  { id: "fade",       labelKey: "filterFade" as const,     css: "brightness(1.1) contrast(0.85) saturate(0.8)",       ffmpeg: "eq=brightness=0.1:contrast=0.85:saturation=0.8" },
  { id: "bw",         labelKey: "filterBw" as const,       css: "grayscale(1)",                                     ffmpeg: "hue=s=0" },
  { id: "dramatic",   labelKey: "filterDramatic" as const, css: "contrast(1.4) brightness(0.9) saturate(1.2)",        ffmpeg: "eq=contrast=1.4:brightness=-0.1:saturation=1.2" },
  { id: "golden",     labelKey: "filterGolden" as const,   css: "sepia(0.6) brightness(1.1) saturate(1.4)",           ffmpeg: "colorchannelmixer=.472:.922:.227:0:.419:.823:.202:0:.326:.641:.157:0,eq=saturation=1.4:brightness=0.1" },
];

const DEFAULT_IMAGE_DURATION = 5;   // saniye
const MIN_IMAGE_DURATION = 1;
const MAX_IMAGE_DURATION = 15;

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
const CreatePostPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Step: "edit" | "share"
  const [step, setStep] = useState<"edit" | "share">("edit");

  // Media
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  // ── Sadece görsel(ler) seçildiğinde: "Gönderi" mi "Video" mu? ──
  // null  → henüz seçim yapılmadı, seçim ekranı gösterilecek
  // "post"  → normal statik gönderi (süre/müzik paneli YOK)
  // "video" → slayt/video akışı (mevcut süre + müzik paneli)
  const [postMode, setPostMode] = useState<"post" | "video" | null>(null);

  // Share step
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [hlsPct, setHlsPct] = useState<number | null>(null);
  const hlsTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [ffmpegProgress, setFfmpegProgress] = useState<number | null>(null);
  const [ffmpegStage, setFfmpegStage] = useState<string>("Müzik ekleniyor");
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // Music
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [previewTrack, setPreviewTrack] = useState<MusicTrack | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Müzik kesim ayarları (Instagram tarzı) ──
  /** Seçilen müziğin kaçıncı saniyesinden başlayacak (start offset). */
  const [musicStart, setMusicStart] = useState(0);
  /** Seçilen müziğin toplam süresi (metadata'dan okunur). */
  const [musicDuration, setMusicDuration] = useState<number | null>(null);
  /** Trim önizlemesi için oynatıcı. */
  const trimAudioRef = useRef<HTMLAudioElement | null>(null);
  const [trimPlaying, setTrimPlaying] = useState(false);

  // Location
  const [locationName, setLocationName] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const [locCoords, setLocCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Poll
  const [isPoll, setIsPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  // Kişi Etiketleme
  const [taggedUsers, setTaggedUsers] = useState<{ id: string; name: string; username: string; profilePic?: string }[]>([]);
  const [allowComments, setAllowComments] = useState(true);
  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [tagResults, setTagResults] = useState<any[]>([]);
  const [tagSearching, setTagSearching] = useState(false);

  // Music search
  const [musicSearch, setMusicSearch] = useState("");

  useEffect(() => () => { if (hlsTimer.current) clearInterval(hlsTimer.current); }, []);

  useEffect(() => {
    setTracksLoading(true);
    getMusicTracks()
      .then((d) => setTracks(d.tracks || []))
      .catch(() => {})
      .finally(() => setTracksLoading(false));
  }, []);

  // FFmpeg'i uygulama açılırken arka planda yükle → müzik eklerken bekleme olmaz
  useEffect(() => {
    const preload = async () => {
      try {
        const ff = new FFmpeg();
        ff.on("progress", ({ progress }) => setFfmpegProgress(Math.round(progress * 100)));
        await ff.load();
        ffmpegRef.current = ff;
      } catch { /* sessizce geç */ }
    };
    preload();
  }, []);

  // Stop preview audio when music panel closes
  useEffect(() => {
    if (!musicPanelOpen && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPreviewTrack(null);
    }
  }, [musicPanelOpen]);

  // Trim önizleme oynatıcısını temizle (track değişince / unmount)
  useEffect(() => {
    return () => {
      if (trimAudioRef.current) {
        trimAudioRef.current.pause();
        trimAudioRef.current = null;
      }
    };
  }, []);

  // ──────────────────────────────────────────────
  // Toplam görsel süresi (slayt müzik bölümü uzunluğu)
  // ──────────────────────────────────────────────
  const totalImageDuration = mediaItems
    .filter(m => m.type === "image")
    .reduce((acc, m) => acc + (m.duration || DEFAULT_IMAGE_DURATION), 0);

  const hasVideo = mediaItems.some(m => m.type === "video");
  const hasImage = mediaItems.some(m => m.type === "image");
  const allImages = hasImage && !hasVideo;

  /** Müzik için ihtiyaç duyulan segment süresi.
   *  - Sadece görsel varsa: toplam görsel süresi
   *  - Video varsa: var olan davranış (videoyla aynı uzunluk → -shortest)
   */
  const neededMusicSpan = allImages ? totalImageDuration : 0;

  /** Seçilen müzikte start için izin verilen max değer. */
  const maxMusicStart = musicDuration
    ? Math.max(0, musicDuration - Math.max(neededMusicSpan, 1))
    : 0;

  // ──────────────────────────────────────────────
  // Müzik seçilince süresini ölç
  // ──────────────────────────────────────────────
  useEffect(() => {
    setMusicDuration(null);
    setMusicStart(0);
    setTrimPlaying(false);
    if (trimAudioRef.current) {
      trimAudioRef.current.pause();
      trimAudioRef.current = null;
    }
    if (!selectedTrack) return;
    const a = new Audio(selectedTrack.url);
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      if (Number.isFinite(a.duration)) setMusicDuration(a.duration);
    };
  }, [selectedTrack]);

  // Start sınırı görsel sayısı/süresi değişince yeniden kıs
  useEffect(() => {
    if (musicStart > maxMusicStart) setMusicStart(maxMusicStart);
  }, [maxMusicStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePreview = (track: MusicTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewTrack?.id === track.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPreviewTrack(null);
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const audio = new Audio(track.url);
      audio.play().catch(() => {});
      audioRef.current = audio;
      setPreviewTrack(track);
      audio.onended = () => { setPreviewTrack(null); audioRef.current = null; };
    }
  };

  // ──────────────────────────────────────────────
  // Trim önizleme: seçilen başlangıçtan neededMusicSpan kadar çal
  // ──────────────────────────────────────────────
  const toggleTrimPreview = () => {
    if (!selectedTrack) return;
    if (trimPlaying) {
      trimAudioRef.current?.pause();
      trimAudioRef.current = null;
      setTrimPlaying(false);
      return;
    }
    const a = new Audio(selectedTrack.url);
    a.currentTime = musicStart;
    a.play().catch(() => {});
    trimAudioRef.current = a;
    setTrimPlaying(true);

    const span = Math.max(neededMusicSpan, 1);
    const stopAt = musicStart + span;
    const onTime = () => {
      if (!trimAudioRef.current) return;
      if (trimAudioRef.current.currentTime >= stopAt) {
        trimAudioRef.current.pause();
        trimAudioRef.current.removeEventListener("timeupdate", onTime);
        trimAudioRef.current = null;
        setTrimPlaying(false);
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.onended = () => { setTrimPlaying(false); trimAudioRef.current = null; };
  };

  const detectLocation = async () => {
    if (!("geolocation" in navigator)) { setError(t("cpBrowserNoLocation")); return; }
    setError("");
    try {
      if (navigator.permissions?.query) {
        const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        if (status.state === "denied") { setError(t("cpLocationDenied")); return; }
      }
    } catch {}
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=tr`);
          const d = await r.json();
          const a = d.address || {};
          // İl ve ilçe olarak formatla — koordinat gösterme
          const ilce = a.town || a.city_district || a.suburb || a.village || a.hamlet || "";
          const il = a.province || a.state || a.city || a.county || "";
          const name = [ilce, il].filter(Boolean).join(", ");
          setLocationName(name || (il || ilce || t("cpTurkiye")));
        } catch {
          setLocationName(t("cpLocationReceived"));
        } finally { setLocLoading(false); }
      },
      (err) => {
        setLocLoading(false);
        if (err.code === err.PERMISSION_DENIED) setError(t("cpLocationPermDenied"));
        else setError(t("cpLocationFailed"));
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    // createSafePreviewUrl: HEIC/AVIF/yüksek-MP dosyaları Canvas ile JPEG'e çevirir
    const newItems: MediaItem[] = await Promise.all(
      selected.map(async (f) => ({
        file: f,
        url: f.type.startsWith("video") ? URL.createObjectURL(f) : await createSafePreviewUrl(f),
        type: f.type.startsWith("video") ? "video" as const : "image" as const,
        filter: "none",
        muted: false,
        duration: DEFAULT_IMAGE_DURATION,
      }))
    );
    const combined = [...mediaItems, ...newItems].slice(0, 10);
    setMediaItems(combined);
    setActiveIdx(combined.length - 1);
    setIsPoll(false);

    // Gerçek video dosyası varsa süre/mod sorusu anlamsız → direkt video akışı.
    // Yalnızca görsel(ler) seçildiyse kullanıcıya "Gönderi mi, Video mu?" sor.
    const combinedHasVideo = combined.some(m => m.type === "video");
    if (combinedHasVideo) setPostMode("video");
    else setPostMode(null); // seçim ekranı gösterilecek

    e.target.value = "";
  };

  const removeMedia = (idx: number) => {
    const updated = mediaItems.filter((_, i) => i !== idx);
    setMediaItems(updated);
    setActiveIdx(Math.min(activeIdx, updated.length - 1));
    if (updated.length === 0) setPostMode(null);
    else if (updated.some(m => m.type === "video")) setPostMode("video");
  };

  const setFilter = (filterId: string) => {
    setMediaItems(prev => prev.map((m, i) => i === activeIdx ? { ...m, filter: filterId } : m));
  };

  const toggleMute = (idx: number) => {
    setMediaItems(prev => prev.map((m, i) => i === idx ? { ...m, muted: !m.muted } : m));
  };

  const setImageDuration = (idx: number, seconds: number) => {
    const clamped = Math.min(MAX_IMAGE_DURATION, Math.max(MIN_IMAGE_DURATION, seconds));
    setMediaItems(prev => prev.map((m, i) => i === idx ? { ...m, duration: clamped } : m));
  };

  const addPollOption = () => { if (pollOptions.length < 4) setPollOptions([...pollOptions, ""]); };
  const removePollOption = (idx: number) => { if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, i) => i !== idx)); };

  // Kişi arama (etiketleme)
  const searchUsers = async (q: string) => {
    if (!q.trim()) { setTagResults([]); return; }
    setTagSearching(true);
    try {
      const token = getToken();
      const res = await fetch(`https://sehitumitkestitarimmtal.com/api/search/users?q=${encodeURIComponent(q)}&limit=10`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setTagResults(data.users || data.results || []);
    } catch { setTagResults([]); }
    setTagSearching(false);
  };

  const addTaggedUser = (u: any) => {
    if (!taggedUsers.find(tu => tu.id === u.id)) {
      setTaggedUsers(prev => [...prev, { id: u.id, name: u.name || u.username, username: u.username, profilePic: u.profilePic }]);
    }
    setTagSearch("");
    setTagResults([]);
    setTagPanelOpen(false);
  };

  const removeTaggedUser = (id: string) => setTaggedUsers(prev => prev.filter(u => u.id !== id));

  const filteredTracks = tracks.filter(tr => tr.name.toLowerCase().includes(musicSearch.toLowerCase()));

  // Yalnızca görsel(ler) seçiliyken kullanıcı "Gönderi/Video" seçimini yapmadan ilerleyemez.
  const needsModeChoice = allImages && postMode === null;
  const canProceed = (mediaItems.length > 0 || isPoll || caption.trim().length > 0) && !needsModeChoice;

  // ──────────────────────────────────────────────
  // FFmpeg: tek görsel + müzik segmenti → MP4
  // ──────────────────────────────────────────────
  const buildImageWithMusic = async (image: MediaItem, track: MusicTrack): Promise<Blob> => {
    if (!ffmpegRef.current) {
      const ff = new FFmpeg();
      ff.on("progress", ({ progress }) => setFfmpegProgress(Math.round(progress * 100)));
      await ff.load();
      ffmpegRef.current = ff;
    }
    const ff = ffmpegRef.current;

    const imgExt = (image.file.name.split(".").pop() || "jpg").toLowerCase();
    const imgName = `img.${imgExt}`;

    // Sadece seçilen müzik segmentini önce kes → küçük blob → hızlı yükle
    const audioRes = await fetch(track.url);
    const audioBlob = await audioRes.blob();

    await ff.writeFile(imgName, await fetchFile(image.file));
    await ff.writeFile("music_full.mp3", await fetchFile(audioBlob));

    // Adım 1: müziği trim et (sadece seçilen kısım)
    const dur = image.duration || DEFAULT_IMAGE_DURATION;
    await ff.exec([
      "-ss", String(musicStart),
      "-t", String(dur),
      "-i", "music_full.mp3",
      "-c", "copy",
      "music_trim.mp3",
    ]);

    // FFmpeg filter: CSS filtresi varsa uygula
    const filterDef = FILTERS.find(f => f.id === image.filter);
    const vfBase = "scale=trunc(iw/2)*2:trunc(ih/2)*2";
    const vfFilter = filterDef?.ffmpeg ? `${vfBase},${filterDef.ffmpeg}` : vfBase;

    // Adım 2: görsel + trim müzik → MP4 (ultrafast → çok hızlı)
    await ff.exec([
      "-loop", "1",
      "-t", String(dur),
      "-i", imgName,
      "-i", "music_trim.mp3",
      "-vf", vfFilter,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-tune", "stillimage",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      "-movflags", "+faststart",
      "output.mp4",
    ]);

    const data = await ff.readFile("output.mp4");
    const blob = new Blob([data instanceof Uint8Array ? data.buffer : data], { type: "video/mp4" });
    await ff.deleteFile(imgName).catch(() => {});
    await ff.deleteFile("music_full.mp3").catch(() => {});
    await ff.deleteFile("music_trim.mp3").catch(() => {});
    await ff.deleteFile("output.mp4").catch(() => {});
    return blob;
  };

  // ──────────────────────────────────────────────
  // FFmpeg: birden fazla görsel (slayt) + müzik segmenti → MP4
  // ──────────────────────────────────────────────
  const buildSlideshowWithMusic = async (images: MediaItem[], track: MusicTrack): Promise<Blob> => {
    if (!ffmpegRef.current) {
      const ff = new FFmpeg();
      ff.on("progress", ({ progress }) => setFfmpegProgress(Math.round(progress * 100)));
      await ff.load();
      ffmpegRef.current = ff;
    }
    const ff = ffmpegRef.current;

    const totalDur = images.reduce((a, m) => a + (m.duration || DEFAULT_IMAGE_DURATION), 0);

    // Önce müziği trim et → sadece gerekli kısım yüklenir
    const audioRes = await fetch(track.url);
    const audioBlob = await audioRes.blob();
    await ff.writeFile("music_full.mp3", await fetchFile(audioBlob));
    await ff.exec([
      "-ss", String(musicStart),
      "-t", String(totalDur),
      "-i", "music_full.mp3",
      "-c", "copy",
      "music_trim.mp3",
    ]);
    await ff.deleteFile("music_full.mp3").catch(() => {});

    // 1) Her görseli kendi süresiyle + filtresiyle MP4 parçasına çevir (sessiz, ultrafast)
    const partNames: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const ext = (img.file.name.split(".").pop() || "jpg").toLowerCase();
      const imgName = `slide_${i}.${ext}`;
      const partName = `part_${i}.mp4`;
      await ff.writeFile(imgName, await fetchFile(img.file));

      const filterDef = FILTERS.find(f => f.id === img.filter);
      const vfBase = "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1";
      const vfFilter = filterDef?.ffmpeg ? `${vfBase},${filterDef.ffmpeg}` : vfBase;

      await ff.exec([
        "-loop", "1",
        "-t", String(img.duration || DEFAULT_IMAGE_DURATION),
        "-i", imgName,
        "-vf", vfFilter,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        "-r", "25",
        "-an",
        partName,
      ]);
      partNames.push(partName);
      await ff.deleteFile(imgName).catch(() => {});
    }

    // 2) Concat (demuxer)
    const listText = partNames.map(n => `file '${n}'`).join("\n");
    await ff.writeFile("list.txt", new TextEncoder().encode(listText));
    await ff.exec([
      "-f", "concat",
      "-safe", "0",
      "-i", "list.txt",
      "-c", "copy",
      "slides.mp4",
    ]);

    // 3) Trim edilmiş müziği ekle (zaten kısaltılmış)
    await ff.exec([
      "-i", "slides.mp4",
      "-i", "music_trim.mp3",
      "-map", "0:v",
      "-map", "1:a",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      "-movflags", "+faststart",
      "final.mp4",
    ]);

    const data = await ff.readFile("final.mp4");
    const blob = new Blob([data instanceof Uint8Array ? data.buffer : data], { type: "video/mp4" });

    // Cleanup
    for (const p of partNames) await ff.deleteFile(p).catch(() => {});
    await ff.deleteFile("list.txt").catch(() => {});
    await ff.deleteFile("slides.mp4").catch(() => {});
    await ff.deleteFile("music_trim.mp3").catch(() => {});
    await ff.deleteFile("final.mp4").catch(() => {});
    return blob;
  };

  // ── SHARE ──
  const handleShare = async () => {
    if (mediaItems.length === 0 && !caption.trim() && !isPoll) return;
    if (isPoll && (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2)) {
      setError(t("cpPollRequired")); return;
    }
    setLoading(true); setError("");
    try {
      const formData = new FormData();
      const videoItem = mediaItems.find(m => m.type === "video");
      const imageItems = mediaItems.filter(m => m.type === "image");

      // ── 1) Video + müzik (mevcut akış) ──
      if (videoItem && selectedTrack) {
        setFfmpegProgress(0);
        setFfmpegStage(t("cpFfmpegAddingMusic"));
        try {
          if (!ffmpegRef.current) {
            const ff = new FFmpeg();
            ff.on("progress", ({ progress }) => setFfmpegProgress(Math.round(progress * 100)));
            await ff.load();
            ffmpegRef.current = ff;
          }
          const ff = ffmpegRef.current;
          const audioRes = await fetch(selectedTrack.url);
          const audioBlob = await audioRes.blob();
          await ff.writeFile("video.mp4", await fetchFile(videoItem.file));
          await ff.writeFile("music_full.mp3", await fetchFile(audioBlob));
          // Önce müziği seçilen başlangıçtan kes
          await ff.exec([
            "-ss", String(musicStart),
            "-i", "music_full.mp3",
            "-c", "copy",
            "music_trim.mp3",
          ]);
          await ff.deleteFile("music_full.mp3").catch(() => {});
          await ff.exec([
            "-i", "video.mp4",
            "-i", "music_trim.mp3",
            "-map", "0:v", "-map", "1:a",
            "-shortest",
            "-c:v", "copy", "-c:a", "aac",
            "-b:a", "128k",
            "output.mp4",
          ]);
          const data = await ff.readFile("output.mp4");
          const outputBlob = new Blob([data instanceof Uint8Array ? data.buffer : data], { type: "video/mp4" });
          formData.append("media", outputBlob, "post.mp4");
          await ff.deleteFile("video.mp4").catch(() => {});
          await ff.deleteFile("music_trim.mp3").catch(() => {});
          await ff.deleteFile("output.mp4").catch(() => {});
        } catch (ffErr) {
          console.error("FFmpeg hatası:", ffErr);
          formData.append("media", videoItem.file);
        } finally { setFfmpegProgress(null); }

        // Video yanında ek görseller varsa onları da ekle
        imageItems.forEach(m => formData.append("media", m.file));
      }

      // ── 2) Sadece görseller + müzik → slayt/tek karelik video (yalnızca "Video" modunda) ──
      else if (!videoItem && imageItems.length > 0 && selectedTrack && postMode === "video") {
        setFfmpegProgress(0);
        setFfmpegStage(imageItems.length > 1 ? t("cpFfmpegSlideVideo") : t("cpFfmpegAddingMusicToImage"));
        try {
          const blob = imageItems.length === 1
            ? await buildImageWithMusic(imageItems[0], selectedTrack)
            : await buildSlideshowWithMusic(imageItems, selectedTrack);
          formData.append("media", blob, "post.mp4");
        } catch (ffErr) {
          console.error("FFmpeg hatası:", ffErr);
          // Fallback: müzik olmadan görselleri yolla
          imageItems.forEach(m => formData.append("media", m.file));
        } finally { setFfmpegProgress(null); }
      }

      // ── 3) Müziksiz akış ──
      else {
        if (videoItem) formData.append("media", videoItem.file);
        imageItems.forEach(m => formData.append("media", m.file));
      }

      if (caption.trim()) formData.append("content", caption);
      if (locationName.trim()) formData.append("locationName", locationName.trim());
      if (taggedUsers.length > 0) formData.append("taggedUsers", JSON.stringify(taggedUsers.map(u => u.id)));
      formData.append("allowComments", allowComments ? "true" : "false");
      if (isPoll) {
        formData.append("isPoll", "true");
        formData.append("pollQuestion", pollQuestion);
        formData.append("pollOptions", JSON.stringify(pollOptions.filter(o => o.trim())));
      }
      setUploadPct(0);
      const data = await uploadWithProgress("/posts", formData, (p) => setUploadPct(p));
      if (data.error) { setError(data.error); return; }

      const videoId = data.videoId || data.post?.videoId || data.post?.id;
      // Görsel + müzik birleştirilince de sonuç bir videodur → HLS bekleyebiliriz
      const producedVideo = hasVideo || (allImages && postMode === "video" && !!selectedTrack);
      if (producedVideo && videoId) {
        setHlsPct(0);
        await new Promise<void>((resolve) => {
          let attempts = 0;
          hlsTimer.current = setInterval(async () => {
            attempts++;
            try {
              const s = await getHlsStatus(videoId);
              const pct = s.progress ?? s.percent ?? (s.status === "ready" ? 100 : null);
              if (typeof pct === "number") setHlsPct(pct);
              if (s.status === "ready" || pct === 100 || attempts > 60) {
                if (hlsTimer.current) clearInterval(hlsTimer.current);
                resolve();
              }
            } catch {
              if (attempts > 10) { if (hlsTimer.current) clearInterval(hlsTimer.current); resolve(); }
            }
          }, 2000);
        });
      }
      // Başarı: toast göster, 3sn sonra feed'e git
      const postId = data?.post?.id || data?.id || null;
      setCreatedPostId(postId || "done");
      setTimeout(() => navigate("/feed"), 3000);
    } catch { setError(t("cpShareFailed")); }
    finally { setLoading(false); setUploadPct(0); setHlsPct(null); }
  };

  const activeItem = mediaItems[activeIdx] ?? null;
  const activeFilter = FILTERS.find(f => f.id === (activeItem?.filter ?? "none")) ?? FILTERS[0];

  // Müzik panelini hangi koşulda gösterelim:
  // - Video varsa (eski davranış)
  // - Sadece görsel varsa VE kullanıcı "Video" modunu seçtiyse
  const showMusicPanel = hasVideo || (allImages && postMode === "video");

  // ══════════════════════════════════════════════
  // RENDER — EDIT STEP
  // ══════════════════════════════════════════════
  if (step === "edit") {
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">{t("cpBack")}</span>
            </button>
            <h1 className="text-base font-bold text-foreground">{t("cpEdit")}</h1>
            <button
              onClick={() => { if (canProceed) setStep("share"); }}
              disabled={!canProceed}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary disabled:text-muted-foreground transition-colors"
            >
              İleri
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="max-w-lg mx-auto w-full px-0 flex-1 flex flex-col">

          {/* ── Gönderi / Video seçim ekranı ──
              Yalnızca görsel(ler) seçildiğinde ve henüz mod seçilmediğinde gösterilir. */}
          {mediaItems.length > 0 && allImages && postMode === null && (
            <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-5 animate-scale-in">
              <p className="text-sm font-semibold text-foreground mb-1">{t("cpShareHow")}</p>
              <p className="text-xs text-muted-foreground mb-4">
                {mediaItems.length > 1 ? t("cpPhotosSelectedMany", { count: mediaItems.length }) : t("cpPhotosSelectedOne")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPostMode("post")}
                  className="flex flex-col items-center gap-2 rounded-2xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-all p-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ImagePlus className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{t("cpPost")}</span>
                  <span className="text-[11px] text-muted-foreground text-center leading-tight">
                    {t("cpPostModeDesc")}
                  </span>
                </button>
                <button
                  onClick={() => setPostMode("video")}
                  className="flex flex-col items-center gap-2 rounded-2xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-all p-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Film className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{t("cpVideo")}</span>
                  <span className="text-[11px] text-muted-foreground text-center leading-tight">
                    {t("cpVideoModeDesc")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── Main Preview ── */}
          {mediaItems.length === 0 ? (
            <label className="flex flex-col items-center justify-center mx-4 mt-4 aspect-[4/3] rounded-2xl border-2 border-dashed border-border bg-muted/40 cursor-pointer hover:border-primary/50 hover:bg-muted/60 transition-all">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <ImagePlus className="w-8 h-8 text-primary" />
                </div>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Film className="w-8 h-8 text-primary" />
                </div>
              </div>
              <span className="text-sm font-semibold text-foreground">{t("cpAddPhotoVideo")}</span>
              <span className="text-xs text-muted-foreground mt-1">{t("cpMaxFiles")}</span>
              <input type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" />
            </label>
          ) : (
            <div className="relative mx-4 mt-4 rounded-3xl overflow-hidden bg-black aspect-[4/5] shadow-lg ring-1 ring-border">
              {/* Bulanık arka plan (Instagram gibi boşlukları doldurur) */}
              {activeItem?.type === "image" && (
                <img src={activeItem.url} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-60" />
              )}
              {activeItem?.type === "video" ? (
                <video
                  src={activeItem.url}
                  className="relative w-full h-full object-contain"
                  style={{ filter: activeFilter.css }}
                  autoPlay muted={activeItem.muted} loop playsInline
                />
              ) : (
                <img
                  src={activeItem?.url}
                  alt=""
                  className="relative w-full h-full object-contain"
                  style={{ filter: activeFilter.css }}
                />
              )}

              {/* Top-right controls overlay */}
              <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                <button
                  onClick={() => removeMedia(activeIdx)}
                  className="w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                </button>
                {activeItem?.type === "video" && (
                  <button
                    onClick={() => toggleMute(activeIdx)}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center"
                  >
                    {activeItem.muted
                      ? <VolumeX className="w-3.5 h-3.5 text-white" />
                      : <Volume2 className="w-3.5 h-3.5 text-white" />
                    }
                  </button>
                )}
              </div>

              {/* Süre rozeti (görsel — yalnızca "Video" modunda anlamlı) */}
              {activeItem?.type === "image" && postMode === "video" && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur flex items-center gap-1">
                  <Clock className="w-3 h-3 text-white" />
                  <span className="text-[10px] font-semibold text-white">{activeItem.duration}s</span>
                </div>
              )}

              {/* Filter badge */}
              {activeItem?.filter !== "none" && (
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur">
                  <span className="text-[10px] font-semibold text-white flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />{t(activeFilter.labelKey)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Thumbnail strip + add button ── */}
          {mediaItems.length > 0 && (
            <div className="flex items-center gap-2 px-4 mt-3 overflow-x-auto pb-1 scrollbar-none">
              {mediaItems.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                    i === activeIdx ? "border-primary scale-105 shadow-lg" : "border-transparent opacity-70"
                  }`}
                >
                  {m.type === "video"
                    ? <video src={m.url} className="w-full h-full object-cover" style={{ filter: FILTERS.find(f=>f.id===m.filter)?.css }} muted playsInline />
                    : <img src={m.url} alt="" className="w-full h-full object-cover" style={{ filter: FILTERS.find(f=>f.id===m.filter)?.css }} />
                  }
                  {m.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
                        <Film className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}
                  {m.type === "image" && postMode === "video" && (
                    <div className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/60 text-[8px] text-white font-semibold">
                      {m.duration}s
                    </div>
                  )}
                </button>
              ))}
              {mediaItems.length < 10 && (
                <label className="flex-shrink-0 w-14 h-14 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/40">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                  <input type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" />
                </label>
              )}
            </div>
          )}

          {/* ── Görsel Süre Ayarı — yalnızca "Video" modunda ── */}
          {activeItem?.type === "image" && postMode === "video" && (
            <div className="mt-4 px-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Fotoğraf Süresi
                  </span>
                </div>
                <span className="text-xs font-mono text-primary">
                  {activeItem.duration}s
                </span>
              </div>
              <input
                type="range"
                min={MIN_IMAGE_DURATION}
                max={MAX_IMAGE_DURATION}
                step={1}
                value={activeItem.duration}
                onChange={(e) => setImageDuration(activeIdx, Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{MIN_IMAGE_DURATION}s</span>
                <span>{MAX_IMAGE_DURATION}s</span>
              </div>
            </div>
          )}

          {/* ── Mod bilgi çubuğu: Gönderi modundaysa değiştirme imkanı ── */}
          {mediaItems.length > 0 && allImages && postMode === "post" && (
            <div className="flex items-center justify-between mx-4 mt-4 px-3.5 py-2.5 rounded-xl bg-muted/50">
              <span className="text-xs text-muted-foreground">{t("cpClassicPost")}</span>
              <button
                onClick={() => setPostMode("video")}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Video yap
              </button>
            </div>
          )}

          {/* ── Filters ── */}
          {mediaItems.length > 0 && (
            <div className="mt-4 px-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Crop className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("cpFilters")}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5"
                  >
                    <div className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                      activeItem?.filter === f.id ? "border-primary shadow-md scale-105" : "border-transparent"
                    }`}>
                      {activeItem ? (
                        activeItem.type === "video"
                          ? <video src={activeItem.url} className="w-full h-full object-cover" style={{ filter: f.css }} muted playsInline />
                          : <img src={activeItem.url} alt="" className="w-full h-full object-cover" style={{ filter: f.css }} />
                      ) : (
                        <div className="w-full h-full bg-muted rounded-xl" style={{ filter: f.css }} />
                      )}
                    </div>
                    <span className={`text-[10px] font-medium ${activeItem?.filter === f.id ? "text-primary" : "text-muted-foreground"}`}>
                      {t(f.labelKey)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Poll toggle (no media) ── */}
          <div className="px-4 mt-4">
            <button
              onClick={() => { setIsPoll(!isPoll); if (!isPoll) setMediaItems([]); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isPoll ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {isPoll ? t("cpRemovePoll") : t("cpCreatePoll")}
            </button>
          </div>

          {/* ── Anket UI ── */}
          {isPoll && (
            <div className="mx-4 mt-3 rounded-2xl border border-border p-4 bg-secondary/30 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold text-foreground">{t("cpCreatePoll")}</span>
              </div>
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder={t("cpPollQuestionPlaceholder")}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }}
                    placeholder={`Seçenek ${i + 1}`}
                    className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none"
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => removePollOption(i)} className="text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button onClick={addPollOption} className="text-primary text-sm font-medium">+ {t("cpAddOption")}</button>
              )}
            </div>
          )}

          {/* ── Metin (Caption) ── */}
          {!isPoll && mediaItems.length === 0 && (
            <div className="mx-4 mt-4">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t("cpCaptionPlaceholder")}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all text-sm"
              />
              <div className="mt-2"><OmniRewriteBar value={caption} onChange={setCaption} /></div>
            </div>
          )}

        </main>

        {/* Bottom CTA */}
        {canProceed && (
          <div className="fixed bottom-20 left-0 right-0 flex justify-center px-4 z-30">
            <button
              onClick={() => setStep("share")}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/30 active:scale-95 transition-all"
            >
              Paylaşım Ekranına Geç
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <BottomNav />
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // RENDER — SHARE STEP
  // ══════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background pb-20">

      {/* ── Başarı Toast ── */}
      {createdPostId && (
        <div className="fixed bottom-24 left-4 right-4 z-[100] animate-slide-in-up">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">✅</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">{t("cpPostShared")}</p>
              <p className="text-xs text-muted-foreground">{t("cpRedirecting")}</p>
            </div>
            <button
              onClick={() => navigate(createdPostId !== "done" ? `/post/${createdPostId}` : "/feed")}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-95 transition-transform"
            >
              Görüntüle
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
          <button
            onClick={() => setStep("edit")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">{t("cpEdit")}</span>
          </button>
          <h1 className="text-base font-bold text-foreground">{t("cpShare")}</h1>
          <button
            onClick={handleShare}
            disabled={loading || (mediaItems.length === 0 && !caption.trim() && !isPoll)}
            className="text-sm font-semibold text-primary disabled:text-muted-foreground transition-colors flex items-center gap-1.5"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Paylaş
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {error && <p className="text-destructive text-sm text-center bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}

        {/* 🔴 Canlı Yayın Başlat */}
        <button
          onClick={() => {
            const streamId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
            navigate(`/live/${streamId}`);
          }}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-red-500/40 bg-red-500/5 hover:bg-red-500/10 active:scale-[0.97] transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-md shadow-red-500/30 flex-shrink-0">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-bold text-foreground">{t("cpLiveStreamStart")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t("cpLiveStreamDesc")}</p>
          </div>
          <span className="flex-shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-red-500 text-white shadow-sm shadow-red-500/40 animate-pulse">
            🔴 CANLI
          </span>
        </button>

        {/* Progress cards */}
        {(loading || ffmpegProgress !== null) && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            {ffmpegProgress !== null && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-primary" /> {ffmpegStage}
                  </span>
                  <span className="text-xs font-mono text-primary">%{ffmpegProgress}</span>
                </div>
                <Progress value={ffmpegProgress} className="h-2" />
              </div>
            )}
            {loading && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-foreground">{t("cpUploading")}</span>
                    <span className="text-xs font-mono text-primary">%{uploadPct}</span>
                  </div>
                  <Progress value={uploadPct} className="h-2" />
                </div>
                {hlsPct !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-foreground">{t("cpVideoProcessingHls")}</span>
                      <span className="text-xs font-mono text-primary">%{hlsPct}</span>
                    </div>
                    <Progress value={hlsPct} className="h-2" />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Instagram tarzı gönderi ön izlemesi */}
        {mediaItems.length > 0 && (
          <div className="space-y-2">
            <PostPreviewCard
              media={mediaItems.map((m) => ({
                url: m.url,
                type: m.type,
                css: FILTERS.find((f) => f.id === m.filter)?.css,
                muted: m.muted,
              }))}
              caption={caption}
              location={locationName}
            />
            <button
              onClick={() => setStep("edit")}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/60 active:scale-[0.98] transition"
            >
              <Crop className="w-3.5 h-3.5" />
              {t("cpEdit")}
            </button>
          </div>
        )}

        {/* Poll */}
        {isPoll && (
          <div className="rounded-2xl border border-border p-4 bg-secondary/30 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-foreground">{t("cpPoll")}</span>
            </div>
            <input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder={t("cpPollQuestionPlaceholder")} className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={opt} onChange={(e) => { const n=[...pollOptions]; n[i]=e.target.value; setPollOptions(n); }} placeholder={`Seçenek ${i+1}`} className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none" />
                {pollOptions.length > 2 && <button onClick={() => removePollOption(i)} className="text-destructive"><X className="w-4 h-4" /></button>}
              </div>
            ))}
            {pollOptions.length < 4 && <button onClick={addPollOption} className="text-primary text-sm font-medium">+ {t("cpAddOption")}</button>}
          </div>
        )}

        {/* Caption */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={t("cpCaptionPlaceholderShort")}
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all text-sm"
        />
        <OmniRewriteBar value={caption} onChange={setCaption} />

        {/* Location */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted border border-border focus-within:ring-2 focus-within:ring-primary/50">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={t("cpLocationAddPlaceholder")}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
            {locationName && <button onClick={() => setLocationName("")} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <button
            onClick={detectLocation}
            disabled={locLoading}
            className="px-3 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50"
          >
            {locLoading ? <Loader className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {t("cpDetectLocation")}
          </button>
        </div>

        {locCoords && (
          <div className="rounded-2xl overflow-hidden border border-border">
            <iframe
              title={t("cpLocationPreview")} width="100%" height="160" style={{ border: 0 }} loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${locCoords.lon-0.01},${locCoords.lat-0.005},${locCoords.lon+0.01},${locCoords.lat+0.005}&layer=mapnik&marker=${locCoords.lat},${locCoords.lon}`}
            />
          </div>
        )}

        {/* ── 🏷️ Kişi Etiketle ── */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <button
            onClick={() => setTagPanelOpen(!tagPanelOpen)}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${taggedUsers.length > 0 ? "bg-primary/20" : "bg-muted"}`}>
                <Tag className={`w-4 h-4 ${taggedUsers.length > 0 ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {taggedUsers.length > 0 ? t("cpPeopleTagged", { count: taggedUsers.length }) : t("cpTagPeople")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {taggedUsers.length > 0 ? t("cpTagVisibleNote") : t("cpTagSomeone")}
                </p>
              </div>
            </div>
            <ChevronLeft className={`w-4 h-4 text-muted-foreground transition-transform ${tagPanelOpen ? "-rotate-90" : "rotate-180"}`} />
          </button>

          {tagPanelOpen && (
            <div className="border-t border-border">
              {/* Arama kutusu */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  autoFocus
                  value={tagSearch}
                  onChange={(e) => { setTagSearch(e.target.value); searchUsers(e.target.value); }}
                  placeholder={t("cpUserSearchPlaceholder")}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
                {tagSearching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>

              {/* Arama sonuçları */}
              {tagResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
                  {tagResults.filter(u => !taggedUsers.find(tu => tu.id === u.id)).map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => addTaggedUser(u)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      <img
                        src={u.profilePic ? `https://sehitumitkestitarimmtal.com${u.profilePic.startsWith("/") ? "" : "/"}${u.profilePic}` : "https://sehitumitkestitarimmtal.com/varsayılan.jpeg"}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg"; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{u.name || u.username}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                      <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Etiketlenen kişiler */}
              {taggedUsers.length > 0 && (
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {taggedUsers.map(u => (
                    <span key={u.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs font-semibold text-primary">
                      @{u.username}
                      <button onClick={() => removeTaggedUser(u.id)} className="hover:text-destructive transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {tagSearch && tagResults.length === 0 && !tagSearching && (
                <p className="text-center text-xs text-muted-foreground py-4">{t("cpUserNotFound")}</p>
              )}
            </div>
          )}
        </div>

        {/* ── 💬 Yorumları Kapat ── */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="w-full flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${!allowComments ? "bg-destructive/15" : "bg-muted"}`}>
                {allowComments
                  ? <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  : <MessageCircleOff className="w-4 h-4 text-destructive" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground leading-tight">{t("cpAllowComments")}</p>
                <p className="text-[10px] text-muted-foreground">
                  {allowComments ? t("cpCommentsEveryone") : t("cpCommentsOff")}
                </p>
              </div>
            </div>
            <Switch checked={allowComments} onCheckedChange={setAllowComments} />
          </div>
        </div>

        {/* ── Music Panel ── video VEYA sadece görsel varsa görünür ── */}
        {showMusicPanel && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Panel header */}
            <button
              onClick={() => setMusicPanelOpen(!musicPanelOpen)}
              className="w-full flex items-center justify-between px-4 py-3.5"
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${selectedTrack ? "bg-primary/20" : "bg-muted"}`}>
                  <Music className={`w-4 h-4 ${selectedTrack ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {selectedTrack ? selectedTrack.name : t("cpAddMusic")}
                  </p>
                  {selectedTrack && (
                    <p className="text-[10px] text-primary font-medium">
                      Seçildi ✓ {allImages && totalImageDuration > 0 && `· ${totalImageDuration}s segment`}
                    </p>
                  )}
                  {!selectedTrack && (
                    <p className="text-[10px] text-muted-foreground">
                      {allImages ? t("cpAddMusicToPhoto") : t("cpAddMusicToVideo")}
                    </p>
                  )}
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${musicPanelOpen ? "bg-primary/10 rotate-180" : ""}`}>
                <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-[-90deg]" />
              </div>
            </button>

            {musicPanelOpen && (
              <div className="border-t border-border">
                {/* Search */}
                <div className="px-4 py-2.5 border-b border-border/50">
                  <input
                    value={musicSearch}
                    onChange={(e) => setMusicSearch(e.target.value)}
                    placeholder={t("cpMusicSearchPlaceholder")}
                    className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto">
                  {tracksLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : filteredTracks.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-8">
                      {musicSearch ? t("cpNoResults") : t("cpNoMusicFound")}
                    </p>
                  ) : (
                    <>
                      {selectedTrack && (
                        <button
                          onClick={() => { setSelectedTrack(null); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50"
                        >
                          <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                            <X className="w-4 h-4 text-destructive" />
                          </div>
                          <span className="text-sm text-destructive font-medium">{t("cpRemoveMusic")}</span>
                        </button>
                      )}
                      {filteredTracks.map((track) => (
                        <div
                          key={track.id}
                          onClick={() => { setSelectedTrack(track); }}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedTrack?.id === track.id ? "bg-primary/5" : ""
                          }`}
                        >
                          {/* Play/Pause */}
                          <button
                            onClick={(e) => togglePreview(track, e)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                              previewTrack?.id === track.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-primary/10 hover:bg-primary/20"
                            }`}
                          >
                            {previewTrack?.id === track.id
                              ? <Pause className="w-3.5 h-3.5" />
                              : <Play className="w-3.5 h-3.5 text-primary" />
                            }
                          </button>

                          {/* Waveform visual (decorative) */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {[3,5,4,6,3,5,4,3,5,6,4,3].map((h, ii) => (
                              <div
                                key={ii}
                                className={`w-0.5 rounded-full transition-all ${
                                  previewTrack?.id === track.id ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                                }`}
                                style={{ height: `${h * (previewTrack?.id === track.id ? 2 : 1.2)}px` }}
                              />
                            ))}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{track.name}</p>
                          </div>
                          {selectedTrack?.id === track.id && (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── 🎬 Music Trim (Instagram tarzı segment seçici) ── */}
            {selectedTrack && (allImages || hasVideo) && (
              <div className="border-t border-border px-4 py-4 space-y-3 bg-gradient-to-b from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                      {t("cpMusicClip")}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {allImages
                      ? t("cpSecondsWillBeUsed", { count: totalImageDuration })
                      : t("cpMatchesVideo")}
                  </span>
                </div>

                {musicDuration === null ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Waveform-like trim visualization */}
                    <div className="relative h-12 rounded-xl bg-muted/60 overflow-hidden">
                      {/* fake waveform */}
                      <div className="absolute inset-0 flex items-center justify-around px-1">
                        {Array.from({ length: 60 }).map((_, i) => {
                          const h = 20 + Math.abs(Math.sin(i * 0.7)) * 70;
                          return (
                            <div
                              key={i}
                              className="w-0.5 rounded-full bg-muted-foreground/40"
                              style={{ height: `${h}%` }}
                            />
                          );
                        })}
                      </div>
                      {/* highlighted segment */}
                      <div
                        className="absolute top-0 bottom-0 bg-primary/25 border-x-2 border-primary"
                        style={{
                          left: `${(musicStart / musicDuration) * 100}%`,
                          width: `${(Math.max(neededMusicSpan, 1) / musicDuration) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Range slider */}
                    {allImages && (
                      <>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0, Math.floor(maxMusicStart))}
                          step={0.1}
                          value={Math.min(musicStart, maxMusicStart)}
                          onChange={(e) => setMusicStart(Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <span>0:00</span>
                          <span className="text-primary font-bold">
                            {formatTime(musicStart)} → {formatTime(musicStart + Math.max(neededMusicSpan, 1))}
                          </span>
                          <span>{formatTime(musicDuration)}</span>
                        </div>

                        {/* Preview button */}
                        <button
                          onClick={toggleTrimPreview}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                        >
                          {trimPlaying
                            ? <><Pause className="w-3.5 h-3.5" /> {t("cpStopPreview")}</>
                            : <><Play className="w-3.5 h-3.5" /> {t("cpPlaySelection")}</>
                          }
                        </button>
                      </>
                    )}

                    {hasVideo && (
                      <p className="text-[10px] text-muted-foreground text-center">
                        Video süresi kadar müzik otomatik kullanılır.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

      </main>

      <BottomNav />
    </div>
  );
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default CreatePostPage;


