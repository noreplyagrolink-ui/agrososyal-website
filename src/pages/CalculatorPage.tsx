import { useState } from "react";
import { Calculator, TrendingUp, Share2, Copy, Check, ChevronDown, Sprout } from "lucide-react";
import BottomNav from "@/components/BottomNav";

// ------- VERİ -------
const ILLER: Record<string, number> = {
  "Adana": 180, "Adıyaman": 90, "Afyonkarahisar": 110, "Ağrı": 70,
  "Amasya": 120, "Ankara": 200, "Antalya": 350, "Artvin": 130,
  "Aydın": 280, "Balıkesir": 220, "Bilecik": 150, "Bingöl": 75,
  "Bitlis": 70, "Bolu": 160, "Burdur": 130, "Bursa": 300,
  "Çanakkale": 200, "Çankırı": 100, "Çorum": 110, "Denizli": 200,
  "Diyarbakır": 120, "Edirne": 180, "Elazığ": 100, "Erzincan": 85,
  "Erzurum": 80, "Eskişehir": 160, "Gaziantep": 160, "Giresun": 140,
  "Gümüşhane": 90, "Hakkari": 60, "Hatay": 170, "Isparta": 130,
  "Mersin": 200, "İstanbul": 800, "İzmir": 400, "Kars": 65,
  "Kastamonu": 110, "Kayseri": 150, "Kırklareli": 170, "Kırşehir": 110,
  "Kocaeli": 350, "Konya": 130, "Kütahya": 120, "Malatya": 110,
  "Manisa": 210, "Kahramanmaraş": 110, "Mardin": 100, "Muğla": 400,
  "Muş": 70, "Nevşehir": 140, "Niğde": 110, "Ordu": 170,
  "Rize": 160, "Sakarya": 230, "Samsun": 180, "Siirt": 80,
  "Sinop": 120, "Sivas": 90, "Tekirdağ": 190, "Tokat": 115,
  "Trabzon": 180, "Tunceli": 75, "Şanlıurfa": 105, "Uşak": 130,
  "Van": 80, "Yozgat": 95, "Zonguldak": 150, "Aksaray": 110,
  "Bayburt": 80, "Karaman": 115, "Kırıkkale": 130, "Batman": 100,
  "Şırnak": 70, "Bartın": 140, "Ardahan": 60, "Iğdır": 75,
  "Yalova": 300, "Karabük": 130, "Kilis": 110, "Osmaniye": 130,
  "Düzce": 170,
};

const ARAZI_TURLERI: Record<string, { carpan: number; etiket: string }> = {
  "tarla": { carpan: 1.0, etiket: "🌾 Tarla" },
  "bahce": { carpan: 1.8, etiket: "🌳 Bahçe / Meyve bahçesi" },
  "findik": { carpan: 2.2, etiket: "🌰 Fındık bahçesi" },
  "zeytinlik": { carpan: 2.5, etiket: "🫒 Zeytinlik" },
  "sera": { carpan: 3.0, etiket: "🏗️ Seralık arazi" },
  "mer": { carpan: 0.6, etiket: "🐄 Mera / Çayır" },
  "orman": { carpan: 0.5, etiket: "🌲 Orman arazisi" },
};

