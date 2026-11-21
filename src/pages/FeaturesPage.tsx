import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import {
  Sprout, BookOpen, Bot, ShoppingBag, Cloud, TrendingUp,
  Calculator, AlertTriangle, Bug, Camera, Users, MessageCircle,
  Bell, Search, User, Settings, Droplets, FlaskConical, Leaf,
  BarChart3, Map, Zap, Video,
} from "lucide-react";
import { useState } from "react";

type Feature = {
  icon: React.ElementType;
  label: string;
  desc: string;
  path: string;
  gradient: string;
  tag?: string;
};

const FEATURES: Feature[] = [
  {
    icon: Video,
    label: "Canlı Yayın",
    desc: "Tarlanı canlı yayınla, beğeni ve emoji al",
    path: "/live",
    gradient: "from-red-500 to-rose-700",
    tag: "🔴 Canlı",
  },
  {
    icon: Sprout,
    label: "Tarla Takip",
    desc: "Tarlalarını gün gün izle, fotoğraf & not ekle",
    path: "/tarla-takip",
    gradient: "from-emerald-500 to-green-700",
    tag: "🌱 Popüler",
  },
  {
    icon: BookOpen,
    label: "Farmbook",
    desc: "Ekim, hasat, gider & gelir kayıtları",
    path: "/farmbook",
    gradient: "from-cyan-500 to-blue-700",
  },
  {
    icon: Bot,
    label: "Agro AI",
    desc: "Yapay zeka ile tarım danışmanlığı",
    path: "/ai",
    gradient: "from-violet-500 to-purple-700",
    tag: "✨ Yeni",
  },
  {
    icon: ShoppingBag,
    label: "Pazar",
    desc: "Ürün al ve sat, yerel çiftçilere ulaş",
    path: "/store",
    gradient: "from-pink-500 to-rose-700",
  },
  {
    icon: Cloud,
    label: "Hava Durumu",
    desc: "Anlık ve 7 günlük tarım hava tahmini",
    path: "/weather",
    gradient: "from-sky-400 to-blue-600",
  },
  {
    icon: TrendingUp,
    label: "Tarım Fiyatları",
    desc: "Güncel borsa & hal fiyatları",
    path: "/fiyatlar",
    gradient: "from-amber-500 to-orange-700",
    tag: "📈 Canlı",
  },
  {
    icon: Calculator,
    label: "Hesaplayıcı",
    desc: "Arazi değeri, ürün karlılığı hesapla",
    path: "/calculator",
    gradient: "from-teal-500 to-emerald-700",
  },
  {
    icon: AlertTriangle,
    label: "Acil Yardım",
    desc: "Yakındaki çiftçilerden yardım iste",
    path: "/acil-yardim",
    gradient: "from-red-500 to-rose-700",
    tag: "🆘 Acil",
  },
  {
    icon: Bug,
    label: "Hastalık Alarmı",
    desc: "Bölgendeki bitki hastalıklarını bildir",
    path: "/disease-alarm",
    gradient: "from-orange-500 to-red-600",
  },
  {
    icon: Camera,
    label: "Şip Şak Agro",
    desc: "Tarlandan anlık fotoğraf paylaş",
    path: "/sip-sak-agro",
    gradient: "from-green-400 to-teal-600",
  },
  {
    icon: Users,
    label: "Topluluklar",
    desc: "Ürün bazlı gruplara katıl",
    path: "/communities",
    gradient: "from-fuchsia-500 to-violet-700",
  },
  {
    icon: MessageCircle,
    label: "Mesajlar",
    desc: "Çiftçilerle özel sohbet et",
    path: "/chat",
    gradient: "from-blue-500 to-indigo-700",
  },
  {
    icon: Bell,
    label: "Bildirimler",
    desc: "Beğeni, yorum ve takip bildirimleri",
    path: "/notifications",
    gradient: "from-yellow-500 to-amber-700",
  },
  {
    icon: Search,
    label: "Keşfet",
    desc: "Çiftçi, hashtag ve içerik ara",
    path: "/search",
    gradient: "from-indigo-500 to-blue-700",
  },
  {
    icon: User,
    label: "Profil",
    desc: "Profilini düzenle, rozetleri görüntüle",
    path: "/profile",
    gradient: "from-slate-500 to-gray-700",
  },
  {
    icon: Settings,
    label: "Ayarlar",
    desc: "Gizlilik, bildirim ve hesap ayarları",
    path: "/settings",
    gradient: "from-gray-500 to-slate-700",
  },
];

const QUICK_LINKS = [
  { icon: Droplets, label: "Sulama", path: "/tarla-takip", color: "text-sky-500 bg-sky-500/10" },
  { icon: FlaskConical, label: "Zirai Kayıt", path: "/tarla-takip", color: "text-purple-500 bg-purple-500/10" },
  { icon: Leaf, label: "Fenoloji", path: "/tarla-takip", color: "text-green-500 bg-green-500/10" },
  { icon: BarChart3, label: "İstatistik", path: "/farmbook", color: "text-amber-500 bg-amber-500/10" },
  { icon: Map, label: "Tarla Haritası", path: "/tarla-takip", color: "text-teal-500 bg-teal-500/10" },
  { icon: Zap, label: "Hızlı Not", path: "/farmbook", color: "text-yellow-500 bg-yellow-500/10" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};
const item = {
  hidden: { opacity: 0, y: 18, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 22 } },
};

export default function FeaturesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = FEATURES.filter(
    (f) =>
      search === "" ||
      f.label.toLowerCase().includes(search.toLowerCase()) ||
      f.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border"
        style={{
          background: "linear-gradient(160deg, hsl(var(--background)/0.94) 0%, hsl(var(--background)/0.80) 100%)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        }}
      >
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-base font-extrabold text-foreground tracking-tight">⚡ Tüm Özellikler</h1>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Hızlı erişim merkezi</p>
          </div>
        </div>
        {/* Search */}
        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Özellik ara..."
              className="w-full bg-secondary border border-border rounded-2xl py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-6">

        {/* Quick actions */}
        {search === "" && (
          <section>
            <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Hızlı Erişim</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {QUICK_LINKS.map((q) => {
                const Icon = q.icon;
                return (
                  <motion.button
                    key={q.label}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => navigate(q.path)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl ${q.color} active:opacity-80 transition-opacity`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2} />
                    <span className="text-[11px] font-semibold text-foreground leading-tight text-center">{q.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}

        {/* All features grid */}
        <section>
          {search === "" && (
            <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Tüm Araçlar</h2>
          )}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3"
          >
            {filtered.map((f) => {
              const Icon = f.icon;
              return (
                <motion.button
                  key={f.path + f.label}
                  variants={item}
                  onClick={() => navigate(f.path)}
                  className="relative flex flex-col items-start gap-2.5 p-4 rounded-2xl bg-card border border-border overflow-hidden active:scale-[0.96] transition-transform text-left group hover:border-primary/30"
                  style={{ boxShadow: "0 1px 8px hsl(var(--foreground)/0.06)" }}
                >
                  {/* Gradient accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-gradient-to-r ${f.gradient} opacity-70 group-hover:opacity-100 transition-opacity`} />

                  {/* Icon circle */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${f.gradient} shadow-md`}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>

                  <div className="min-w-0 w-full">
                    <p className="text-sm font-bold text-foreground leading-snug">{f.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{f.desc}</p>
                  </div>

                  {f.tag && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {f.tag}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm font-semibold">"{search}" için sonuç bulunamadı</p>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}


