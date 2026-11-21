import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type ComponentType,
} from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ArrowUpRight,
  Handshake,
  Zap,
  Globe2,
  ShieldCheck,
  Mail,
  User,
  Phone,
  Briefcase,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const easeOutExpo = [0.16, 1, 0.3, 1] as const;

const WORK_FIELDS = [
  "Agro Sosyal Web Teknolojisi",
  "Agro Sosyal Mobil App Geliştiricisi",
  "Agro Pay Geliştiricisi",
  "Tüm Sistem Güvenlik Geliştiricisi",
  "Reklam ve Pazarlama",
  "UI Tasarım Geliştiricisi",
  "Agro Sosyal Linux Geliştiricisi",
  "Agro Sosyal Windows Geliştiricisi",
  "Agro AI Geliştiricisi",
  "Backend Geliştiricisi",
  "Agro Developer Geliştiricisi",
  "Agro Sosyal Şikayet Yetkilisi",
];

const API_BASE = "https://sehitumitkestitarimmtal.com";

const PERKS = [
  {
    icon: Zap,
    title: "Hızlı Onay",
    desc: "Başvurular 48 saat içinde değerlendirilip yanıtlanır.",
  },
  {
    icon: Globe2,
    title: "Global Topluluk",
    desc: "Farklı disiplinlerden binlerce yetenekle birlikte çalış.",
  },
  {
    icon: ShieldCheck,
    title: "Şeffaf Süreç",
    desc: "Her adımda otomatik e-posta ile bilgilendirilirsin.",
  },
];

type SubmitState = "idle" | "loading" | "success";

const Spotlight = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  const bg = useTransform([mx, my], ([x, y]) =>
    `radial-gradient(420px circle at ${x}px ${y}px, hsl(var(--primary) / 0.18), transparent 65%)`
  );

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={cn("group relative overflow-hidden", className)}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: bg }}
      />
      {children}
    </div>
  );
};

