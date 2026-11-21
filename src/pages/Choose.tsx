import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Megaphone, ArrowRight, ArrowLeft } from "lucide-react";

const ease = [0.16, 1, 0.3, 1];

const Choose = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/auth", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-6 py-12">
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="relative z-10 w-full max-w-3xl"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-10 group"
        >
          <ArrowLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-1" />
          <span className="text-sm">Ana Sayfa</span>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Ne yapmak istersiniz?
          </h1>
          <p className="text-muted-foreground">
            Devam etmek için bir hizmet seçin
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Verity Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease }}
            whileHover={{ y: -6 }}
          >
            <Link
              to="/verification"
              className="group block rounded-3xl p-8 relative overflow-hidden h-full"
              style={{ background: 'linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))' }}
            >
              <div className="absolute inset-0 border border-border rounded-3xl group-hover:border-primary/40 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow">
                  <BadgeCheck size={32} className="text-primary-foreground" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Agro Verity</h2>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  Mavi tik rozeti için başvuru yapın, mevcut doğrulama durumunuzu görüntüleyin.
                </p>
                <div className="inline-flex items-center gap-2 text-primary text-sm font-semibold">
                  Devam Et
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Ads Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease }}
            whileHover={{ y: -6 }}
          >
            <Link
              to="/ads-post"
              className="group block rounded-3xl p-8 relative overflow-hidden h-full"
              style={{ background: 'linear-gradient(145deg, hsl(0, 0%, 7%), hsl(0, 0%, 3%))' }}
            >
              <div className="absolute inset-0 border border-border rounded-3xl group-hover:border-amber-500/40 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg">
                  <Megaphone size={32} className="text-white" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Agro Ads</h2>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  Reklam postu oluşturun, Agro Sosyal'de yayınlayarak binlerce kullanıcıya ulaşın.
                </p>
                <div className="inline-flex items-center gap-2 text-amber-400 text-sm font-semibold">
                  Reklam Oluştur
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Choose;

