import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { BadgeCheck, Zap, Shield, CreditCard, ArrowRight, MousePointerClick } from "lucide-react";

const ease = [0.16, 1, 0.3, 1];

const ParallaxSection = ({ children, offset = 80 }: { children: React.ReactNode; offset?: number }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return (
    <div ref={ref}>
      <motion.div style={{ y: smoothY }}>{children}</motion.div>
    </div>
  );
};

const FloatingOrb = ({ className, delay = 0 }: { className: string; delay?: number }) => (
  <motion.div
    className={className}
    animate={{ y: [0, -20, 0], x: [0, 10, 0], scale: [1, 1.1, 1] }}
    transition={{ duration: 6, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

const CountUp = ({ value, suffix = "" }: { value: string; suffix?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.6, ease }}
    >
      {value}{suffix}
    </motion.span>
  );
};

const MagneticButton = ({ children, className, to }: { children: React.ReactNode; className: string; to: string }) => (
  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
    <Link to={to} className={className}>{children}</Link>
  </motion.div>
);

const HeroSection = () => {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 100]);
  const bgGlowScale = useTransform(scrollYProgress, [0, 1], [1, 1.5]);
  const bgGlowOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <>
      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Animated background orbs */}
        <motion.div style={{ scale: bgGlowScale, opacity: bgGlowOpacity }} className="absolute inset-0 bg-hero-glow" />
        <FloatingOrb className="absolute top-[15%] left-[10%] w-[300px] h-[300px] rounded-full bg-primary/[0.02] blur-[100px]" delay={0} />
        <FloatingOrb className="absolute top-[30%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-500/[0.02] blur-[120px]" delay={2} />
        <FloatingOrb className="absolute bottom-[20%] left-[30%] w-[350px] h-[350px] rounded-full bg-blue-500/[0.02] blur-[110px]" delay={4} />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />

        {/* Animated grid */}
        <motion.div
          className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
          animate={{ backgroundPosition: ['0px 0px', '60px 60px'] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />

        <motion.div style={{ opacity: heroOpacity, scale: heroScale, y: heroY }} className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease }}
          >
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass mb-10">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">Agro Ekosistemi için Güvenli Ödeme</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 60, filter: "blur(20px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.2, delay: 0.1, ease }}
            className="apple-text-large mb-8"
          >
            Agro{" "}
            <motion.span
              className="text-gradient-glow inline-block"
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: '200% 200%' }}
            >
              PAY
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
            className="text-base md:text-xl text-muted-foreground max-w-xl mx-auto mb-14 leading-relaxed"
          >
            Doğrulanmış hesaplar. Güvenli ödemeler. Akıllı reklam çözümleri.
            <br className="hidden md:block" />
            <span className="text-foreground/70">Agro Sosyal ekosisteminde güvenin tek adresi.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <MagneticButton
              to="/verify"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-primary text-primary-foreground font-semibold text-base shadow-glow hover:shadow-[0_0_80px_hsl(215,100%,52%,0.3)] transition-shadow duration-500"
            >
              Doğrulanmış Rozet Al
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </MagneticButton>
            <MagneticButton
              to="/verify"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full glass text-foreground font-semibold text-base hover:bg-secondary/80 transition-all duration-300"
            >
              Reklam Ver
            </MagneticButton>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-20"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2 text-muted-foreground/40"
            >
              <MousePointerClick size={16} />
              <span className="text-[10px] uppercase tracking-widest">Keşfet</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Feature showcase */}
      <section className="py-8">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              { icon: BadgeCheck, title: "Agro Verify", desc: "Mavi tik ile hesabınızı doğrulayın ve güvenilirliğinizi artırın", color: "from-blue-500 to-indigo-600" },
              { icon: Zap, title: "Agro Ads", desc: "Hedef kitlenize akıllı reklam çözümleriyle ulaşın", color: "from-amber-500 to-orange-600" },
              { icon: Shield, title: "Güvenli Altyapı", desc: "256-bit SSL şifreleme ile korunan tüm işlemler", color: "from-emerald-500 to-teal-600" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 80, rotateX: 10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: i * 0.15, ease }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group relative rounded-3xl p-8 overflow-hidden cursor-default"
                style={{ background: 'linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))' }}
              >
                <div className="absolute inset-0 border border-border rounded-3xl group-hover:border-primary/20 transition-colors duration-500" />
                <motion.div
                  className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px]"
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileHover={{ opacity: 0.6, scale: 1 }}
                  style={{ background: `linear-gradient(135deg, hsl(215, 100%, 50%), hsl(240, 80%, 60%))` }}
                />

                <motion.div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-lg`}
                  whileHover={{ scale: 1.15, rotate: 6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <item.icon className="text-white" size={26} strokeWidth={1.5} />
                </motion.div>
                <h3 className="text-foreground font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>

                {/* Shine effect on hover */}
                <motion.div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'linear-gradient(105deg, transparent 40%, hsl(0, 0%, 100%, 0.02) 45%, transparent 50%)' }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <ParallaxSection offset={40}>
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <motion.h2
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease }}
                  className="apple-text-medium mb-4"
                >
                  Güven. <span className="text-gradient">Hız.</span> Güvenlik.
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.1, ease }}
                  className="text-muted-foreground text-lg max-w-lg mx-auto"
                >
                  Agro PAY ile dijital tarım ekosisteminde güvenli işlemler
                </motion.p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { value: "1K+", label: "Etkileşimli Kullanıcı" },
                  { value: "99.9%", label: "Uptime Garantisi" },
                  { value: "256", label: "Bit SSL Şifreleme" },
                  { value: "7/24", label: "Destek Hizmeti" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 40, scale: 0.8 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.12, ease }}
                    whileHover={{ scale: 1.05 }}
                    className="text-center py-8 rounded-2xl hover:bg-secondary/30 transition-colors duration-300"
                  >
                    <div className="text-3xl md:text-4xl font-bold text-gradient mb-2">
                      <CountUp value={stat.value} />
                    </div>
                    <div className="text-muted-foreground text-sm">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </ParallaxSection>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 relative">
        <div className="section-divider mb-24" />
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
                Nasıl <span className="text-gradient">Çalışır?</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                Üç basit adımda Agro PAY'ı kullanmaya başlayın
              </p>
            </motion.div>
          </ParallaxSection>

          <div className="max-w-4xl mx-auto relative">
            {/* Connecting line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary/20 via-primary/10 to-transparent hidden md:block" />

            {[
              { step: "01", icon: CreditCard, title: "Hesabınızla Giriş Yapın", desc: "Agro Sosyal hesabınız ile hızlı ve güvenli giriş yapın. Yeni bir kayıt gerekmez." },
              { step: "02", icon: BadgeCheck, title: "Hizmet Seçin", desc: "Doğrulanmış rozet veya reklam hizmeti arasından ihtiyacınıza uygun olanı seçin." },
              { step: "03", icon: Shield, title: "Güvenle Kullanın", desc: "SSL korumalı altyapı ile güvenli ödeme yapın, hizmetinizi hemen kullanmaya başlayın." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.2, ease }}
                className="flex items-start gap-6 md:gap-8 mb-12 last:mb-0 group"
              >
                <div className="flex-shrink-0 relative">
                  <motion.div
                    className="w-16 h-16 rounded-2xl icon-container-primary flex items-center justify-center"
                    whileHover={{ scale: 1.15, rotate: 8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <item.icon className="text-white" size={28} strokeWidth={1.5} />
                  </motion.div>
                  {/* Pulse ring on hover */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-primary/0 group-hover:border-primary/20 group-hover:scale-125 transition-all duration-700 opacity-0 group-hover:opacity-100" />
                </div>
                <div className="pt-2">
                  <motion.span
                    className="text-xs text-primary font-semibold tracking-widest uppercase mb-2 block"
                    initial={{ width: 0 }}
                    whileInView={{ width: "auto" }}
                    viewport={{ once: true }}
                  >
                    Adım {item.step}
                  </motion.span>
                  <h3 className="text-foreground font-semibold text-xl mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-md">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <ParallaxSection offset={50}>
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease }}
              className="max-w-3xl mx-auto text-center relative rounded-[32px] p-12 md:p-16 overflow-hidden"
              style={{ background: 'linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))' }}
            >
              <div className="absolute inset-0 border border-border rounded-[32px]" />
              <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-primary/10 blur-[100px] rounded-full"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative z-10">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-3xl md:text-4xl font-bold mb-4"
                >
                  Hemen <span className="text-gradient">Başlayın</span>
                </motion.h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Agro PAY ile hesabınızı doğrulayın, reklamlarınızı yönetin ve güvenle ödeme yapın.
                </p>
                <MagneticButton
                  to="/auth"
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow transition-shadow duration-500 hover:shadow-[0_0_80px_hsl(215,100%,52%,0.3)]"
                >
                  Ücretsiz Başlayın
                  <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                </MagneticButton>
              </div>
            </motion.div>
          </ParallaxSection>
        </div>
      </section>
    </>
  );
};

export default HeroSection;