const Partnership = () => {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    workField: "",
    message: "",
  });
  const [state, setState] = useState<SubmitState>("idle");
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const filledCount =
    (form.fullName.trim() ? 1 : 0) +
    (form.email.trim() ? 1 : 0) +
    (form.workField ? 1 : 0) +
    (form.phone.trim() ? 1 : 0) +
    (form.message.trim() ? 1 : 0);

  const progress = Math.round((filledCount / 5) * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "loading") return;

    if (!form.fullName.trim() || !form.email.trim() || !form.workField) {
      toast.error("Lütfen zorunlu alanları doldur");
      return;
    }

    setState("loading");

    const url = `${API_BASE.replace(/\/$/, "")}/api/partnership/apply`;

    let res: Response;
    let data: Record<string, unknown> = {};

    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          workField: form.workField,
          message: form.message.trim() || undefined,
        }),
      });
    } catch (networkErr: unknown) {
      const msg =
        networkErr instanceof Error ? networkErr.message : String(networkErr);
      console.error("[Partnership] Ağ hatası:", msg);
      toast.error(`Ağ hatası: ${msg}`);
      setState("idle");
      return;
    }

    try {
      data = await res.json();
    } catch {
      console.error(
        "[Partnership] JSON parse hatası, HTTP:",
        res.status,
        res.statusText
      );
      toast.error(`Sunucu geçersiz yanıt döndürdü (HTTP ${res.status})`);
      setState("idle");
      return;
    }

    console.debug("[Partnership] HTTP", res.status, data);

    if (res.status === 201 && data?.success) {
      setSubmittedId((data.id as string) ?? null);
      setState("success");
      toast.success((data.message as string) || "Başvurun başarıyla iletildi");
      return;
    }

    if (res.status === 409) {
      toast.error((data?.message as string) || "Zaten bekleyen başvuru var");
    } else if (res.status === 400) {
      toast.error((data?.message as string) || "Eksik veya hatalı alanlar var");
    } else if (res.status === 404) {
      toast.error(
        "API endpoint bulunamadı (404) — lütfen yöneticiyle iletişime geç"
      );
      console.error("[Partnership] 404 — endpoint yok:", url);
    } else if (res.status >= 500) {
      toast.error(`Sunucu hatası (${res.status}) — lütfen daha sonra tekrar dene`);
    } else {
      toast.error(
        (data?.message as string) || `Beklenmeyen hata (HTTP ${res.status})`
      );
    }

    setState("idle");
  };

  return (
    <div className="relative min-h-screen max-w-full overflow-x-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 -z-20 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
        }}
      />

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-primary/25 blur-[120px] sm:h-[560px] sm:w-[560px] sm:blur-[150px]"
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 -right-32 h-[420px] w-[420px] rounded-full bg-accent/25 blur-[120px] sm:h-[560px] sm:w-[560px] sm:blur-[150px]"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-secondary/15 blur-[90px] sm:h-[420px] sm:w-[420px] sm:blur-[130px]"
        />
      </div>

      <header className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 pt-6 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:pt-8">
        <Link
          to="/"
          className="group inline-flex max-w-full items-center gap-2 self-start rounded-full border border-border/60 bg-card/40 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur transition-all hover:border-primary/40 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" />
          <span className="truncate">Anasayfa</span>
        </Link>

        <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur sm:inline-flex">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Sistem aktif · {time.toLocaleTimeString("tr-TR")}
        </div>

        <div className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Agro Sosyal · Partnerlik</span>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-24 pt-8 sm:px-5 sm:pt-12 lg:grid-cols-[1.05fr,1fr] lg:gap-16 lg:pt-20">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: easeOutExpo }}
          className="min-w-0 flex flex-col"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: easeOutExpo }}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary"
          >
            <Handshake className="h-3.5 w-3.5 shrink-0" />
            Birlikte daha güçlüyüz
          </motion.div>

          <h1 className="mt-6 text-[2.1rem] font-semibold leading-[1.02] tracking-tight sm:text-5xl lg:text-[4.4rem]">
            <span className="block">Agro Sosyal&apos;in</span>
            <span className="block bg-gradient-to-r from-primary via-primary/70 to-accent bg-clip-text text-transparent">
              bir parçası ol.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-lg">
            Geliştirici, tasarımcı, güvenlik uzmanı ya da pazarlamacı —
            yeteneğinle Agro Sosyal&apos;in geleceğini birlikte inşa edelim.
            Başvurunu gönder, ekibimiz seninle iletişime geçsin.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3 border-y border-border/60 py-5 sm:gap-4 sm:py-6">
            {[
              { v: "12+", l: "Açık alan" },
              { v: "48s", l: "Yanıt süresi" },
              { v: "%100", l: "Şeffaflık" },
            ].map((s, i) => (
              <motion.div
                key={s.l}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.2 + i * 0.07,
                  ease: easeOutExpo,
                }}
              >
                <div className="text-xl font-semibold tracking-tight sm:text-3xl">
                  {s.v}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                  {s.l}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {PERKS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.25 + i * 0.08,
                  ease: easeOutExpo,
                }}
              >
                <Spotlight className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur transition-colors hover:border-primary/40">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold">{p.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {p.desc}
                  </p>
                </Spotlight>
              </motion.div>
            ))}
          </div>

          <div className="relative mt-8 overflow-hidden rounded-2xl border border-border/60 bg-card/30 py-3 backdrop-blur">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
            <motion.div
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
              className="flex gap-3 whitespace-nowrap"
            >
              {[...WORK_FIELDS, ...WORK_FIELDS].map((w, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3.5 py-1.5 text-xs text-muted-foreground"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                  {w}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: easeOutExpo }}
          className="min-w-0 w-full max-w-full"
        >
          <div className="relative w-full max-w-full overflow-hidden rounded-[24px] border border-border/60 bg-card/60 p-4 shadow-2xl backdrop-blur-2xl sm:rounded-[28px] sm:p-6 lg:p-8">
            <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            <div className="pointer-events-none absolute inset-y-6 -left-px w-px bg-gradient-to-b from-transparent via-primary/40 to-transparent" />

            {state === "success" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: easeOutExpo }}
                className="flex flex-col items-center py-10 text-center"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.7, delay: 0.1, ease: easeOutExpo }}
                  className="relative mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 text-primary ring-1 ring-primary/30"
                >
                  <CheckCircle2 className="h-10 w-10" />
                  <span className="absolute inset-0 -z-10 animate-ping rounded-3xl bg-primary/20" />
                </motion.div>

                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Başvurun alındı 🎉
                </h2>

                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Teşekkür e-postası kısa süre içinde{" "}
                  <span className="text-foreground">{form.email}</span> adresine
                  ulaşacak. Ekibimiz başvurunu inceleyip seninle iletişime geçecek.
                </p>

                {submittedId && (
                  <div className="mt-6 rounded-xl border border-border/60 bg-background/50 px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                    Başvuru ID:{" "}
                    <span className="text-foreground">{submittedId}</span>
                  </div>
                )}

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setForm({
                        fullName: "",
                        email: "",
                        phone: "",
                        workField: "",
                        message: "",
                      });
                      setSubmittedId(null);
                      setState("idle");
                    }}
                  >
                    Yeni başvuru
                  </Button>
                  <Button asChild>
                    <Link to="/">
                      Anasayfa
                      <ArrowUpRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            ) : (
              <>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                      <span className="h-1 w-1 rounded-full bg-primary" />
                      Adım 1 / 1
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[1.7rem]">
                      Başvuru Formu
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Yıldızlı (<span className="text-primary">*</span>) alanlar
                      zorunludur.
                    </p>
                  </div>

                  <div className="relative h-14 w-14 shrink-0 self-end sm:self-auto">
                    <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="none"
                        stroke="hsl(var(--border))"
                        strokeWidth="2.5"
                      />
                      <motion.circle
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray="100"
                        animate={{ strokeDashoffset: 100 - progress }}
                        transition={{ duration: 0.5, ease: easeOutExpo }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">
                      {progress}%
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 max-w-full">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field icon={User} label="Ad Soyad" required>
                      <Input
                        value={form.fullName}
                        onChange={(e) => update("fullName", e.target.value)}
                        placeholder="Adın ve soyadın"
                        maxLength={120}
                        className="w-full max-w-full min-w-0 pl-10"
                        required
                      />
                    </Field>

                    <Field icon={Mail} label="E-posta" required>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="ornek@mail.com"
                        maxLength={200}
                        className="w-full max-w-full min-w-0 pl-10"
                        required
                      />
                    </Field>
                  </div>

                  <Field icon={Phone} label="Telefon">
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="+90 5xx xxx xx xx"
                      maxLength={30}
                      className="w-full max-w-full min-w-0 pl-10"
                    />
                  </Field>

                  <Field icon={Briefcase} label="Çalışmak istediğin alan" required>
                    <Select
                      value={form.workField}
                      onValueChange={(v) => update("workField", v)}
                    >
                      <SelectTrigger className="w-full max-w-full min-w-0 pl-10">
                        <SelectValue placeholder="Bir alan seç" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {WORK_FIELDS.map((w) => (
                          <SelectItem key={w} value={w}>
                            {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field icon={MessageSquare} label="Ek mesaj">
                    <Textarea
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      placeholder="Deneyimin, motivasyonun veya eklemek istediğin her şey..."
                      rows={5}
                      maxLength={1000}
                      className="w-full max-w-full min-w-0 pl-10 pt-2.5"
                    />
                    <div className="mt-1.5 text-right text-[11px] tabular-nums text-muted-foreground">
                      {form.message.length}/1000
                    </div>
                  </Field>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={state === "loading"}
                    className="relative z-10 w-full max-w-full"
                  >
                    {state === "loading" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        Başvuruyu Gönder
                        <Send className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <p className="pt-1 text-center text-[11px] text-muted-foreground">
                    Gönderdiğinde Agro Sosyal{" "}
                    <span className="text-foreground/80">
                      gizlilik politikasını
                    </span>{" "}
                    kabul etmiş olursun.
                  </p>
                </form>
              </>
            )}
          </div>
        </motion.section>
      </main>
    </div>
  );
};

const Field = ({
  icon: Icon,
  label,
  required,
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  required?: boolean;
  children: ReactNode;
}) => (
  <div className="min-w-0 space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground">
      {label}
      {required && <span className="ml-1 text-primary">*</span>}
    </Label>
    <div className="relative min-w-0 max-w-full">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      )}
      {children}
    </div>
  </div>
);

export default Partnership;
