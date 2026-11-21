import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ease = [0.16, 1, 0.3, 1];

const sections = [
  { title: "1. Giriş", content: "Agro Şirketi (\"Şirket\", \"biz\") olarak, Agro PAY platformunu kullanan kullanıcılarımızın gizliliğini korumayı taahhüt ediyoruz. Bu Gizlilik Politikası, kişisel verilerinizin nasıl toplandığını, kullanıldığını, saklandığını ve korunduğunu açıklamaktadır." },
  { title: "2. Toplanan Veriler", content: "Agro PAY hizmetlerini kullanırken aşağıdaki bilgileri toplayabiliriz:", list: ["Ad, soyad ve iletişim bilgileri", "Hesap bilgileri (kullanıcı adı, şifre — şifrelenmiş)", "Ödeme bilgileri (güvenli altyapı üzerinden)", "Agro Verify doğrulama talep bilgileri", "Agro Ads reklam içerik ve hedefleme bilgileri", "Cihaz, IP adresi ve tarayıcı bilgileri", "Platform kullanım verileri ve çerez bilgileri"] },
  { title: "3. Verilerin Kullanımı", content: "Topladığımız verileri aşağıdaki amaçlarla kullanıyoruz:", list: ["Agro PAY hizmetlerini sağlamak ve geliştirmek", "Agro Verify doğrulama süreçlerini yönetmek", "Agro Ads reklam hizmetlerini sunmak", "Ödeme işlemlerini güvenli şekilde gerçekleştirmek", "Kullanıcı hesaplarını yönetmek ve güvenliğini sağlamak", "Yasal yükümlülükleri yerine getirmek"] },
  { title: "4. Veri Güvenliği", content: "Kişisel verilerinizi korumak için endüstri standardı güvenlik önlemleri kullanıyoruz. Tüm veri aktarımları SSL/TLS şifreleme ile korunmaktadır. Ödeme bilgileri, PCI DSS uyumlu güvenli ödeme altyapısı üzerinden işlenmekte olup, sunucularımızda saklanmamaktadır." },
  { title: "5. Veri Paylaşımı", content: "Kişisel verilerinizi, yasal zorunluluklar dışında üçüncü taraflarla paylaşmıyoruz. Agro Ads hizmetinde, reklam verenlerin kişisel bilgileri reklam gösterilen kullanıcılarla paylaşılmaz." },
  { title: "6. Çerezler", content: "Web sitemiz, kullanıcı deneyimini iyileştirmek ve hizmetlerimizi analiz etmek için çerezler kullanmaktadır. Tarayıcı ayarlarınızdan çerezleri yönetebilir veya devre dışı bırakabilirsiniz." },
  { title: "7. Kullanıcı Hakları", content: "KVKK kapsamında aşağıdaki haklara sahipsiniz:", list: ["Kişisel verilerinizin işlenip işlenmediğini öğrenme", "İşlenmiş verilere ilişkin bilgi talep etme", "Verilerin düzeltilmesini veya silinmesini isteme", "Verilerin üçüncü kişilere aktarılıp aktarılmadığını öğrenme", "Verilerin eksik veya yanlış işlenmiş olması halinde düzeltilmesini isteme"] },
  { title: "8. Agro Verify Gizliliği", content: "Doğrulama rozeti başvurusu sırasında sağlanan belgeler ve kişisel bilgiler, yalnızca doğrulama amacıyla kullanılır. Başvuru reddedilse bile, verileriniz güvenli şekilde saklanır ve üçüncü taraflarla paylaşılmaz." },
  { title: "9. Değişiklikler", content: "Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikler olması durumunda, kullanıcılarımızı e-posta veya platform içi bildirim yoluyla bilgilendireceğiz." },
  { title: "10. İletişim", content: "Gizlilik politikamız hakkında sorularınız veya talepleriniz için bizimle iletişime geçebilirsiniz. Tüm başvurular en geç 30 gün içinde yanıtlanacaktır." },
];

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    <section className="pt-36 pb-24">
      <div className="container mx-auto px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-8 shadow-lg">
            <Shield className="text-white" size={26} strokeWidth={1.5} />
          </div>
          
          <h1 className="apple-text-medium mb-4">Gizlilik Politikası</h1>
          <p className="text-muted-foreground mb-16">Son güncelleme: 10 Nisan 2026</p>

          <div className="space-y-12">
            {sections.map((s, i) => (
              <motion.section
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease }}
              >
                <h2 className="text-lg font-semibold text-foreground mb-3">{s.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.content}</p>
                {s.list && (
                  <ul className="mt-3 space-y-2">
                    {s.list.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.section>
            ))}
          </div>

          <div className="section-divider mt-16 mb-8" />
          <div className="text-xs text-muted-foreground/60">
            <p>Bu gizlilik sözleşmesi, Agro Şirketi tarafından Agro PAY platformu için hazırlanmıştır.</p>
            <p className="mt-1">© 2026 Agro Şirketi. Tüm hakları saklıdır.</p>
          </div>
        </motion.div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Privacy;
