// ============================================================
//  AgroLink AI — GPT benzeri sohbet arayüzü
//  Backend: http://78.135.85.44:8080 (llama.cpp OpenAI uyumlu)
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Loader2, Trash2, Plus, Sprout, Bot, User,
  ChevronLeft, Wifi, WifiOff, Mic, Square,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { safeStorage } from "@/lib/security";
import DiseaseDetector from "@/components/DiseaseDetector";

const AI_BASE = "http://78.135.85.44:8080";

const SYSTEM_PROMPT = `Sen AgroLink'in tarım yapay zeka asistanısın. Adın "AgroBot". Türkçe konuşursun.
Uzmanlık alanların: bitkisel üretim, hayvansal üretim, toprak verimliliği, sulama, gübre, tarımsal ilaçlar, hasat, pazarlama, hava durumu etkisi, zirai krediler, tarım sigortası.
Her zaman pratik ve anlaşılır cevaplar ver. Çiftçilere ve tarım meraklılarına yönelik konuş.
Bilmediğin şeyleri söyle, uydurma. Tarım dışı konularda nazikçe tarıma yönlendir.`;

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
  image?: string; // base64 for vision
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function newSession(): ChatSession {
  return { id: genId(), title: "Yeni Sohbet", messages: [], createdAt: Date.now() };
}

