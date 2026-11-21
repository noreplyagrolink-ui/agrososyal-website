// ============================================================
//  DiseaseDetector — Bitki Hastalığı Teşhis Modalı
//  Fotoğraf yükle → llama.cpp vision API'sine gönder
// ============================================================

import { useState, useRef } from "react";
import { X, Camera, Upload, Loader2, Leaf, AlertTriangle } from "lucide-react";
import { validateFileType, validateFileSize } from "@/lib/security";
import DiseaseAlarmModal from "./DiseaseAlarmModal";

interface Props {
  onClose: () => void;
  onResult: (imageBase64: string, userText: string) => void;
}

const QUICK_QUESTIONS = [
  "Bu bitkide hastalık var mı?",
  "Yaprakta ne sorun var, nasıl tedavi edilir?",
  "Bu zararlı böcek mü? İlaçlama önerir misin?",
  "Meyvelerde bu renk değişikliği neden?",
  "Toprak yüzeyindeki bu görünüm normal mi?",
];

const DiseaseDetector = ({ onClose, onResult }: Props) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [question, setQuestion] = useState(QUICK_QUESTIONS[0]);
  const [error, setError] = useState("");
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [lastDiseaseResult, setLastDiseaseResult] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // ------ Dosya yükle ------
  const loadFile = (file: File) => {
    setError("");
    if (!validateFileType(file, ["image/jpeg", "image/png", "image/webp", "image/gif"])) {
      setError("Sadece JPG, PNG veya WEBP formatı desteklenir.");
      return;
    }
    if (!validateFileSize(file, 8)) {
      setError("Fotoğraf 8 MB'den küçük olmalı.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setImgSrc(e.target?.result as string);
    reader.readAsDataURL(file);
    setImgFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
  };

  // Sürükle bırak
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  };

  // ------ Analiz Başlat ------
  const handleAnalyze = () => {
    if (!imgSrc) return;
    // Soruyu lastDiseaseResult olarak sakla; AI yanıtı dışarıdan onResult callback'i ile gelecek
    setLastDiseaseResult(question);
    onResult(imgSrc, question);
  };

  return (
    <>
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-base">Hastalık Teşhisi</h3>
              <p className="text-[11px] text-muted-foreground">Bitki fotoğrafı yükle, AI analiz etsin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Upload alanı */}
          {!imgSrc ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-2xl p-8 text-center space-y-4 hover:border-emerald-500/50 transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <Camera className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Fotoğraf Ekle</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sürükle bırak veya seç</p>
              </div>

              <div className="flex gap-3 justify-center">
                {/* Galeri */}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted transition-all"
                >
                  <Upload className="w-4 h-4" /> Galerim
                </button>
                {/* Kamera */}
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-all"
                >
                  <Camera className="w-4 h-4" /> Kamera
                </button>
              </div>

              <p className="text-[10px] text-muted-foreground">JPG, PNG, WEBP · Maks 8MB</p>
            </div>
          ) : (
            /* Önizleme */
            <div className="relative rounded-2xl overflow-hidden">
              <img src={imgSrc} alt="Bitki" className="w-full max-h-64 object-cover" />
              <button
                onClick={() => { setImgSrc(null); setImgFile(null); }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-white text-xs font-medium">✅ Fotoğraf hazır</p>
              </div>
            </div>
          )}

          {/* Hata */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-600">
              ⚠️ {error}
            </div>
          )}

          {/* Soru seçimi */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ne sormak istiyorsunuz?</label>
            <div className="space-y-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className={`w-full text-left rounded-xl border px-3.5 py-2.5 text-sm transition-all ${
                    question === q
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-border bg-card text-foreground hover:border-emerald-500/40"
                  }`}
                >
                  {question === q && "✓ "}{q}
                </button>
              ))}
              {/* Özel soru */}
              <textarea
                value={QUICK_QUESTIONS.includes(question) ? "" : question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Veya özel soru yazın…"
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Analiz butonu */}
          <button
            onClick={handleAnalyze}
            disabled={!imgSrc}
            className="w-full rounded-xl bg-emerald-600 text-white py-3.5 font-semibold text-sm disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Leaf className="w-4 h-4" />
            AI ile Analiz Et
          </button>

          {/* Bölge Alarmı butonu — fotoğraf seçilince aktif */}
          <button
            onClick={() => setShowAlarmModal(true)}
            disabled={!imgSrc}
            className="w-full rounded-xl border border-red-500/50 bg-red-500/8 text-red-600 dark:text-red-400 py-3 font-semibold text-sm disabled:opacity-30 transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-red-500/15"
          >
            <AlertTriangle className="w-4 h-4" />
            Bölge Alarmı Gönder
          </button>

          <p className="text-[10px] text-center text-muted-foreground">
            🤖 Llama.cpp vision modeli kullanılır. Sonuçlar referans amaçlıdır,
            kesin teşhis için ziraat mühendisine danışın.
          </p>
        </div>

        {/* Gizli input'lar */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>

    {/* Bölge Alarm Modalı */}
    {showAlarmModal && (
      <DiseaseAlarmModal
        diseaseResult={lastDiseaseResult || question}
        imageBase64={imgSrc ?? undefined}
        onClose={() => setShowAlarmModal(false)}
      />
    )}
  </>
  );
};

export default DiseaseDetector;

