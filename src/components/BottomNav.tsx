import { useEffect, useState } from "react";
import { Home, Search, Users, MessageCircle, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { getStoredUser, getToken } from "@/lib/api";
import { absoluteUrl } from "@/lib/media";
import { useLanguage } from "@/contexts/LanguageContext";
import CreateChooserSheet from "@/components/CreateChooserSheet";

const spring = { type: "spring" as const, stiffness: 520, damping: 34, mass: 0.6 };
const snappy = { type: "spring" as const, stiffness: 600, damping: 28, mass: 0.4 };

type IconProps = { className?: string; strokeWidth?: number; active?: boolean };

/* ── Özel ikonlar (görseldeki çizgi stiline uygun) ── */
const HomeIcon = ({ className, strokeWidth = 2, active }: IconProps) => (
  <Home className={className} strokeWidth={strokeWidth} fill={active ? "currentColor" : "none"} />
);
const SearchIcon = ({ className, strokeWidth = 2 }: IconProps) => <Search className={className} strokeWidth={strokeWidth} />;
const CommunitiesIcon = ({ className, strokeWidth = 2 }: IconProps) => <Users className={className} strokeWidth={strokeWidth} />;
const ChatIcon = ({ className, strokeWidth = 2 }: IconProps) => <MessageCircle className={className} strokeWidth={strokeWidth} />;
const ReelsIcon = ({ className, strokeWidth = 2 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
       strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <path d="M3 8.5h18M8.5 3l3 5.5M14 3l3 5.5" />
    <path d="M10.2 12.3v5l4.2-2.5-4.2-2.5z" fill="currentColor" />
  </svg>
);
const ProfileIcon = ({ className, strokeWidth = 2 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
       strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="7.5" r="3.6" />
    <rect x="4.5" y="14.2" width="15" height="6.3" rx="3.15" />
  </svg>
);

type Tab = {
  icon: React.ComponentType<IconProps>;
  path: string;
  label: string;
};

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hidden = useScrollDirection();
  const me = getStoredUser();
  const myAvatar = me?.profilePic ? absoluteUrl(me.profilePic) : null;
  const createActive = location.pathname === "/create";
  const { t } = useLanguage();
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [chooserOpen, setChooserOpen] = useState(false);

  // Okunmamış mesaj rozeti (üst bardaki mesaj ikonu kaldırıldığı için burada)
  useEffect(() => {
    let stop = false;
    const fetchUnread = async () => {
      try {
        const tk = getToken() || "";
        if (!tk) return;
        const r = await fetch("https://sehitumitkestitarimmtal.com/api/messages/unread/count", {
          headers: { Authorization: `Bearer ${tk}` },
        });
        if (r.ok && !stop) {
          const d = await r.json();
          setUnreadMsgs(Number(d.unreadCount ?? 0));
        }
      } catch {}
    };
    fetchUnread();
    const iv = setInterval(fetchUnread, 30_000);
    return () => { stop = true; clearInterval(iv); };
  }, [location.pathname]);

  const tabs: Tab[] = [
    { icon: HomeIcon,  path: "/feed",        label: t("navHome") },
    { icon: SearchIcon, path: "/search",      label: t("navSearch") },
    { icon: ReelsIcon,                path: "/reels",       label: "Reels" },
    { icon: CommunitiesIcon, path: "/communities", label: t("navCommunities") },
    { icon: ChatIcon, path: "/chat",    label: t("navMessages") },
    { icon: ProfileIcon,              path: "/profile",     label: t("navProfile") },
  ];

  const isActive = (path: string) =>
    location.pathname === path || (path.length > 1 && location.pathname.startsWith(path + "/"));

  const renderBtn = ({ icon: Icon, path, label }: Tab) => {
    const active = isActive(path);
    const isProfile = path === "/profile";
    const isChat = path === "/chat";
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;

    const startPress = () => {
      if (!isProfile) return;
      longPressTimer = setTimeout(() => {
        if (window.confirm(t("navAddAccountConfirm"))) navigate("/login?add=1");
      }, 600);
    };
    const endPress = () => { if (longPressTimer) clearTimeout(longPressTimer); };

    return (
      <motion.button
        key={path}
        whileTap={{ scale: 0.85 }}
        transition={snappy}
        onClick={() => navigate(path)}
        onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={endPress}
        onTouchStart={startPress} onTouchEnd={endPress} onTouchCancel={endPress}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className="relative flex-1 min-w-0 h-full flex items-center justify-center"
      >
        {/* Aktif sekme: kayan yumuşak kapsül */}
        {active && (
          <motion.span
            layoutId="navActivePill"
            transition={spring}
            className="absolute inset-y-[3px] inset-x-[2px] rounded-full"
            style={{
              background: "hsl(var(--background) / 0.78)",
              border: "1px solid hsl(0 0% 100% / 0.55)",
              boxShadow: "0 2px 10px -2px hsl(var(--foreground) / 0.12), inset 0 1px 0 hsl(0 0% 100% / 0.6)",
            }}
          />
        )}

        <span className="relative z-10 flex items-center justify-center">
          {isProfile && myAvatar ? (
            <img
              src={myAvatar}
              alt={label}
              className={`w-[26px] h-[26px] rounded-full object-cover transition-all duration-200 ${
                active ? "ring-2 ring-foreground" : "ring-1 ring-foreground/25"
              }`}
            />
          ) : (
            <Icon
              active={active}
              strokeWidth={active ? 2.3 : 2}
              className={`w-[25px] h-[25px] transition-colors duration-200 ${
                active ? "text-foreground" : "text-foreground/85"
              }`}
            />
          )}
          {isChat && unreadMsgs > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-background shadow-sm">
              {unreadMsgs > 9 ? "9+" : unreadMsgs}
            </span>
          )}
        </span>
      </motion.button>
    );
  };

  return (
    <>
      <CreateChooserSheet open={chooserOpen} onClose={() => setChooserOpen(false)} />
      {/* ── Mobil alt bar — cam kapsül + yüzen "+" ── */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          hidden ? "translate-y-[160%]" : "translate-y-0"
        } md:hidden`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="relative max-w-[460px] mx-auto px-3 pointer-events-auto">
          {/* Yüzen oluştur butonu (barın sağ üstünde) */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.88 }}
            transition={snappy}
            onClick={() => setChooserOpen(true)}
            aria-label={t("navCreatePost")}
            className="absolute right-4 -top-[64px] w-[54px] h-[54px] rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(150deg, hsl(158 70% 52%) 0%, hsl(var(--primary)) 100%)",
              border: "2.5px solid hsl(0 0% 100% / 0.75)",
              boxShadow:
                "0 10px 26px -6px hsl(var(--primary) / 0.65), 0 0 18px hsl(158 70% 52% / 0.35), inset 0 1px 1px hsl(0 0% 100% / 0.45)",
            }}
          >
            <motion.div animate={{ rotate: createActive ? 135 : 0 }} transition={snappy}>
              <Plus strokeWidth={2.6} className="w-[28px] h-[28px] text-white" />
            </motion.div>
          </motion.button>

          {/* Cam bar */}
          <div
            className="relative flex items-stretch h-[62px] rounded-full px-1.5 liquid-glass"
          >
            {tabs.map((tab) => renderBtn(tab))}
          </div>
        </div>
      </nav>

      {/* ── Masaüstü yan ray ── */}
      <aside
        className="hidden md:flex fixed top-1/2 -translate-y-1/2 left-3 z-50 flex-col gap-1 p-1.5 rounded-[22px] border border-white/10"
        style={{
          background: "linear-gradient(160deg, hsl(var(--background)/0.92) 0%, hsl(var(--background)/0.76) 100%)",
          backdropFilter: "blur(24px) saturate(1.5)",
          WebkitBackdropFilter: "blur(24px) saturate(1.5)",
          boxShadow: "0 20px 60px -16px hsl(var(--foreground)/0.2), inset 0 1px 0 hsl(0 0% 100%/0.08)",
        }}
      >
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          const Icon = tab.icon;
          const isProfile = tab.path === "/profile";
          const isChat = tab.path === "/chat";

          return (
            <motion.button
              key={tab.path}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.88 }}
              transition={snappy}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              className={`relative w-11 h-11 rounded-[14px] flex items-center justify-center group transition-colors duration-200 ${
                active
                  ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]"
                  : "text-foreground/60 hover:bg-muted/80"
              }`}
            >
              {isProfile && myAvatar ? (
                <img
                  src={myAvatar}
                  alt=""
                  className={`w-6 h-6 rounded-full object-cover ${
                    active ? "ring-2 ring-primary-foreground/60 ring-offset-1 ring-offset-primary" : ""
                  }`}
                />
              ) : (
                <Icon active={active} strokeWidth={active ? 2.4 : 1.9} className="w-[20px] h-[20px]" />
              )}
              {isChat && unreadMsgs > 0 && (
                <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-background">
                  {unreadMsgs > 9 ? "9+" : unreadMsgs}
                </span>
              )}
              <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-xl bg-foreground/90 text-background text-[11px] font-semibold tracking-wide opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap backdrop-blur-sm shadow-lg">
                {tab.label}
              </span>
            </motion.button>
          );
        })}

        {/* Masaüstü oluştur butonu */}
        <motion.button
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.86, rotate: 45 }}
          transition={snappy}
          onClick={() => setChooserOpen(true)}
          aria-label={t("navCreatePost")}
          className="w-11 h-11 rounded-[14px] flex items-center justify-center text-white mt-1"
          style={{
            background: "linear-gradient(145deg, hsl(158 70% 52%) 0%, hsl(var(--primary)) 100%)",
            boxShadow: "0 6px 20px -6px hsl(var(--primary)/0.65)",
          }}
        >
          <Plus strokeWidth={2.8} className="w-[18px] h-[18px]" />
        </motion.button>
      </aside>
    </>
  );
};

export default BottomNav;
