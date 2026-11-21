// Omni AI ile gönderi metnini seçilen duyguya/tona göre yeniden yazar.
const AI_URL = "https://sehitumitkestitarimmtal.com/agro-ai/api/v1/chat/completions";

export type ToneId = "friendly" | "funny" | "confident" | "formal" | "empathetic" | "excited" | "diplomatic" | "concise";

// Her ton için ortak kurallar + o tona özel sistem promptu
const COMMON_RULES = `Sen Agro Sosyal (çiftçi ve tarım topluluğu sosyal ağı) için çalışan bir yazım asistanısın.
Kullanıcı bir gönderi açıklaması yazdı. Görevin bu metni aşağıda belirtilen tonda yeniden yazmak.
KURALLAR:
- Metnin dilini koru (Türkçe ise Türkçe, İngilizce ise İngilizce yaz).
- Anlamı, olguları, sayıları, fiyatları, tarihleri, isimleri değiştirme; yeni bilgi UYDURMA.
- #hashtag, @bahsetme, bağlantı ve satır düzenini koru.
- Yalnızca yeniden yazılmış metni döndür. Açıklama, başlık, tırnak işareti, "İşte" gibi giriş cümlesi yazma.
- Sosyal medya gönderisine uygun, doğal ve akıcı yaz; en fazla 5000 karakter.`;

export const TONES: { id: ToneId; label: string; emoji: string; desc: string; prompt: string }[] = [
  {
    id: "friendly", label: "Samimi", emoji: "🤗", desc: "Daha sıcak ve arkadaşça yazar.",
    prompt: `${COMMON_RULES}
TON: SAMİMİ (Friendly). Metni sıcak, içten ve arkadaşça yaz; sanki yakın bir komşuya veya dostuna anlatıyormuşsun gibi. Gündelik, rahat bir dil kullan, "sen" hitabını tercih et. Gerekirse en fazla 1-2 uygun emoji ekle. Resmî kalıplardan ve soğuk ifadelerden kaçın.`,
  },
  {
    id: "funny", label: "Komik", emoji: "😄", desc: "Esprili ve eğlenceli yapar.",
    prompt: `${COMMON_RULES}
TON: KOMİK (Funny). Metni esprili, eğlenceli ve hafif şakacı hale getir; tarım/çiftçilik hayatından doğal bir mizah, kelime oyunu veya abartı kullanabilirsin. Mizah kimseyi küçümsemesin, aşağılamasın. Asıl mesaj anlaşılır kalsın. Gerekirse 1-3 emoji kullan.`,
  },
  {
    id: "confident", label: "Özgüvenli", emoji: "💪", desc: "Daha kendinden emin yazar.",
    prompt: `${COMMON_RULES}
TON: ÖZGÜVENLİ (Confident). Metni net, kararlı ve kendinden emin yaz. "belki", "sanırım", "galiba", "sadece" gibi çekingen ifadeleri çıkar; kısa ve güçlü cümleler kur, etken çatı kullan. Kibirli veya agresif olma, abartılı iddialar ekleme.`,
  },
  {
    id: "formal", label: "Resmî", emoji: "🎩", desc: "Kurumsal ve ciddi bir dil kullanır.",
    prompt: `${COMMON_RULES}
TON: RESMÎ (Formal). Metni kurumsal, ciddi ve saygılı bir dille yeniden yaz. Argo, kısaltma ve emoji kullanma. "Siz" hitabı ve düzgün, tam cümleler kullan. Profesyonel bir duyuru veya iş yazışması kıvamında olsun.`,
  },
  {
    id: "empathetic", label: "Empatik", emoji: "💚", desc: "Anlayışlı ve duyarlı yazar.",
    prompt: `${COMMON_RULES}
TON: EMPATİK (Empathetic). Metni anlayışlı, şefkatli ve duyarlı bir dille yaz. Okuyanın duygularını ve zorluklarını (kuraklık, zarar, maliyet gibi) dikkate al, destekleyici ve yargılamayan ifadeler kullan. Acıyan veya yapmacık bir hava verme; samimi ve sakin kal.`,
  },
  {
    id: "excited", label: "Heyecanlı", emoji: "🎉", desc: "Enerjik ve coşkulu yazar.",
    prompt: `${COMMON_RULES}
TON: HEYECANLI (Excited). Metni enerjik, coşkulu ve canlı yaz. Olumlu duyguyu öne çıkar, dinamik fiiller kullan, uygun yerlerde ünlem ve 1-3 emoji ekle. Aşırıya kaçıp tamamı BÜYÜK HARF yapma, her cümleye ünlem koyma.`,
  },
  {
    id: "diplomatic", label: "Diplomatik", emoji: "🕊️", desc: "Daha nazik ve uzlaşmacı yapar.",
    prompt: `${COMMON_RULES}
TON: DİPLOMATİK (Diplomatic). Metni nazik, dengeli ve uzlaşmacı yap. Sert, suçlayıcı veya kırıcı ifadeleri yumuşat; "sen şunu yaptın" yerine durumu ve ihtiyacı anlat. Karşı görüşe saygı göster, çatışma çıkarmadan fikrini net bir şekilde ilet. Fikrin özünü kaybetme.`,
  },
  {
    id: "concise", label: "Kısa", emoji: "✂️", desc: "Mesajı kısaltır.",
    prompt: `${COMMON_RULES}
TON: KISA (Concise). Metni anlamını kaybetmeden mümkün olduğunca kısalt. Tekrarları, dolgu sözleri ve gereksiz ayrıntıları at; asıl mesajı koru. Sonuç orijinalden belirgin şekilde kısa olmalı (genelde yarısı veya daha az). Ton nötr ve açık kalsın.`,
  },
];

export async function rewriteWithTone(
  text: string, tone: ToneId, signal: AbortSignal, onToken: (t: string) => void,
): Promise<void> {
  const t = TONES.find((x) => x.id === tone)!;
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      messages: [
        { role: "system", content: t.prompt },
        { role: "user", content: `Yeniden yazılacak metin:\n"""\n${text}\n"""` },
      ],
      stream: true,
      temperature: tone === "concise" ? 0.2 : 0.7,
      max_tokens: 1200,
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Çok fazla istek. Biraz bekleyip tekrar dene.");
    if (res.status === 503) throw new Error("Omni AI şu an meşgul. Birazdan tekrar dene.");
    throw new Error(`Omni AI hatası (${res.status})`);
  }
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const piece = JSON.parse(data).choices?.[0]?.delta?.content;
        if (piece) onToken(piece);
      } catch {}
    }
  }
}
