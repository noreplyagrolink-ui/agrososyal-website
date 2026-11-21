import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="relative">
    <div className="section-divider" />
    <div className="container mx-auto px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-[10px] icon-container-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <span className="text-foreground font-semibold text-lg">Agro <span className="text-gradient">PAY</span></span>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            Agro ekosisteminin güvenli ödeme ve doğrulama platformu. Tarımda dijital dönüşümün adresi.
          </p>
        </div>

        <div>
          <h4 className="text-foreground font-semibold text-sm uppercase tracking-wider mb-4">Hizmetler</h4>
          <div className="flex flex-col gap-3">
            <Link to="/verify" className="text-muted-foreground text-sm hover:text-foreground transition-colors duration-200">Agro Verify</Link>
            <Link to="/auth" className="text-muted-foreground text-sm hover:text-foreground transition-colors duration-200">Giriş Yap</Link>
          </div>
        </div>

        <div>
          <h4 className="text-foreground font-semibold text-sm uppercase tracking-wider mb-4">Yasal</h4>
          <div className="flex flex-col gap-3">
            <Link to="/privacy" className="text-muted-foreground text-sm hover:text-foreground transition-colors duration-200">Gizlilik Politikası</Link>
            <span className="text-muted-foreground text-sm">Kullanım Şartları</span>
            <span className="text-muted-foreground text-sm">KVKK</span>
          </div>
        </div>

        <div>
          <h4 className="text-foreground font-semibold text-sm uppercase tracking-wider mb-4">İletişim</h4>
          <div className="flex flex-col gap-3">
            <span className="text-muted-foreground text-sm">noreply.agrolink@gmail.com</span>
            <span className="text-muted-foreground text-sm">0850 123 45 67</span>
          </div>
        </div>
      </div>

      <div className="section-divider" />
      <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-muted-foreground text-xs">
          © 2026 Agro Şirketi. Tüm hakları saklıdır.
        </p>
        <div className="flex items-center gap-6">
          <span className="text-muted-foreground text-xs">Türkiye</span>
          <span className="text-muted-foreground text-xs">🇹🇷</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;