// ---------- Streaming fetch ----------
async function streamChat(
  messages: { role: string; content: any }[],
  onToken: (token: string) => void,
  onDone: () => void,
  signal: AbortSignal
) {
  const res = await fetch(`http://78.135.85.44:8080/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model: "llama",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) throw new Error(`AI sunucu hatası: ${res.status}`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") { onDone(); return; }
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) onToken(delta);
      } catch {}
    }
  }
  onDone();
}

// ---------- Mesaj balonları ----------
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} mb-4`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${
        isUser ? "bg-primary" : "bg-emerald-600"
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Balon */}
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {msg.image && (
          <img src={msg.image} alt="Fotoğraf" className="rounded-xl max-h-48 object-cover mb-1 border border-border" />
        )}
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border text-foreground rounded-tl-sm"
        }`}>
          {msg.content || <span className="animate-pulse">▌</span>}
        </div>
        <span className="text-[10px] text-muted-foreground px-1">
          {new Date(msg.ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ---------- ANA SAYFA ----------
const AIPage = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>(() =>
    safeStorage.get<ChatSession[]>("ai_sessions", [])
  );
  const [activeId, setActiveId] = useState<string>(() => {
    const saved = safeStorage.get<string>("ai_active", "");
    return saved || "";
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [online, setOnline] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showDisease, setShowDisease] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Aktif session
  const activeSession = sessions.find((s) => s.id === activeId);

  // Sunucu sağlık kontrolü
  useEffect(() => {
    fetch("http://78.135.85.44:8080/health").then(() => setOnline(true)).catch(() => setOnline(false));
  }, []);

  // localStorage senkronizasyonu
  useEffect(() => {
    safeStorage.set("ai_sessions", sessions.slice(0, 20)); // max 20 sohbet
  }, [sessions]);

  useEffect(() => {
    safeStorage.set("ai_active", activeId);
  }, [activeId]);

  // Otomatik aşağı kaydır
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  // ------ Yeni sohbet ------
  const createSession = () => {
    const s = newSession();
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setShowSidebar(false);
  };

  // ------ Sohbet sil ------
  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) setActiveId("");
  };

  // ------ Mesaj gönder ------
  const sendMessage = useCallback(async (text: string, imageBase64?: string) => {
    if (!text.trim() && !imageBase64) return;
    if (streaming) return;

    // Session yoksa oluştur
    let sessionId = activeId;
    let currentSessions = sessions;

    if (!sessionId || !sessions.find((s) => s.id === sessionId)) {
      const s = newSession();
      currentSessions = [s, ...sessions];
      setSessions(currentSessions);
      sessionId = s.id;
      setActiveId(s.id);
    }

    // Kullanıcı mesajı ekle
    const userMsg: Message = {
      id: genId(),
      role: "user",
      content: text.trim(),
      ts: Date.now(),
      image: imageBase64,
    };

    // İlk mesajdan başlık oluştur
    const isFirstMsg = (currentSessions.find((s) => s.id === sessionId)?.messages.length ?? 0) === 0;
    const title = isFirstMsg
      ? text.slice(0, 35) + (text.length > 35 ? "…" : "")
      : undefined;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, userMsg], ...(title ? { title } : {}) }
          : s
      )
    );
    setInput("");
    setStreaming(true);

    // Bot cevabı (boş başlar, stream ile dolar)
    const botMsg: Message = { id: genId(), role: "assistant", content: "", ts: Date.now() };
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, messages: [...s.messages, botMsg] } : s
      )
    );

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // API için mesaj geçmişini hazırla
    const session = currentSessions.find((s) => s.id === sessionId)!;
    const apiMessages = [...session.messages, userMsg].map((m) => ({
      role: m.role,
      content: m.image
        ? [
            { type: "image_url", image_url: { url: m.image } },
            { type: "text", text: m.content || "Bu bitkide hastalık/sorun var mı? Analiz et." },
          ]
        : m.content,
    }));

    try {
      await streamChat(
        apiMessages,
        (token) => {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === botMsg.id ? { ...m, content: m.content + token } : m
                    ),
                  }
                : s
            )
          );
        },
        () => setStreaming(false),
        ctrl.signal
      );
    } catch (err: any) {
      if (err.name === "AbortError") {
        // İptal edildi
      } else {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === botMsg.id
                      ? { ...m, content: "⚠️ AI sunucusuna bağlanılamadı. Sunucu kapalı olabilir." }
                      : m
                  ),
                }
              : s
          )
        );
      }
      setStreaming(false);
    }
  }, [activeId, sessions, streaming]);

  // ------ Enter ile gönder ------
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ------ Stop streaming ------
  const stopStream = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  // ------ Textarea auto-resize ------
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Disease Detector Modal */}
      {showDisease && (
        <DiseaseDetector
          onClose={() => setShowDisease(false)}
          onResult={(imgBase64, text) => {
            setShowDisease(false);
            sendMessage(text || "Bu bitkide hastalık var mı? Detaylı analiz yap.", imgBase64);
          }}
        />
      )}

      {/* Sidebar (session listesi) */}
      {showSidebar && (
        <div
          className="fixed inset-0 z-50 flex"
          onClick={() => setShowSidebar(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-card border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <span className="font-bold text-sm">Sohbetler</span>
              </div>
              <button
                onClick={createSession}
                className="flex items-center gap-1 text-xs text-primary border border-primary rounded-lg px-2 py-1"
              >
                <Plus className="w-3 h-3" /> Yeni
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-8">Henüz sohbet yok</p>
              )}
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => { setActiveId(s.id); setShowSidebar(false); }}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer group transition-all ${
                    s.id === activeId ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.messages.length} mesaj
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSidebar(true)}
            className="flex items-center gap-2 flex-1"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm leading-tight">AgroBot</p>
              <p className="text-[10px] text-muted-foreground">
                {activeSession?.title || "Tarım AI Asistanı"}
              </p>
            </div>
          </button>

          {/* Durum */}
          <div className="flex items-center gap-2">
            {online
              ? <Wifi className="w-4 h-4 text-emerald-500" />
              : <WifiOff className="w-4 h-4 text-red-500" />}
            <button
              onClick={createSession}
              className="p-1.5 rounded-xl hover:bg-muted"
              title="Yeni sohbet"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 pt-4">
        {/* Hoş geldin ekranı */}
        {(!activeSession || activeSession.messages.length === 0) && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center">
              <Sprout className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-xl">AgroBot'a Hoş Geldiniz</h2>
              <p className="text-sm text-muted-foreground mt-1">Tarım sorunlarınızı sorun, fotoğraf gönderin</p>
            </div>
            {/* Örnek sorular */}
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {[
                "🌾 Buğday sararmışsa ne yapmalı?",
                "🐛 Yapraklarda delikler var, ilaç öner",
                "💧 Damla sulama nasıl kurulur?",
                "📈 Fındık fiyatları ne zaman artar?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left rounded-xl border border-border bg-card px-4 py-3 text-sm hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDisease(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-all"
            >
              📸 Bitki Fotoğrafı ile Hastalık Teşhisi
            </button>
          </div>
        )}

        {/* Mesaj listesi */}
        {activeSession?.messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input alanı */}
      <div className="sticky bottom-16 left-0 right-0 glass border-t border-border">
        <div className="max-w-lg mx-auto px-3 py-3 flex items-end gap-2">
          {/* Fotoğraf butonu */}
          <button
            onClick={() => setShowDisease(true)}
            className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-600 border border-emerald-600/20 flex-shrink-0 hover:bg-emerald-600/20 transition-all"
            title="Bitki fotoğrafı"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Tarım sorunuzu yazın…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary max-h-32 min-h-[42px]"
            style={{ height: "42px" }}
          />

          {/* Gönder / Durdur */}
          {streaming ? (
            <button
              onClick={stopStream}
              className="p-2.5 rounded-xl bg-red-500 text-white flex-shrink-0"
            >
              <Square className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="p-2.5 rounded-xl bg-primary text-primary-foreground flex-shrink-0 disabled:opacity-40 transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
        {!online && (
          <p className="text-center text-[10px] text-red-500 pb-1">
            ⚠️ AI sunucusuna bağlanılamıyor (78.135.85.44:8080)
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AIPage;