const URUNLER: Record<string, { verim: number; fiyat: number; maliyet: number; birim: string }> = {
  "Buğday": { verim: 350, fiyat: 9.5, maliyet: 2200, birim: "kg/dekar" },
  "Arpa": { verim: 300, fiyat: 8.0, maliyet: 1800, birim: "kg/dekar" },
  "Mısır": { verim: 800, fiyat: 7.5, maliyet: 3000, birim: "kg/dekar" },
  "Ayçiçeği": { verim: 200, fiyat: 22.0, maliyet: 2500, birim: "kg/dekar" },
  "Fındık": { verim: 120, fiyat: 130.0, maliyet: 6000, birim: "kg/dekar" },
  "Zeytin": { verim: 180, fiyat: 25.0, maliyet: 3500, birim: "kg/dekar" },
  "Domates": { verim: 4000, fiyat: 4.5, maliyet: 8000, birim: "kg/dekar" },
  "Biber": { verim: 2500, fiyat: 8.0, maliyet: 9000, birim: "kg/dekar" },
  "Elma": { verim: 2000, fiyat: 6.0, maliyet: 5000, birim: "kg/dekar" },
  "Çilek": { verim: 800, fiyat: 18.0, maliyet: 12000, birim: "kg/dekar" },
  "Şeker Pancarı": { verim: 5000, fiyat: 2.0, maliyet: 3000, birim: "kg/dekar" },
  "Patates": { verim: 2500, fiyat: 5.5, maliyet: 4500, birim: "kg/dekar" },
  "Soğan": { verim: 3000, fiyat: 4.0, maliyet: 3500, birim: "kg/dekar" },
  "Karpuz": { verim: 3500, fiyat: 3.5, maliyet: 5000, birim: "kg/dekar" },
  "Çay": { verim: 400, fiyat: 20.0, maliyet: 4000, birim: "kg/dekar" },
};

