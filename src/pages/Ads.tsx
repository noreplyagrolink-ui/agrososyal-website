import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import { Megaphone, BarChart3, Target, Users, Check, ArrowRight, Eye, TrendingUp, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ease = [0.16, 1, 0.3, 1];

const ParallaxSection = ({ children, offset = 60 }: { children: React.ReactNode; offset?: number }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return <div ref={ref}><motion.div style={{ y: smoothY }}>{children}</motion.div></div>;
};

const Ads = () => {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 80]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section ref={heroRef} className="pt-36 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow" />
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/[0.03] blur-[150px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div style={{ opacity: heroOpacity, scale: heroScale, y: heroY }} className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: 10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease }}
            className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-10 shadow-lg animate-float"
          >
            <Megaphone className="text-white" size={48} strokeWidth={1.5} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 50, filter: "blur(20px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.1, ease }}
            className="apple-text-large mb-6"
          >
            Agro <span className="text-gradient-glow">Ads</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.25, ease }}
            className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed"
          >
            Agro Sosyal platformunda reklam vererek binlerce kullanıcıya ulaşın.
            <br />
            <span className="text-foreground/70">Akıllı hedefleme ile doğru kitleye ulaşın.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, ease }}
            className="inline-flex items-baseline gap-2 rounded-2xl px-8 py-6 mb-14"
            style={{ background: 'linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))', border: '1px solid hsl(0, 0%, 12%)' }}
          >
            <motion.span
              className="text-5xl font-bold text-foreground tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              ₺50
            </motion.span>
            <span className="text-muted-foreground text-lg">/ reklam post</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, ease }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <Link
                to="/auth"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:shadow-[0_0_80px_hsl(215,100%,52%,0.3)] transition-shadow duration-500"
              >
                Reklam Vermeye Başla
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <ParallaxSection offset={30}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="apple-text-medium mb-4">
                Nasıl <span className="text-gradient">Çalışır?</span>
              </h2>
              <p className="text-muted-foreground text-lg">Üç adımda reklamınızı yayınlayın</p>
            </motion.div>
          </ParallaxSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              { step: "01", icon: Target, title: "Hedef Belirleyin", desc: "Reklam göstermek istediğiniz kitleyi ve bölgeyi seçin", color: "from-blue-500 to-indigo-600" },
              { step: "02", icon: Megaphone, title: "İçerik Oluşturun", desc: "Dikkat çekici reklam postunuzu hazırlayın ve onaya gönderin", color: "from-amber-500 to-orange-600" },
              { step: "03", icon: BarChart3, title: "Sonuçları İzleyin", desc: "Detaylı analiz raporlarıyla performansı gerçek zamanlı takip edin", color: "from-emerald-500 to-teal-600" },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 80, rotateX: 15 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.8, ease }}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className="group relative rounded-3xl p-8 text-center overflow-hidden cursor-default"
                style={{ background: 'linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))' }}
              >
                <div className="absolute inset-0 border border-border rounded-3xl group-hover:border-primary/20 transition-colors duration-500" />

                {/* Shine sweep */}
                <motion.div
                  className="absolute inset-0 rounded-3xl"
                  style={{ background: 'linear-gradient(105deg, transparent 40%, hsl(0, 0%, 100%, 0.02) 45%, transparent 50%)' }}
                  initial={{ x: '-100%' }}
                  whileInView={{ x: '200%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.3 + i * 0.2, ease: "easeInOut" }}
                />

                <span className="text-7xl font-bold text-gradient opacity-[0.08] block mb-4">{item.step}</span>
                <motion.div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-5 shadow-lg`}
                  whileHover={{ scale: 1.2, rotate: 8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <item.icon className="text-white" size={26} strokeWidth={1.5} />
                </motion.div>
                <h3 className="text-foreground font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24">
        <div className="section-divider mb-24" />
        <div className="container mx-auto px-6">
          <ParallaxSection offset={40}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { icon: Eye, value: "1K+", label: "Etkileşimli Kullanıcı" },
                { icon: Users, value: "500+", label: "Reklam Veren" },
                { icon: TrendingUp, value: "%85", label: "Etkileşim Oranı" },
                { icon: Zap, value: "<1s", label: "Yayın Hızı" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 40, scale: 0.8 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.6, ease }}
                  whileHover={{ scale: 1.05 }}
                  className="text-center py-8 rounded-2xl hover:bg-secondary/30 transition-colors duration-300"
                >
                  <div className="text-3xl md:text-4xl font-bold text-gradient mb-2">{stat.value}</div>
                  <div className="text-muted-foreground text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </ParallaxSection>
        </div>
      </section>

      {/* Ad Format Preview */}
      <section className="py-16">
        <div className="section-divider mb-16" />
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="apple-text-medium mb-4">
              Reklam <span className="text-gradient">Formatı</span>
            </h2>
            <p className="text-muted-foreground">Reklamlarınız feed'de ve her sayfada sarı çerçeve ile öne çıkar</p>
          </motion.div>
          <div className="max-w-sm mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="ad-card rounded-3xl p-6 cursor-default"
              style={{ background: 'linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">AgroMarka</p>
                  <p className="text-muted-foreground text-xs">Tarım Ürünleri</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                Organik gübre ürünlerimizle veriminizi artırın. Hızlı teslimat garantisi ile tarlanıza ulaşıyor.
              </p>
              <div className="w-full h-28 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <Megaphone className="text-amber-500/50" size={32} strokeWidth={1} />
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                <Zap size={12} />
                Detayları Gör
              </div>
            </motion.div>
            <p className="text-center text-xs text-muted-foreground/50 mt-4">
              Sarı çerçeve ile reklam içerikleri feed'de kolayca ayırt edilir
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="section-divider mb-24" />
        <div className="container mx-auto px-6">
          <ParallaxSection offset={50}>
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease }}
              className="rounded-[32px] p-8 md:p-12 max-w-3xl mx-auto relative overflow-hidden"
              style={{ background: 'linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))' }}
            >
              <div className="absolute inset-0 border border-border rounded-[32px]" />
              <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[150px] bg-primary/[0.06] blur-[100px] rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-foreground mb-8">Reklam Paketi Dahil Olanlar</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    "1 reklam post yayını",
                    "Geniş kitleye erişim",
                    "Detaylı analiz raporu",
                    "Esnek bütçe yönetimi",
                    "Hedef kitle seçimi",
                    "A/B test desteği",
                    "Gerçek zamanlı istatistik",
                    "7/24 destek",
                  ].map((f, i) => (
                    <motion.div
                      key={f}
                      initial={{ opacity: 0, x: -15 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06, duration: 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-primary" />
                      </div>
                      <span className="text-muted-foreground text-sm">{f}</span>
                    </motion.div>
                  ))}
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block mt-10">
                  <Link
                    to="/auth"
                    className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-primary text-primary-foreground font-semibold hover:shadow-glow transition-all duration-300"
                  >
                    Hemen Başla
                    <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </ParallaxSection>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Ads;
