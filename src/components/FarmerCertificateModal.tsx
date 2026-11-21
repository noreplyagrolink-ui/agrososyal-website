// ============================================================
//  FarmerCertificateModal — Çiftçi Sertifika Başvurusu
//  Organik Çiftçi veya İyi Tarım Uzmanı rozeti için başvur
// ============================================================

import { useState, useEffect } from "react";
import { X, Award, Leaf, CheckCircle2, Loader2, HelpCircle, ChevronRight } from "lucide-react";
import {
  getFarmerCertificateStatus,
  applyFarmerCertificate,
  submitCertificateQuiz,
  getCertificateQuestions,
} from "@/lib/api";

interface Props {
  onClose: () => void;
  onCertified?: () => void;
}

type Step = "choose" | "quiz" | "pending" | "done";

const CERTIFICATE_TYPES = [
  {
    type: "organik_ciftci" as const,
    title: "Organik Çiftçi Sertifikası",
    icon: Leaf,
    color: "emerald",
    desc: "Organik tarım pratiği içerikler paylaş, topluluk oylamasıyla kazan.",
    requirement: "En az 10 içerik + 50 topluluk onay oyu",
  },
  {
    type: "iyi_tarim_uzmani" as const,
    title: "İyi Tarım Uzmanı",
    icon: Award,
    color: "amber",
    desc: "Tarım bilgi testini başarıyla tamamla, uzman rozetini kazan.",
    requirement: "Bilgi testinden %70 ve üzeri puan",
  },
];

const FarmerCertificateModal = ({ onClose, onCertified }: Props) => {
  const [step, setStep] = useState<Step>("choose");
  const [selectedType, setSelectedType] = useState<"organik_ciftci" | "iyi_tarim_uzmani" | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizIdx, setQuizIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getFarmerCertificateStatus().then(setStatus).catch(() => {});
  }, []);

  const handleApply = async (type: "organik_ciftci" | "iyi_tarim_uzmani") => {
    setSelectedType(type);
    setError("");

    if (type === "iyi_tarim_uzmani") {
      setLoading(true);
      try {
        const data = await getCertificateQuestions();
        setQuestions(data.questions || []);
        setStep("quiz");
      } catch {
        setError("Sorular yüklenemedi, tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const res = await applyFarmerCertificate(type);
        if (res.certificate) {
          setResult(res);
          setStep("done");
          onCertified?.();
        } else {
          setResult(res);
          setStep("pending");
        }
      } catch (e: any) {
        setError(e?.message || "Başvuru gönderilemedi.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAnswer = (qId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: answer }));
  };

  const handleSubmitQuiz = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await submitCertificateQuiz(answers);
      setResult(res);
      if (res.passed) {
        setStep("done");
        onCertified?.();
      } else {
        setStep("pending");
      }
    } catch (e: any) {
      setError(e?.message || "Test gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const currentQ = questions[quizIdx];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-base">Çiftçi Sertifikası</h3>
              <p className="text-[11px] text-muted-foreground">Profilinde görünen onaylı rozet kazan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto">

          {/* ── ADIM: Seçim ── */}
          {step === "choose" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Hangi sertifikaya başvurmak istiyorsun? Her biri profil sayfanda ve ürün satışlarında güven rozeti olarak görünür.
              </p>
              {CERTIFICATE_TYPES.map((cert) => {
                const Icon = cert.icon;
                const owned = status?.certificates?.includes(cert.type);
                const pending = status?.pending?.includes(cert.type);
                return (
                  <button
                    key={cert.type}
                    onClick={() => !owned && !pending && handleApply(cert.type)}
                    disabled={owned || pending || loading}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${
                      owned
                        ? "border-emerald-500/40 bg-emerald-500/5 opacity-70"
                        : pending
                        ? "border-amber-500/40 bg-amber-500/5 opacity-70"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted active:scale-[.98]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        cert.color === "emerald" ? "bg-emerald-500/10" : "bg-amber-500/10"
                      }`}>
                        <Icon className={`w-5 h-5 ${cert.color === "emerald" ? "text-emerald-600" : "text-amber-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{cert.title}</p>
                          {owned && <span className="text-[10px] text-emerald-600 font-bold">✓ KAZANILDI</span>}
                          {pending && <span className="text-[10px] text-amber-600 font-bold">⏳ BEKLİYOR</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{cert.desc}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">📋 {cert.requirement}</p>
                      </div>
                      {!owned && !pending && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-3" />}
                    </div>
                  </button>
                );
              })}
              {error && (
                <p className="text-sm text-red-500 text-center">⚠️ {error}</p>
              )}
            </div>
          )}

          {/* ── ADIM: Quiz ── */}
          {step === "quiz" && currentQ && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Soru {quizIdx + 1} / {questions.length}
                </span>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i < quizIdx ? "bg-emerald-500" : i === quizIdx ? "bg-primary" : "bg-border"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="flex gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{currentQ.question}</p>
                </div>
                <div className="space-y-2">
                  {currentQ.options.map((opt: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleAnswer(currentQ.id, opt)}
                      className={`w-full text-left rounded-xl border px-3.5 py-2.5 text-sm transition-all ${
                        answers[currentQ.id] === opt
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      {answers[currentQ.id] === opt && "✓ "}{opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {quizIdx > 0 && (
                  <button
                    onClick={() => setQuizIdx((i) => i - 1)}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-all"
                  >
                    ← Geri
                  </button>
                )}
                {quizIdx < questions.length - 1 ? (
                  <button
                    onClick={() => setQuizIdx((i) => i + 1)}
                    disabled={!answers[currentQ.id]}
                    className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-40 transition-all active:scale-95"
                  >
                    Sonraki →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={!allAnswered || loading}
                    className="flex-1 rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-semibold disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Testi Tamamla
                  </button>
                )}
              </div>
              {error && <p className="text-sm text-red-500 text-center">⚠️ {error}</p>}
            </div>
          )}

          {/* ── ADIM: Beklemede ── */}
          {step === "pending" && (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Award className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-lg">Başvuru Alındı!</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  {result?.message || "Başvurun topluluk oylamasına alındı. Yeterli onay oyuna ulaşınca rozet profiline eklenecek."}
                </p>
                {result?.score !== undefined && (
                  <p className="text-sm font-semibold mt-2 text-amber-600">
                    Test puanın: {result.score}% — Gerekli: %70
                  </p>
                )}
              </div>
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-foreground text-background font-semibold text-sm active:scale-95 transition-all">
                Tamam
              </button>
            </div>
          )}

          {/* ── ADIM: Başarılı ── */}
          {step === "done" && (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-lg text-emerald-600">🎉 Tebrikler!</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  {result?.message || "Sertifikan onaylandı! Rozet profilinde ve paylaşımlarında görünmeye başladı."}
                </p>
              </div>
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm active:scale-95 transition-all">
                Harika!
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default FarmerCertificateModal;