function fmt(n: number) {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

// ------- TARLA HESAP -------
function TarlaHesap() {
  const [il, setIl] = useState("");
  const [dekar, setDekar] = useState("");
  const [arazi, setArazi] = useState("tarla");
  const [sonuc, setSonuc] = useState<null | { min: number; max: number; orta: number }>(null);
  const [copied, setCopied] = useState(false);

  const hesapla = () => {
    const d = parseFloat(dekar);
    if (!il || !d || d <= 0) return;
    const m2Fiyat = ILLER[il] ?? 150;
    const carpan = ARAZI_TURLERI[arazi].carpan;
    const m2 = d * 1000;
    const orta = m2 * m2Fiyat * carpan;
    setSonuc({ min: orta * 0.85, max: orta * 1.15, orta });
  };

  const paylasMetni = () => {
    if (!sonuc) return "";
    const aet = ARAZI_TURLERI[arazi].etiket;
    return `🌾 AgroLink Tarla Değer Hesaplama\n📍 ${il} | ${aet}\n📐 Alan: ${dekar} dekar\n💰 Tahmini Değer: ${fmt(sonuc.min)} – ${fmt(sonuc.max)} TL\n📊 Ortalama: ${fmt(sonuc.orta)} TL\n\n#AgroLink #Tarım #GayrimenkulHesaplama`;
  };

  const paylas = async () => {
    const text = paylasMetni();
    if (navigator.share) {
      try { await navigator.share({ title: "Tarla Değer Hesaplama", text }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* İl seçimi */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">İl</label>
        <div className="relative">
          <select
            value={il}
            onChange={e => { setIl(e.target.value); setSonuc(null); }}
            className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">İl seçin…</option>
            {Object.keys(ILLER).sort().map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Arazi türü */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Arazi Türü</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(ARAZI_TURLERI).map(([k, v]) => (
            <button
              key={k}
              onClick={() => { setArazi(k); setSonuc(null); }}
              className={`rounded-xl border px-3 py-2 text-xs font-medium text-left transition-all ${
                arazi === k
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              }`}
            >
              {v.etiket}
            </button>
          ))}
        </div>
      </div>

      {/* Dekar */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Alan (Dekar)</label>
        <input
          type="number"
          value={dekar}
          onChange={e => { setDekar(e.target.value); setSonuc(null); }}
          placeholder="Örn: 50"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <button
        onClick={hesapla}
        disabled={!il || !dekar}
        className="w-full rounded-xl bg-primary text-primary-foreground py-3.5 font-semibold text-sm disabled:opacity-40 transition-all active:scale-95"
      >
        Değeri Hesapla
      </button>

      {sonuc && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tahmini Piyasa Değeri</p>
          <p className="text-3xl font-bold text-primary">{fmt(sonuc.orta)} ₺</p>
          <p className="text-sm text-muted-foreground">
            Aralık: <span className="font-medium text-foreground">{fmt(sonuc.min)} ₺ – {fmt(sonuc.max)} ₺</span>
          </p>
          <div className="pt-1 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
            📍 {il} | {ARAZI_TURLERI[arazi].etiket} | {dekar} dekar ({parseFloat(dekar) * 1000} m²)
          </div>
          <button
            onClick={paylas}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary text-primary py-2.5 text-sm font-semibold hover:bg-primary/10 transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? "Kopyalandı! Paylaşabilirsin 🎉" : "Paylaş / Kopyala"}
          </button>
          <p className="text-[10px] text-center text-muted-foreground">
            * Tahmini değerdir. Gerçek piyasa fiyatları değişkenlik gösterebilir.
          </p>
        </div>
      )}
    </div>
  );
}

// ------- ÜRÜN KAR HESAP -------
function UrunKarHesap() {
  const [urun, setUrun] = useState("Buğday");
  const [alan, setAlan] = useState("");
  const [verim, setVerim] = useState("");
  const [satisFiyat, setSatisFiyat] = useState("");
  const [uretimMaliyet, setUretimMaliyet] = useState("");
  const [sonuc, setSonuc] = useState<null | {
    toplamUretim: number; gelir: number; maliyet: number;
    kar: number; karOrani: number; dekarKar: number;
  }>(null);
  const [copied, setCopied] = useState(false);

  const preset = URUNLER[urun];

  const doldur = () => {
    setVerim(String(preset.verim));
    setSatisFiyat(String(preset.fiyat));
    setUretimMaliyet(String(preset.maliyet));
  };

  const hesapla = () => {
    const a = parseFloat(alan);
    const v = parseFloat(verim);
    const sf = parseFloat(satisFiyat);
    const um = parseFloat(uretimMaliyet);
    if (!a || !v || !sf || !um) return;
    const toplamUretim = a * v;
    const gelir = toplamUretim * sf;
    const maliyet = a * um;
    const kar = gelir - maliyet;
    const karOrani = (kar / maliyet) * 100;
    const dekarKar = kar / a;
    setSonuc({ toplamUretim, gelir, maliyet, kar, karOrani, dekarKar });
  };

  const paylasMetni = () => {
    if (!sonuc) return "";
    const k = sonuc.kar >= 0 ? "✅ KAR" : "❌ ZARAR";
    return `📊 AgroLink Ürün Kar Hesaplama\n🌱 Ürün: ${urun} | ${alan} dekar\n📦 Üretim: ${fmt(sonuc.toplamUretim)} kg\n💸 Gelir: ${fmt(sonuc.gelir)} TL\n🔧 Maliyet: ${fmt(sonuc.maliyet)} TL\n${k}: ${fmt(Math.abs(sonuc.kar))} TL (%${sonuc.karOrani.toFixed(1)})\n\n#AgroLink #Tarım #ÇiftçiHesaplama`;
  };

  const paylas = async () => {
    const text = paylasMetni();
    if (navigator.share) {
      try { await navigator.share({ title: "Ürün Kar Hesaplama", text }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Ürün seç */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Ürün</label>
        <div className="relative">
          <select
            value={urun}
            onChange={e => { setUrun(e.target.value); setSonuc(null); }}
            className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.keys(URUNLER).map(u => <option key={u}>{u}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <button
          onClick={doldur}
          className="text-xs text-primary underline underline-offset-2"
        >
          Ortalama değerleri doldur ({preset.verim} {preset.birim}, {preset.fiyat} ₺/kg)
        </button>
      </div>

      {/* Alan */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Ekim Alanı (Dekar)</label>
        <input type="number" value={alan} onChange={e => { setAlan(e.target.value); setSonuc(null); }}
          placeholder="Örn: 20" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      {/* Verim */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Verim (kg/dekar)</label>
        <input type="number" value={verim} onChange={e => { setVerim(e.target.value); setSonuc(null); }}
          placeholder="Örn: 350" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Satış fiyatı */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Satış (₺/kg)</label>
          <input type="number" value={satisFiyat} onChange={e => { setSatisFiyat(e.target.value); setSonuc(null); }}
            placeholder="Örn: 9.5" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        {/* Maliyet */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Maliyet (₺/dekar)</label>
          <input type="number" value={uretimMaliyet} onChange={e => { setUretimMaliyet(e.target.value); setSonuc(null); }}
            placeholder="Örn: 2200" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <button
        onClick={hesapla}
        disabled={!alan || !verim || !satisFiyat || !uretimMaliyet}
        className="w-full rounded-xl bg-primary text-primary-foreground py-3.5 font-semibold text-sm disabled:opacity-40 transition-all active:scale-95"
      >
        Karı Hesapla
      </button>

      {sonuc && (
        <div className={`rounded-2xl border p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
          sonuc.kar >= 0 ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
        }`}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hesaplama Sonucu</p>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-[11px] text-muted-foreground">Toplam Üretim</p>
              <p className="text-lg font-bold">{fmt(sonuc.toplamUretim)} kg</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-[11px] text-muted-foreground">Toplam Gelir</p>
              <p className="text-lg font-bold text-green-600">{fmt(sonuc.gelir)} ₺</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-[11px] text-muted-foreground">Toplam Maliyet</p>
              <p className="text-lg font-bold text-red-500">{fmt(sonuc.maliyet)} ₺</p>
            </div>
            <div className={`rounded-xl p-3 border ${sonuc.kar >= 0 ? "border-green-500/40 bg-green-500/10" : "border-red-500/40 bg-red-500/10"}`}>
              <p className="text-[11px] text-muted-foreground">{sonuc.kar >= 0 ? "Net Kar" : "Net Zarar"}</p>
              <p className={`text-lg font-bold ${sonuc.kar >= 0 ? "text-green-600" : "text-red-500"}`}>
                {fmt(Math.abs(sonuc.kar))} ₺
              </p>
            </div>
          </div>

          <div className="flex gap-2 text-sm">
            <div className="flex-1 bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-[11px] text-muted-foreground">Kar Oranı</p>
              <p className={`font-bold ${sonuc.karOrani >= 0 ? "text-green-600" : "text-red-500"}`}>
                %{sonuc.karOrani.toFixed(1)}
              </p>
            </div>
            <div className="flex-1 bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-[11px] text-muted-foreground">Dekar Başı Kar</p>
              <p className={`font-bold ${sonuc.dekarKar >= 0 ? "text-green-600" : "text-red-500"}`}>
                {fmt(sonuc.dekarKar)} ₺
              </p>
            </div>
          </div>

          <button
            onClick={paylas}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary text-primary py-2.5 text-sm font-semibold hover:bg-primary/10 transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? "Kopyalandı! Paylaşabilirsin 🎉" : "Paylaş / Kopyala"}
          </button>
        </div>
      )}
    </div>
  );
}

// ------- ANA SAYFA -------
const CalculatorPage = () => {
  const [tab, setTab] = useState<"tarla" | "urun">("tarla");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Tarım Hesaplayıcı</h1>
            <p className="text-[11px] text-muted-foreground">Hesapla & paylaş</p>
          </div>
          <div className="ml-auto">
            <Sprout className="w-5 h-5 text-primary/60" />
          </div>
        </div>

        {/* Tab seçici */}
        <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2">
          <button
            onClick={() => setTab("tarla")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              tab === "tarla"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <span>🌾</span> Tarla Değeri
          </button>
          <button
            onClick={() => setTab("urun")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              tab === "urun"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Ürün Karı
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-5">
        {tab === "tarla" ? <TarlaHesap /> : <UrunKarHesap />}
      </div>

      <BottomNav />
    </div>
  );
};

export default CalculatorPage;
