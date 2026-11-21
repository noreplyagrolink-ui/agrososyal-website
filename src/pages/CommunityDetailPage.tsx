import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users, Loader2, Lock, Globe, Trash2, UserPlus, UserMinus, Pencil, Camera, ImagePlus, X, PenSquare } from "lucide-react";
import {
  getCommunity, getCommunityPosts, getCommunityMembers,
  joinCommunity, deleteCommunity, updateCommunity, getStoredUser, getToken,
} from "@/lib/api";
import { absoluteUrl, createSafePreviewUrl } from "@/lib/media";
import PostCard from "@/components/PostCard";
import BottomNav from "@/components/BottomNav";

type Tab = "posts" | "members";

export default function CommunityDetailPage() {
  const { slugOrId = "" } = useParams();
  const navigate = useNavigate();
  const me = getStoredUser();

  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [joining, setJoining] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrivate, setEditPrivate] = useState(false);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string>("");
  const [editBannerPreview, setEditBannerPreview] = useState<string>("");
  const [editError, setEditError] = useState("");

  const openEdit = () => {
    setEditName(community?.name || "");
    setEditDesc(community?.description || "");
    setEditPrivate(!!community?.isPrivate);
    setEditAvatarFile(null);
    setEditBannerFile(null);
    setEditAvatarPreview(community?.icon ? absoluteUrl(community.icon) : "");
    setEditBannerPreview(community?.coverImage ? absoluteUrl(community.coverImage) : "");
    setEditError("");
    setShowEdit(true);
  };
  const pickEditAvatar = async (f: File | null) => {
    setEditAvatarFile(f);
    if (f) setEditAvatarPreview(await createSafePreviewUrl(f));
  };
  const pickEditBanner = async (f: File | null) => {
    setEditBannerFile(f);
    if (f) setEditBannerPreview(await createSafePreviewUrl(f));
  };
  const saveEdit = async () => {
    if (!community?.id) return;
    setEditError("");
    const name = editName.trim();
    if (!name) { setEditError("Topluluk adı gerekli"); return; }
    setSaving(true);
    try {
      const res = await updateCommunity(
        community.id,
        { name, description: editDesc.trim(), isPrivate: editPrivate },
        { avatar: editAvatarFile, banner: editBannerFile }
      );
      const updated = res?.community || res;
      if (updated && (updated.id || updated.name)) {
        setCommunity((c: any) => ({ ...c, ...updated }));
        setShowEdit(false);
      } else if (res?.error || res?.message) {
        setEditError(res.error || res.message);
      } else {
        // Re-fetch
        const c = await getCommunity(slugOrId);
        setCommunity(c.community || c);
        setShowEdit(false);
      }
    } catch (e: any) {
      setEditError(e?.message || "Güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  // Post oluşturma
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postMedia, setPostMedia] = useState<File | null>(null);
  const [postMediaPreview, setPostMediaPreview] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  const submitPost = async () => {
    if (!postContent.trim() && !postMedia) { setPostError("Gönderi içeriği boş olamaz"); return; }
    if (!community?.id) return;
    setPosting(true); setPostError("");
    try {
      const token = getToken();
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Adım: Postu oluştur
      const fd = new FormData();
      fd.append("content", postContent.trim());
      if (postMedia) fd.append("media", postMedia);
      const res = await fetch("https://sehitumitkestitarimmtal.com/api/posts", {
        method: "POST",
        headers: authHeader,
        body: fd,
      });
      const data = await res.json();
      if (data.error) { setPostError(data.error); return; }

      const createdPostId = data.post?.id;
      if (!createdPostId) { setPostError("Post oluşturulamadı, tekrar dene."); return; }

      // 2. Adım: Oluşturulan postu topluluğa bağla
      const comRes = await fetch(
        `https://sehitumitkestitarimmtal.com/api/communities/${community.id}/posts`,
        {
          method: "POST",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ postId: createdPostId }),
        }
      );
      const comData = await comRes.json();
      if (comData.error) { setPostError(comData.error); return; }

      setShowPostModal(false);
      setPostContent(""); setPostMedia(null); setPostMediaPreview("");
      // Topluluk post listesini yenile
      getCommunityPosts(community.id, 1)
        .then((d) => setPosts(d.posts || d.items || []))
        .catch(() => {});
    } catch { setPostError("Gönderi paylaşılamadı"); }
    finally { setPosting(false); }
  };

  const ownerId = community?.ownerId || community?.owner?.id || community?.createdBy;
  const isOwner = !!me && !!ownerId && String(me.id) === String(ownerId);
  const joined = !!community?.isMember || !!community?.joined;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const c = await getCommunity(slugOrId);
        setCommunity(c.community || c);
      } catch {}
      setLoading(false);
    })();
  }, [slugOrId]);

  useEffect(() => {
    if (!community?.id) return;
    if (tab === "posts") {
      getCommunityPosts(community.id, 1)
        .then((d) => setPosts(d.posts || d.items || []))
        .catch(() => setPosts([]));
    } else {
      getCommunityMembers(community.id, 1)
        .then((d) => setMembers(d.members || d.items || []))
        .catch(() => setMembers([]));
    }
  }, [community?.id, tab]);

  const onJoin = async () => {
    if (!community?.id) return;
    setJoining(true);
    try {
      await joinCommunity(community.id);
      setCommunity((c: any) => c && ({
        ...c,
        isMember: !c.isMember,
        memberCount: (c.memberCount ?? 0) + (c.isMember ? -1 : 1),
      }));
    } finally {
      setJoining(false);
    }
  };

  const onDelete = async () => {
    if (!community?.id) return;
    if (!confirm("Topluluğu silmek istediğine emin misin? Bu geri alınamaz.")) return;
    await deleteCommunity(community.id);
    navigate("/communities");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Users className="w-10 h-10 text-muted-foreground" />
        <p className="text-foreground font-semibold">Topluluk bulunamadı</p>
        <button onClick={() => navigate("/communities")} className="text-sm text-primary font-bold">Topluluklara dön</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Cover */}
      <div className="relative h-44 sm:h-56 w-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500">
        {community.coverImage && (
          <img src={absoluteUrl(community.coverImage)} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black/45 backdrop-blur text-white
                     flex items-center justify-center active:scale-90 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {isOwner && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={openEdit}
              className="h-10 px-3 rounded-full bg-black/45 backdrop-blur text-white text-xs font-bold
                         flex items-center gap-1.5 active:scale-95 transition"
              title="Topluluğu güncelle"
            >
              <Pencil className="w-4 h-4" />
              <span>Güncelle</span>
            </button>
            <button
              onClick={onDelete}
              className="w-10 h-10 rounded-full bg-black/45 backdrop-blur text-white
                         flex items-center justify-center active:scale-90 transition"
              title="Topluluğu sil"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Identity */}
      <div className="max-w-3xl mx-auto px-4 -mt-10 relative">
        <div className="flex items-end gap-4">
          <div className="w-20 h-20 rounded-3xl bg-card ring-4 ring-background overflow-hidden shadow-xl flex items-center justify-center">
            {community.icon ? (
              <img src={absoluteUrl(community.icon)} alt={community.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-2xl font-extrabold">
                {community.name?.[0]?.toUpperCase() || "#"}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-extrabold text-foreground truncate">{community.name}</h1>
              {community.isPrivate
                ? <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                : <Globe className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {community.memberCount ?? 0} üye
              {community.slug ? ` • #${community.slug}` : ""}
            </p>
          </div>

          {!isOwner && (
            <button
              onClick={onJoin}
              disabled={joining}
              className={`px-4 py-2 rounded-full text-sm font-bold transition
                ${joined
                  ? "bg-secondary text-foreground hover:bg-secondary/80"
                  : "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md hover:shadow-lg"}`}
            >
              <span className="inline-flex items-center gap-1.5">
                {joined ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {joined ? "Ayrıl" : "Katıl"}
              </span>
            </button>
          )}
        </div>

        {community.description && (
          <p className="mt-3 text-sm text-foreground/85">{community.description}</p>
        )}

        {/* Tabs */}
        <div className="mt-5 flex items-center gap-1 border-b border-border">
          {([
            { id: "posts", label: "Gönderiler" },
            { id: "members", label: "Üyeler" },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-2.5 text-sm font-semibold transition-colors
                ${tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-4 space-y-3">
          {tab === "posts" && (
            posts.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <p className="text-sm text-muted-foreground">Bu toplulukta henüz gönderi yok.</p>
                {(joined || isOwner) && (
                  <button onClick={() => setShowPostModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md">
                    <PenSquare className="w-4 h-4" /> İlk gönderiyi paylaş
                  </button>
                )}
              </div>
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            )
          )}

          {tab === "members" && (
            members.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">Üye yok.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {members.map((m: any) => {
                  const u = m.user || m;
                  const av = u.profilePic ? absoluteUrl(u.profilePic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
                  return (
                    <button
                      key={u.id}
                      onClick={() => navigate(`/user/${u.id}`)}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border hover:border-primary/40 transition"
                    >
                      <img src={av} alt="" className="w-10 h-10 rounded-full object-cover" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{u.name || u.username}</p>
                        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => { if (!saving) setShowEdit(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl"
          >
            <p className="text-lg font-extrabold text-foreground">Topluluğu güncelle</p>
            <p className="text-xs text-muted-foreground mt-1">Profil resmi, banner, ad ve açıklamayı düzenle.</p>

            <div className="mt-4 space-y-3">
              <div className="relative">
                <label className="block relative w-full aspect-[3/1] rounded-2xl overflow-hidden bg-secondary border border-border cursor-pointer group">
                  {editBannerPreview ? (
                    <img src={editBannerPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/30 to-pink-500/30 flex flex-col items-center justify-center text-muted-foreground">
                      <ImagePlus className="w-6 h-6 mb-1" />
                      <span className="text-[11px] font-semibold">Banner ekle (1500×500)</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => pickEditBanner(e.target.files?.[0] || null)}
                  />
                  {editBannerFile && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setEditBannerFile(null); setEditBannerPreview(community?.coverImage ? absoluteUrl(community.coverImage) : ""); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </label>

                <label className="absolute -bottom-6 left-4 w-20 h-20 rounded-full overflow-hidden ring-4 ring-card bg-secondary border border-border cursor-pointer group shadow-lg">
                  {editAvatarPreview ? (
                    <img src={editAvatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => pickEditAvatar(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground pl-1 pt-5">
                Avatar 300×300 (yuvarlak) • Banner 1500×500
              </p>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1 pl-1">Topluluk adı</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={50}
                  placeholder="Topluluk adı"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1 pl-1">Hakkımda / Açıklama</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  maxLength={240}
                  placeholder="Topluluk hakkında kısa açıklama"
                  rows={3}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={editPrivate} onChange={(e) => setEditPrivate(e.target.checked)} className="accent-violet-500" />
                Gizli topluluk (sadece davetli)
              </label>

              {editError && <p className="text-xs text-destructive">{editError}</p>}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                disabled={saving}
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 rounded-full text-sm font-semibold text-foreground bg-secondary hover:bg-secondary/80 transition"
              >
                Vazgeç
              </button>
              <button
                disabled={saving}
                onClick={saveEdit}
                className="px-5 py-2 rounded-full text-sm font-bold text-white
                           bg-gradient-to-br from-violet-500 to-fuchsia-500
                           shadow-md hover:shadow-lg disabled:opacity-50 transition"
              >
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post paylaş FAB */}
      {(joined || isOwner) && tab === "posts" && (
        <button
          onClick={() => setShowPostModal(true)}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-xl flex items-center justify-center active:scale-95 transition"
        >
          <PenSquare className="w-6 h-6" />
        </button>
      )}

      {/* Post oluşturma modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => { if (!posting) { setShowPostModal(false); setPostError(""); } }}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <p className="text-lg font-extrabold text-foreground">Toplulukta Paylaş</p>
            <p className="text-xs text-muted-foreground mt-0.5">#{community?.slug || community?.name}</p>

            <div className="mt-4 space-y-3">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                maxLength={1000}
                placeholder="Ne düşünüyorsun?"
                rows={4}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />

              {postMediaPreview && (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={postMediaPreview} alt="" className="w-full max-h-48 object-cover rounded-xl" />
                  <button onClick={() => { setPostMedia(null); setPostMediaPreview(""); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition">
                <ImagePlus className="w-5 h-5" />
                <span>Fotoğraf ekle</span>
                <input type="file" accept="image/*,video/*" className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0] || null;
                    setPostMedia(f);
                    setPostMediaPreview(f ? await createSafePreviewUrl(f) : "");
                  }} />
              </label>

              {postError && <p className="text-xs text-destructive">{postError}</p>}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button disabled={posting} onClick={() => { setShowPostModal(false); setPostError(""); }}
                className="px-4 py-2 rounded-full text-sm font-semibold text-foreground bg-secondary hover:bg-secondary/80 transition">
                Vazgeç
              </button>
              <button disabled={posting || (!postContent.trim() && !postMedia)} onClick={submitPost}
                className="px-5 py-2 rounded-full text-sm font-bold text-white bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md hover:shadow-lg disabled:opacity-50 transition">
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Paylaş"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!showPostModal && !showEdit && <BottomNav />}
    </div>
  );
}



