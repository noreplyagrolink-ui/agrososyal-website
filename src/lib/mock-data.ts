export type Video = {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: number;
  uploadedAt: string;
  channelId: string;
  category: string;
  description: string;
  likes: number;
};

export type Channel = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  subscribers: number;
  verified: boolean;
  ceo: boolean;
  description: string;
};

export type Comment = {
  id: string;
  videoId: string;
  author: string;
  avatar: string;
  text: string;
  likes: number;
  time: string;
};

const grad = (a: string, b: string, label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='640' height='360' fill='url(%23g)'/><text x='50%' y='52%' font-family='system-ui,sans-serif' font-size='44' font-weight='800' fill='white' text-anchor='middle' opacity='0.85'>${label}</text></svg>`
  )}`;

const avatar = (a: string, b: string, letter: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(%23g)'/><text x='50%' y='58%' font-family='system-ui,sans-serif' font-size='44' font-weight='700' fill='white' text-anchor='middle'>${letter}</text></svg>`
  )}`;

export const channels: Channel[] = [
  { id: "c1", name: "Nebula Studio", handle: "@nebula", avatar: avatar("#ff5f6d", "#ffc371", "N"), banner: grad("#ff5f6d", "#ffc371", "Nebula Studio"), subscribers: 1240000, verified: true, ceo: true, description: "Sinematik kısa filmler ve görsel deneyler." },
  { id: "c2", name: "Pixel Forge", handle: "@pixelforge", avatar: avatar("#7f00ff", "#e100ff", "P"), banner: grad("#7f00ff", "#e100ff", "Pixel Forge"), subscribers: 542000, verified: true, ceo: false, description: "Oyun geliştirme, motor içi sanatlar, dev-log." },
  { id: "c3", name: "Lo-Fi Atlas", handle: "@lofiatlas", avatar: avatar("#06beb6", "#48b1bf", "L"), banner: grad("#06beb6", "#48b1bf", "Lo-Fi Atlas"), subscribers: 980000, verified: false, ceo: false, description: "Çalışma ve odak için kürate edilmiş lo-fi setleri." },
  { id: "c4", name: "Orbital Cooks", handle: "@orbitalcooks", avatar: avatar("#f7971e", "#ffd200", "O"), banner: grad("#f7971e", "#ffd200", "Orbital Cooks"), subscribers: 312000, verified: false, ceo: false, description: "Dünya mutfaklarından modern tarifler." },
  { id: "c5", name: "Voyage Bytes", handle: "@voyage", avatar: avatar("#11998e", "#38ef7d", "V"), banner: grad("#11998e", "#38ef7d", "Voyage Bytes"), subscribers: 2100000, verified: true, ceo: true, description: "Gezgin gözünden şehir vlogları." },
  { id: "c6", name: "Quanta Labs", handle: "@quanta", avatar: avatar("#3a1c71", "#ffaf7b", "Q"), banner: grad("#3a1c71", "#ffaf7b", "Quanta Labs"), subscribers: 88000, verified: false, ceo: false, description: "Bilim, fizik, kuantum üzerine eğlenceli içerikler." },
];

const titles = [
  "Geleceğin Şehirleri: 2050'de Hayat",
  "8 Saatlik Lo-Fi Çalışma Seti",
  "Unreal Engine 5 ile Sinematik Sahne",
  "Tokyo Sokaklarında 24 Saat",
  "Kuantum Dolanıklık 10 Dakikada",
  "Evde Profesyonel Ramen Yapımı",
  "Yapay Zekanın Sanata Etkisi",
  "Reykjavik'te Kuzey Işıkları Avı",
  "Pixel Art Karakter Animasyonu",
  "Mars'a İlk Adım: Simülasyon",
  "Minimalist Daire Turu",
  "Synthwave Albümü Stüdyo Kaydı",
  "Drone ile İsviçre Alpleri",
  "Retro Konsol Tamiri",
  "Sokak Fotoğrafçılığı İpuçları",
  "Espresso Bilimi: Mükemmel Krema",
  "Açık Deniz Yelken Macerası",
  "Üç Akorda Şarkı Yazımı",
];

const categories = ["Tümü", "Müzik", "Oyun", "Yemek", "Bilim", "Seyahat", "Sanat", "Teknoloji", "Sinema", "Lo-Fi"];
export const CATEGORIES = categories;

const colorPairs: [string, string][] = [
  ["#ff5f6d", "#ffc371"], ["#7f00ff", "#e100ff"], ["#06beb6", "#48b1bf"],
  ["#f7971e", "#ffd200"], ["#11998e", "#38ef7d"], ["#3a1c71", "#ffaf7b"],
  ["#ee0979", "#ff6a00"], ["#2193b0", "#6dd5ed"], ["#cc2b5e", "#753a88"],
  ["#42275a", "#734b6d"], ["#16a085", "#f4d03f"], ["#603813", "#b29f94"],
];

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000 ? `${(n / 1_000).toFixed(1)}B` : `${n}`;

export const formatCount = fmt;

// Pure deterministic hash (no module-scope state) so SSR and client compute identical values.
const hash = (i: number, salt: number) => {
  let x = (i + 1) * 2654435761 + salt * 40503;
  x = ((x ^ (x >>> 13)) * 1274126177) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

export const videos: Video[] = titles.map((title, i) => {
  const ch = channels[i % channels.length];
  const [a, b] = colorPairs[i % colorPairs.length];
  const views = Math.floor(hash(i, 1) * 5_000_000) + 10_000;
  const mins = Math.floor(hash(i, 2) * 28) + 2;
  const secs = Math.floor(hash(i, 3) * 59).toString().padStart(2, "0");
  return {
    id: `v${i + 1}`,
    title,
    thumbnail: grad(a, b, title.slice(0, 22)),
    duration: `${mins}:${secs}`,
    views,
    uploadedAt: `${Math.floor(hash(i, 4) * 11) + 1} ${["gün", "hafta", "ay"][i % 3]} önce`,
    channelId: ch.id,
    category: categories[(i % (categories.length - 1)) + 1],
    description: "Bu video; kavramı görselleştiren, akıcı bir anlatım sunan ve topluluğun en sevdiği temalardan birini ele alan kürate bir içeriktir.",
    likes: Math.floor(views * (0.04 + hash(i, 5) * 0.06)),
  };
});

export const shorts: Video[] = Array.from({ length: 8 }).map((_, i) => {
  const [a, b] = colorPairs[(i + 3) % colorPairs.length];
  const ch = channels[i % channels.length];
  return {
    id: `s${i + 1}`,
    title: ["Hızlı Tarif", "60 Saniyede Fizik", "Pixel Tip", "Şehir Anı", "Akor Hilesi", "Drone Görüntüsü", "Espresso", "Sahne Arkası"][i],
    thumbnail: grad(a, b, "#Short"),
    duration: "0:45",
    views: Math.floor(hash(i, 99) * 800_000) + 50_000,
    uploadedAt: `${i + 1} gün önce`,
    channelId: ch.id,
    category: "Shorts",
    description: "Kısa form içerik.",
    likes: 12000,
  };
});

export const comments: Comment[] = [
  { id: "k1", videoId: "v1", author: "Eren K.", avatar: avatar("#ff5f6d", "#ffc371", "E"), text: "Görsellik nefes kesici, müzik seçimi de muhteşem!", likes: 234, time: "2 gün önce" },
  { id: "k2", videoId: "v1", author: "Mira S.", avatar: avatar("#7f00ff", "#e100ff", "M"), text: "8:42'deki geçiş bambaşka bir seviye.", likes: 89, time: "1 gün önce" },
  { id: "k3", videoId: "v1", author: "Deniz Y.", avatar: avatar("#06beb6", "#48b1bf", "D"), text: "İzleo'da keşfettiğim en iyi kanal.", likes: 56, time: "12 saat önce" },
  { id: "k4", videoId: "v1", author: "Arda T.", avatar: avatar("#11998e", "#38ef7d", "A"), text: "Bir sonraki bölüm ne zaman?", likes: 12, time: "3 saat önce" },
];

export const getChannel = (id: string) => channels.find((c) => c.id === id)!;
export const getVideo = (id: string) => [...videos, ...shorts].find((v) => v.id === id);
export const videosByChannel = (id: string) => videos.filter((v) => v.channelId === id);