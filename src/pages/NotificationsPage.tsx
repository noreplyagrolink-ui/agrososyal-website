import { useEffect, useState } from "react";
import { Loader2, Heart, MessageCircle, UserPlus, AtSign, Check, X, Trash2, Tag, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import {
  getNotifications, markNotificationsRead, getFollowRequests,
  acceptFollowRequest, rejectFollowRequest,
  deleteNotification, deleteAllNotifications, getToken,
} from "@/lib/api";
import { absoluteUrl } from "@/lib/media";
import { useLanguage } from "@/contexts/LanguageContext";

const API_BASE = "https://sehitumitkestitarimmtal.com/api";

const iconMap: Record<string, { icon: any; bg: string }> = {
  like:    { icon: Heart,          bg: "bg-rose-500" },
  comment: { icon: MessageCircle,  bg: "bg-blue-500" },
  follow:  { icon: UserPlus,       bg: "bg-emerald-500" },
  mention: { icon: AtSign,         bg: "bg-purple-500" },
  follow_request: { icon: UserPlus, bg: "bg-amber-500" },
  tag_request:  { icon: Tag,       bg: "bg-violet-500" },
  tag_rejected: { icon: Tag,       bg: "bg-slate-500" },
  // 🔔 Post izlenme kilometre taşı bildirimi (100/500/1000... görüntülenme)
  post_view_milestone: { icon: Eye, bg: "bg-orange-500" },
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [followRequests, setFollowRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [notifData, reqData] = await Promise.all([
        getNotifications(),
        getFollowRequests().catch(() => ({ requests: [] })),
      ]);
      setNotifications(notifData.notifications || []);
      setFollowRequests(reqData.requests || reqData.followRequests || reqData.users || []);
      // 🔧 DÜZELTMESİ — "bildirimler sayfasını açınca otomatik okundu olsun,
      // butona tıklamak zorunda kalmayalım" isteği: sayfa her açıldığında,
      // okunmamış bildirim varsa otomatik olarak okundu işaretlenir. UI'da
      // "hepsini okundu işaretle" butonu da duruyor (zararsız — unreadCount
      // zaten otomatik sıfırlandığı için normalde görünmeyecek).
      const hasUnread = (notifData.notifications || []).some((n: any) => !n.read);
      if (hasUnread) {
        markNotificationsRead().catch(() => {});
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {}
    setLoading(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const handleDeleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try { await deleteNotification(id); } catch {}
  };

  const handleDeleteAll = async () => {
    if (!confirm(t("notifDeleteAll"))) return;
    setNotifications([]);
    try { await deleteAllNotifications(); } catch {}
  };

  const handleFollowRequest = async (notif: any, action: "accept" | "reject") => {
    // Önce optimistik olarak listeden kaldır (yenileme sonrası geri gelmemesi için)
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    try {
      const token = getToken();
      // Bildirimi işle
      await fetch(`${API_BASE}/notifications/${notif.id}/follow-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action }),
      });
      // Aynı zamanda standalone takip istekleri listesinden de temizle
      const requesterId = notif.data?.requesterId || notif.data?.followerId || notif.senderId;
      if (requesterId) {
        setFollowRequests((prev) =>
          prev.filter((r) => (r.id || r.requesterId || r.userId) !== requesterId)
        );
        // Eğer kabul edildiyse ayrıca acceptFollowRequest'i de çağır (server senkronizasyonu için)
        if (action === "accept") {
          try { await acceptFollowRequest(requesterId); } catch {}
        } else {
          try { await rejectFollowRequest(requesterId); } catch {}
        }
      }
    } catch {
      // Hata olursa listeyi yenile
      loadAll();
    }
  };

  const handleStandaloneRequest = async (req: any, action: "accept" | "reject") => {
    const requesterId = req.id || req.requesterId || req.userId;
    if (!requesterId) return;
    setFollowRequests((prev) => prev.filter((r) => (r.id || r.requesterId || r.userId) !== requesterId));
    try {
      if (action === "accept") await acceptFollowRequest(requesterId);
      else await rejectFollowRequest(requesterId);
    } catch {}
  };

  const handleTagRequest = async (notif: any, action: "approve" | "reject") => {
    setNotifications((prev) =>
      prev.map((n) => n.id === notif.id ? { ...n, tagHandled: action } : n)
    );
    try {
      const token = getToken();
      const postId = notif.data?.postId;
      const requestId = notif.id; // bildirim id'si ile eşleşiyor — backend post_tag_requests.id bekliyor
      // post_tag_requests tablosundaki id'yi bulmak için pending listesini çek
      const res = await fetch(`${API_BASE}/tag-requests/pending`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const match = (data.requests || []).find((r: any) => r.postId === postId);
      if (match) {
        await fetch(`${API_BASE}/posts/${postId}/tag-requests/${match.id}/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ action }),
        });
      }
    } catch { loadAll(); }
  };

  const handleNotificationClick = (notif: any) => {
    // 🔧 DÜZELTMESİ — "tıklayınca posta gitsin" isteği:
    // postId her zaman notif.data içinde geliyordu (üst seviyede hiç yoktu),
    // bu yüzden tıklama hiçbir zaman postu açmıyordu. Artık FeedPage'in
    // zaten desteklediği /feed?post=<id> deep-link'i kullanılıyor — bu,
    // Instagram'daki gibi postu tam ekran bir modalda (yorum + beğenenlerle
    // birlikte) açıyor.
    const postId = notif.data?.postId || notif.postId;
    const actorId = notif.data?.userId || notif.data?.followerId || notif.data?.requesterId;
    if (postId) navigate(`/feed?post=${postId}`);
    else if (actorId) navigate(`/user/${actorId}`);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-bold text-foreground">Bildirimler</h1>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-primary font-bold">
                {t("notifMarkAllRead")}
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={handleDeleteAll} className="text-xs text-destructive font-bold flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Tümünü Sil
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {followRequests.length > 0 && (
              <section className="border-b border-border">
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-amber-500" /> Takip İstekleri
                    <span className="text-xs text-muted-foreground font-normal">({followRequests.length})</span>
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {followRequests.map((req: any) => {
                    const rid = req.id || req.requesterId || req.userId;
                    const username = req.username || req.requesterUsername;
                    const name = req.name || req.requesterName || username;
                    const pic = req.profilePic || req.requesterPic;
                    const avatar = pic ? absoluteUrl(pic) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
                    return (
                      <div key={rid} className="flex items-center gap-3 px-4 py-3">
                        <img
                          src={avatar} alt=""
                          className="w-11 h-11 rounded-full object-cover cursor-pointer"
                          onClick={() => navigate(`/user/${rid}`)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{name}</p>
                          <p className="text-xs text-muted-foreground truncate">@{username} sizi takip etmek istiyor</p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleStandaloneRequest(req, "accept")}
                            className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1 active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5" /> Onayla
                          </button>
                          <button
                            onClick={() => handleStandaloneRequest(req, "reject")}
                            className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold flex items-center gap-1 active:scale-95"
                          >
                            <X className="w-3.5 h-3.5" /> Reddet
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            {notifications.length === 0 && followRequests.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <span className="text-3xl">🔔</span>
            </div>
            <p className="text-muted-foreground text-sm">Henüz bildirim yok</p>
          </div>
            ) : null}
            {notifications.length > 0 && (
              <div className="divide-y divide-border">
                {notifications.map((notif) => {
                  const meta = iconMap[notif.type] || { icon: Heart, bg: "bg-primary" };
                  const IconComp = meta.icon;
                  // 🔧 DÜZELTMESİ — "beğenince profil resmi yüklenmiyor" sorunu:
                  // Backend actor bilgisini (actorName/actorUsername/actorProfilePic)
                  // notif.data içine koyuyor; eskiden var olmayan notif.fromProfilePic
                  // gibi üst seviye alanlara bakılıyordu, bu yüzden hep varsayılan
                  // görsele düşüyordu. Ayrıca profilePic göreceli bir yol olabileceği
                  // için absoluteUrl() ile tam URL'e çevriliyor.
                  const actorId = notif.data?.userId || notif.data?.followerId || notif.data?.requesterId;
                  const actorName = notif.data?.actorName || notif.data?.actorUsername || notif.fromName || notif.fromUsername || "Kullanıcı";
                  const rawAvatar = notif.data?.actorProfilePic || notif.data?.followerPic || notif.data?.requesterPic || notif.fromProfilePic;
                  const avatar = rawAvatar ? absoluteUrl(rawAvatar) : "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";

                  return (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 px-4 py-4 transition-colors ${!notif.read ? "bg-primary/5" : ""}`}
                      onClick={() => notif.type !== "follow_request" && handleNotificationClick(notif)}
                      style={{ cursor: notif.type !== "follow_request" ? "pointer" : "default" }}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={avatar} alt=""
                          className="w-11 h-11 rounded-full object-cover cursor-pointer bg-muted"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            const fallback = "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";
                            if (img.src !== fallback) img.src = fallback; // sonsuz onError döngüsünü önle
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (actorId) navigate(`/user/${actorId}`);
                          }}
                        />
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${meta.bg} flex items-center justify-center border-2 border-background`}>
                          <IconComp className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{actorName}</span>{" "}
                          <span className="text-muted-foreground">{notif.message || getNotifText(notif.type, lang)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatTimeAgo(notif.createdAt, lang)}</p>
                        {notif.type === "follow_request" && !notif.followRequestHandled && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleFollowRequest(notif, "accept"); }}
                              className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                            >
                              <Check className="w-3.5 h-3.5" /> Onayla
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleFollowRequest(notif, "reject"); }}
                              className="flex-1 py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                            >
                              <X className="w-3.5 h-3.5" /> Reddet
                            </button>
                          </div>
                        )}
                        {notif.followRequestHandled && (
                          <p className={`text-xs mt-2 font-bold ${notif.followRequestHandled === "accept" ? "text-primary" : "text-muted-foreground"}`}>
                            {notif.followRequestHandled === "accept" ? t("notifAccepted") : t("notifRejected")}
                          </p>
                        )}

                        {/* 🏷️ Etiket isteği butonları */}
                        {notif.type === "tag_request" && !notif.tagHandled && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleTagRequest(notif, "approve"); }}
                              className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                            >
                              <Check className="w-3.5 h-3.5" /> Profilimde Görünsün
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleTagRequest(notif, "reject"); }}
                              className="flex-1 py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                            >
                              <X className="w-3.5 h-3.5" /> Reddet
                            </button>
                          </div>
                        )}
                        {notif.type === "tag_request" && notif.tagHandled && (
                          <p className={`text-xs mt-2 font-bold ${notif.tagHandled === "approve" ? "text-primary" : "text-muted-foreground"}`}>
                            {notif.tagHandled === "approve" ? t("notifShowInProfile") : t("notifRejected")}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        {!notif.read && <div className="w-2 h-2 bg-primary rounded-full mt-2" />}
                        <button
                          onClick={(e) => handleDeleteOne(notif.id, e)}
                          aria-label="Sil"
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

function getNotifText(type: string, lang: string): string {
  const tr: Record<string, string> = {
    like: "gönderini beğendi",
    comment: "gönderine yorum yaptı",
    follow: "seni takip etmeye başladı",
    follow_request: "seni takip etmek istiyor",
    mention: "senden bahsetti",
    tag_request: "seni bir gönderisinde etiketledi. Profilinde görünsün mü?",
    tag_rejected: "etiket isteğini reddetti",
  };
  const en: Record<string, string> = {
    like: "liked your post",
    comment: "commented on your post",
    follow: "started following you",
    follow_request: "wants to follow you",
    mention: "mentioned you",
    tag_request: "tagged you in a post. Show on your profile?",
    tag_rejected: "rejected your tag request",
  };
  const map = lang === "en" ? en : tr;
  return map[type] ?? (lang === "en" ? "performed an activity" : "bir etkinlik gerçekleşti");
}

function formatTimeAgo(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return lang === "en" ? "just now" : "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)}${lang === "en" ? "m" : "dk"}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${lang === "en" ? "h" : "sa"}`;
  return `${Math.floor(diff / 86400)}${lang === "en" ? "d" : "g"}`;
}

export default NotificationsPage;



