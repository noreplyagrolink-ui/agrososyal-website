import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BadgeCheck, Check, Shield, Sparkles, HelpCircle,
  ArrowRight, Users, TrendingUp
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ease = [0.16, 1, 0.3, 1];

const ParallaxSection = ({
  children,
  offset = 60,
}: {
  children: React.ReactNode;
  offset?: number;
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return (
    <div ref={ref}>
      <motion.div style={{ y: smoothY }}>{children}</motion.div>
    </div>
  );
};

const faqItems = [
  {
    q: "Doğrulanmış rozet nedir?",
    a: "Doğrulanmış rozet, Agro Sosyal'de hesabınızın gerçek ve güvenilir olduğunu gösteren mavi tik simgesidir. Bu rozet, takipçilerinize hesabınızın resmi olduğunu bildirir.",
  },
  {
    q: "Rozet almak ne kadar sürer?",
    a: "Başvurunuz genellikle 1-3 iş günü içinde incelenir. Kimlik doğrulama belgeleriniz eksiksiz ise süreç daha hızlı tamamlanır.",
  },
  {
    q: "Hangi belgeler gerekli?",
    a: "Kimlik kartınızın ön ve arka yüzü gerekmektedir. Belgelerin net ve okunabilir olması önemlidir.",
  },
  {
    q: "Rozeti iptal edebilir miyim?",
    a: "Evet, aylık planda istediğiniz zaman iptal edebilirsiniz. Yıllık planda ise dönem sonuna kadar aktif kalır. Hesap ayarlarından rozeti kaldırabilirsiniz.",
  },
  {
    q: "Ödeme yöntemleri nelerdir?",
    a: "Kredi kartı, banka kartı ve havale/EFT ile ödeme yapabilirsiniz. Tüm ödemeler güvenli altyapı üzerinden işlenir.",
  },
  {
    q: "Başvurum reddedilirse ne olur?",
    a: "Reddedilme durumunda size e-posta ile bilgi verilir. Eksik belgeleri tamamlayarak yeniden başvurabilirsiniz.",
  },
];

const Verify = () => {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 80]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section ref={heroRef} className="pt-36 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow" />
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[150px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="container mx-auto px-6 relative z-10 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease }}
            className="w-24 h-24 rounded-[28px] icon-container-primary flex items-center justify-center mx-auto mb-10 animate-float"
          >
            <BadgeCheck className="text-white" size={48} strokeWidth={1.5} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 50, filter: "blur(20px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.1, ease }}
            className="apple-text-large mb-6"
          >
            Agro <span className="text-gradient">Verify</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.25, ease }}
            className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto mb-14 leading-relaxed"
          >
            Agro Sosyal'de doğrulanmış rozet alarak hesabınızın güvenilirliğini artırın.
            <br />
            <span className="text-foreground/70">Onaylı hesap talebi gönderin.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block"
            >
              {/* ✅ /auth yerine /verification */}
              <Link
                to="/verification"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-primary text-primary-foreground font-semibold text-lg shadow-glow hover:shadow-[0_0_80px_hsl(215,100%,52%,0.3)] transition-shadow duration-500"
              >
                Doğrulanmış Rozet Al
                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Benefits ──────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <ParallaxSection offset={30}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease }}
              className="text-center mb-20"
            >
              <h2 className="apple-text-medium mb-4">
                Neden <span className="text-gradient">doğrulanmalısınız?</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                Doğrulanmış hesaplar daha fazla güven ve görünürlük kazanır
              </p>
            </motion.div>
          </ParallaxSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {[
              {
                icon: Shield,
                title: "Güvenilirlik",
                desc: "Mavi tik ile takipçilerinize güven verin",
                color: "from-blue-500 to-indigo-600",
              },
              {
                icon: TrendingUp,
                title: "Görünürlük",
                desc: "Arama sonuçlarında üst sıralarda yer alın",
                color: "from-emerald-500 to-teal-600",
              },
              {
                icon: Users,
                title: "Topluluk",
                desc: "Doğrulanmış hesaplar topluluğuna katılın",
                color: "from-violet-500 to-purple-600",
              },
              {
                icon: Sparkles,
                title: "Özel Araçlar",
                desc: "Doğrulanmış hesaplara özel premium özellikler",
                color: "from-amber-500 to-orange-600",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 60, rotateX: 10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.7, ease }}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className="group relative rounded-3xl p-7 overflow-hidden cursor-default"
                style={{
                  background:
                    "linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))",
                }}
              >
                <div className="absolute inset-0 border border-border rounded-3xl group-hover:border-primary/20 transition-colors duration-500" />
                <motion.div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 shadow-lg`}
                  whileHover={{ scale: 1.2, rotate: 8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <item.icon className="text-white" size={22} strokeWidth={1.5} />
                </motion.div>
                <h3 className="text-foreground font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.desc}
                </p>
                <motion.div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  style={{
                    background:
                      "linear-gradient(105deg, transparent 40%, hsl(0, 0%, 100%, 0.02) 45%, transparent 50%)",
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="section-divider mb-24" />
        <div className="container mx-auto px-6">
          <ParallaxSection>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="apple-text-medium mb-4">
                Planınızı <span className="text-gradient">seçin</span>
              </h2>
            </motion.div>
          </ParallaxSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Monthly */}
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease }}
              whileHover={{ y: -8 }}
              className="relative rounded-3xl p-8 md:p-10 overflow-hidden"
              style={{
                background:
                  "linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))",
              }}
            >
              <div className="absolute inset-0 border border-border rounded-3xl" />
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-foreground mb-6">Aylık Plan</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-bold text-foreground tracking-tight">
                    ₺99
                  </span>
                  <span className="text-muted-foreground">/ay</span>
                </div>
                <ul className="space-y-3.5 mb-10">
                  {[
                    "Mavi doğrulanmış rozet",
                    "Agro Sosyal onaylı hesap",
                    "Öncelikli destek",
                    "İstediğiniz zaman iptal",
                  ].map((f, i) => (
                    <motion.li
                      key={f}
                      initial={{ opacity: 0, x: -15 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.08 }}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-muted-foreground" />
                      </div>
                      {f}
                    </motion.li>
                  ))}
                </ul>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  {/* ✅ /auth yerine /verification */}
                  <Link
                    to="/verification"
                    className="flex items-center justify-center w-full py-3.5 rounded-full glass text-foreground font-semibold hover:bg-secondary/80 transition-all duration-300"
                  >
                    Aylık Başla
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            {/* Yearly */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.8, ease }}
              whileHover={{ y: -8 }}
              className="relative rounded-3xl p-8 md:p-10 overflow-hidden"
              style={{
                background:
                  "linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))",
              }}
            >
              <div className="absolute inset-0 border border-primary/30 rounded-3xl" />
              <div className="absolute -top-px left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
              <motion.div
                className="absolute -top-20 -right-20 w-60 h-60 bg-primary/[0.06] rounded-full blur-[100px]"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-foreground">Yıllık Plan</h3>
                  <motion.span
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    %20 Tasarruf
                  </motion.span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-5xl font-bold text-foreground tracking-tight">
                    ₺948
                  </span>
                  <span className="text-muted-foreground">/yıl</span>
                </div>
                <p className="text-sm text-primary mb-8">Aylık ₺79'a denk gelir</p>
                <ul className="space-y-3.5 mb-10">
                  {[
                    "Mavi doğrulanmış rozet",
                    "Agro Sosyal onaylı hesap",
                    "Öncelikli VIP destek",
                    "Yıllık %20 tasarruf",
                    "Özel rozet tasarımı",
                  ].map((f, i) => (
                    <motion.li
                      key={f}
                      initial={{ opacity: 0, x: -15 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-primary" />
                      </div>
                      {f}
                    </motion.li>
                  ))}
                </ul>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  {/* ✅ /auth yerine /verification */}
                  <Link
                    to="/verification"
                    className="group/btn flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-gradient-primary text-primary-foreground font-semibold hover:shadow-glow transition-all duration-300"
                  >
                    Yıllık Başla
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-300 group-hover/btn:translate-x-1"
                    />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Process ───────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="section-divider mb-24" />
        <div className="container mx-auto px-6">
          <ParallaxSection offset={30}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="apple-text-medium mb-4">
                Doğrulama <span className="text-gradient">süreci</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                Üç adımda doğrulanmış rozet alın
              </p>
            </motion.div>
          </ParallaxSection>

          <div className="max-w-3xl mx-auto relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary/20 via-primary/10 to-transparent hidden md:block" />
            {[
              {
                step: "1",
                title: "Belge Yükleyin",
                desc: "Kimlik kartınızın ön ve arka yüzünü yükleyin",
              },
              {
                step: "2",
                title: "Ödemeyi Tamamlayın",
                desc: "Agro PAY üzerinden aylık veya yıllık planı seçin",
              },
              {
                step: "3",
                title: "Onay Bekleyin",
                desc: "Başvurunuz 1–3 iş günü içinde incelenir, sonuç e-posta ile bildirilir",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.7, ease }}
                className="flex items-start gap-6 mb-10 last:mb-0 group"
              >
                <motion.div
                  className="flex-shrink-0 w-12 h-12 rounded-2xl icon-container-primary flex items-center justify-center text-white font-bold text-lg relative"
                  whileHover={{ scale: 1.15, rotate: 8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  {item.step}
                  <div className="absolute inset-0 rounded-2xl border-2 border-primary/0 group-hover:border-primary/20 group-hover:scale-150 transition-all duration-700 opacity-0 group-hover:opacity-100" />
                </motion.div>
                <div className="pt-1.5">
                  <h3 className="text-foreground font-semibold text-lg mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="section-divider mb-24" />
        <div className="container mx-auto px-6 max-w-3xl">
          <ParallaxSection offset={25}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <motion.div
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg"
                whileHover={{ scale: 1.15, rotate: 6 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <HelpCircle className="text-white" size={26} strokeWidth={1.5} />
              </motion.div>
              <h2 className="apple-text-medium mb-4">
                Sıkça Sorulan <span className="text-gradient">Sorular</span>
              </h2>
              <p className="text-muted-foreground">
                Doğrulanmış rozet hakkında merak ettikleriniz
              </p>
            </motion.div>
          </ParallaxSection>

          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <AccordionItem
                  value={`faq-${i}`}
                  className="border-0 rounded-2xl overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 4%))",
                  }}
                >
                  <AccordionTrigger className="text-foreground text-left hover:no-underline px-6 py-5 text-sm font-medium hover:text-primary transition-colors">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed px-6 pb-5 text-sm">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Verify;

