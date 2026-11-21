import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import { BadgeCheck, Megaphone, Check, ArrowRight, Sparkles } from "lucide-react";

const ease = [0.16, 1, 0.3, 1];

const ParallaxSection = ({ children, offset = 60 }: { children: React.ReactNode; offset?: number }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return <div ref={ref}><motion.div style={{ y: smoothY }}>{children}</motion.div></div>;
};

const PricingSection = () => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const bgOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0.5, 0.5, 0]);

  return (
    <section ref={sectionRef} className="py-24 relative">
      <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 bg-hero-glow" />
      <div className="section-divider mb-24" />
      <div className="container mx-auto px-6 relative z-10">
        <ParallaxSection offset={30}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6"
            >
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Fiyatlandırma</span>
            </motion.div>
            <h2 className="apple-text-medium mb-4">
              İhtiyacınıza uygun <span className="text-gradient">planı</span> seçin
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Şeffaf fiyatlandırma, gizli ücret yok
            </p>
          </motion.div>
        </ParallaxSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Verify */}
          <motion.div
            initial={{ opacity: 0, y: 60, rotateY: -5 }}
            whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            whileHover={{ y: -8 }}
            className="group relative rounded-3xl p-8 md:p-10 overflow-hidden"
            style={{ background: 'linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))' }}
          >
            <div className="absolute inset-0 border border-primary/30 rounded-3xl" />
            <motion.div
              className="absolute -top-20 -right-20 w-60 h-60 bg-primary/[0.06] rounded-full blur-[100px]"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <motion.div
                  className="w-14 h-14 rounded-2xl icon-container-primary flex items-center justify-center"
                  whileHover={{ scale: 1.15, rotate: 6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <BadgeCheck className="text-white" size={28} strokeWidth={1.5} />
                </motion.div>
                <motion.span
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Popüler
                </motion.span>
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-2">Agro Verify</h3>
              <p className="text-muted-foreground text-sm mb-8">Mavi tik ile doğrulanmış hesap</p>

              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-foreground tracking-tight">₺99</span>
                  <span className="text-muted-foreground">/ay</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-8">
                Yıllık: <span className="text-foreground font-medium">₺948</span>{" "}
                <span className="text-primary">(aylık ₺79 — %20 tasarruf)</span>
              </p>

              <ul className="space-y-3.5 mb-10">
                {[
                  "Mavi doğrulanmış rozet",
                  "Agro Sosyal onaylı hesap",
                  "Öncelikli VIP destek",
                  "Arama sonuçlarında öncelik",
                  "Güvenilirlik artışı",
                ].map((f, i) => (
                  <motion.li
                    key={f}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
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
                <Link
                  to="/auth"
                  className="group/btn flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-gradient-primary text-primary-foreground font-semibold hover:shadow-glow transition-all duration-300"
                >
                  Rozet Al
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover/btn:translate-x-1" />
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* Ads */}
          <motion.div
            initial={{ opacity: 0, y: 60, rotateY: 5 }}
            whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            whileHover={{ y: -8 }}
            className="group relative rounded-3xl p-8 md:p-10 overflow-hidden"
            style={{ background: 'linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))' }}
          >
            <div className="absolute inset-0 border border-border rounded-3xl group-hover:border-primary/20 transition-colors duration-500" />

            {/* Shine sweep */}
            <motion.div
              className="absolute inset-0 rounded-3xl"
              style={{ background: 'linear-gradient(105deg, transparent 40%, hsl(0, 0%, 100%, 0.015) 45%, transparent 50%)' }}
              initial={{ x: '-100%' }}
              whileInView={{ x: '200%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
            />

            <div className="relative z-10">
              <div className="mb-8">
                <motion.div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 border-0 shadow-lg"
                  whileHover={{ scale: 1.15, rotate: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <Megaphone className="text-white" size={28} strokeWidth={1.5} />
                </motion.div>
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-2">Agro Ads</h3>
              <p className="text-muted-foreground text-sm mb-8">Hedef kitlenize ulaşın</p>

              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-foreground tracking-tight">₺50</span>
                  <span className="text-muted-foreground">/reklam</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-8">Her bir reklam post başına</p>

              <ul className="space-y-3.5 mb-10">
                {[
                  "1 reklam post yayını",
                  "Geniş kitleye erişim",
                  "Detaylı analiz raporu",
                  "Esnek bütçe yönetimi",
                  "Hedef kitle seçimi",
                ].map((f, i) => (
                  <motion.li
                    key={f}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
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
                <Link
                  to="/ads"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full glass text-foreground font-semibold hover:bg-secondary/80 transition-all duration-300"
                >
                  Reklam Ver
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
