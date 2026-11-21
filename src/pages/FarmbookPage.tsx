import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Download, BookOpen, BarChart3,
  Sprout, TrendingUp, TrendingDown, X, Loader2, ArrowLeft, Search
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import {
  getFarmbookRecords, createFarmbookRecord, updateFarmbookRecord,
  deleteFarmbookRecord, getFarmbookStats, exportFarmbook,
  FarmbookRecord
} from "@/lib/api";

const TYPES = [
  { value: "ekim",       label: "Ekim" },
  { value: "gubreleme",  label: "Gübreleme" },
  { value: "ilaclama",   label: "İlaçlama" },
  { value: "sulama",     label: "Sulama" },
  { value: "hasat",      label: "Hasat" },
  { value: "satis",      label: "Satış" },
  { value: "gider",      label: "Gider" },
  { value: "gelir",      label: "Gelir" },
  { value: "not",        label: "Not" },
];

const emptyRecord: FarmbookRecord = {
  title: "", type: "ekim", crop: "", field: "",
  amount: undefined, unit: "kg",
  cost: undefined, income: undefined,
  date: new Date().toISOString().slice(0, 10),
  note: "",
};

export default function FarmbookPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<FarmbookRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FarmbookRecord | null>(null);
  const [form, setForm] = useState<FarmbookRecord>(emptyRecord);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [r, s] = await Promise.all([getFarmbookRecords(), getFarmbookStats()]);
    setRecords(r.records || []);
    setStats(s);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyRecord); setModalOpen(true); };
  const openEdit = (r: FarmbookRecord) => {
    setEditing(r);
    setForm({ ...emptyRecord, ...r, date: (r.date || "").slice(0, 10) });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing?.id) await updateFarmbookRecord(editing.id, form);
      else await createFarmbookRecord(form);
      setModalOpen(false);
      await load();
    } finally { setSaving(false); }
  };

  const remove = async (id?: string) => {
    if (!id) return;
    if (!confirm("Bu kaydı silmek istediğine emin misin?")) return;
    await deleteFarmbookRecord(id);
    await load();
  };

  const onExport = async () => {
    const blob = await exportFarmbook();
    if (!blob) { alert("Dışa aktarılamadı."); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `farmbook-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterType && r.type !== filterType) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return [r.title, r.crop, r.field, r.note].some(x => (x || "").toLowerCase().includes(q));
    });
  }, [records, query, filterType]);

  const computed = useMemo(() => {
    const totalIncome = records.reduce((s, r) => s + (Number(r.income) || 0), 0);
    const totalCost   = records.reduce((s, r) => s + (Number(r.cost)   || 0), 0);
    return {
      totalIncome, totalCost, net: totalIncome - totalCost,
      count: records.length,
    };
  }, [records]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center gap-3 h-16 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-foreground leading-tight">Farmbook</h1>
              <p className="text-[11px] text-muted-foreground">Çiftliğinin dijital defteri</p>
            </div>
          </div>
          <button onClick={onExport} className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/70">
            <Download className="w-4 h-4" /> Dışa aktar
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-md hover:opacity-95">
            <Plus className="w-4 h-4" /> Ekle
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<BookOpen className="w-4 h-4" />} label="Kayıt" value={`${stats?.count ?? computed.count}`} />
          <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Toplam Gelir"
                    value={`${(stats?.totalIncome ?? computed.totalIncome).toLocaleString("tr-TR")} ₺`}
                    accent="text-emerald-600" />
          <StatCard icon={<TrendingDown className="w-4 h-4" />} label="Toplam Gider"
                    value={`${(stats?.totalCost ?? computed.totalCost).toLocaleString("tr-TR")} ₺`}
                    accent="text-rose-600" />
          <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Net"
                    value={`${(stats?.net ?? computed.net).toLocaleString("tr-TR")} ₺`}
                    accent={(stats?.net ?? computed.net) >= 0 ? "text-emerald-600" : "text-rose-600"} />
        </section>

        {/* Filters */}
        <section className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Başlık, ürün, tarla, not ara..."
              className="w-full pl-10 pr-3 h-11 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="h-11 rounded-2xl bg-card border border-border px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Tüm tipler</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </section>

        {/* List */}
        <section className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-card border border-dashed border-border">
              <Sprout className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-bold text-foreground">Henüz kayıt yok</p>
              <p className="text-sm text-muted-foreground mt-1">İlk çiftlik kaydını oluşturarak başla.</p>
              <button onClick={openCreate} className="mt-4 inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-primary text-primary-foreground font-semibold">
                <Plus className="w-4 h-4" /> Kayıt ekle
              </button>
            </div>
          ) : (
            filtered.map(r => <RecordCard key={r.id} r={r} onEdit={() => openEdit(r)} onDelete={() => remove(r.id)} />)
          )}
        </section>
      </main>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => !saving && setModalOpen(false)}>
          <div className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
              <h2 className="font-extrabold text-foreground">{editing ? "Kaydı Düzenle" : "Yeni Kayıt"}</h2>
              <button onClick={() => setModalOpen(false)} className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <Field label="Başlık">
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="ag-input" placeholder="Örn: Buğday hasadı" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tip">
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="ag-input">
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Tarih">
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="ag-input" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ürün"><input value={form.crop || ""} onChange={e => setForm({ ...form, crop: e.target.value })} className="ag-input" placeholder="Buğday" /></Field>
                <Field label="Tarla / Parsel"><input value={form.field || ""} onChange={e => setForm({ ...form, field: e.target.value })} className="ag-input" placeholder="Doğu tarla" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Miktar"><input type="number" value={form.amount ?? ""} onChange={e => setForm({ ...form, amount: e.target.value === "" ? undefined : Number(e.target.value) })} className="ag-input" placeholder="0" /></Field>
                <Field label="Birim">
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="ag-input">
                    {["kg","ton","lt","adet","dönüm","saat"].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Gider (₺)"><input type="number" value={form.cost ?? ""} onChange={e => setForm({ ...form, cost: e.target.value === "" ? undefined : Number(e.target.value) })} className="ag-input" /></Field>
                <Field label="Gelir (₺)"><input type="number" value={form.income ?? ""} onChange={e => setForm({ ...form, income: e.target.value === "" ? undefined : Number(e.target.value) })} className="ag-input" /></Field>
              </div>
              <Field label="Not">
                <textarea value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} className="ag-input min-h-[90px]" placeholder="Detaylı notlar..." />
              </Field>
            </div>
            <div className="p-4 border-t border-border sticky bottom-0 bg-card flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 h-11 rounded-2xl bg-secondary font-semibold">Vazgeç</button>
              <button onClick={submit} disabled={saving || !form.title.trim()} className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ag-input{width:100%;background:hsl(var(--secondary));border:1px solid hsl(var(--border));border-radius:14px;padding:10px 12px;font-size:14px;color:hsl(var(--foreground));outline:none}
        .ag-input:focus{box-shadow:0 0 0 2px hsl(var(--primary)/.4)}
      `}</style>

      <BottomNav />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-1 text-lg font-extrabold ${accent || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function RecordCard({ r, onEdit, onDelete }: { r: FarmbookRecord; onEdit: () => void; onDelete: () => void }) {
  const typeLabel = TYPES.find(t => t.value === r.type)?.label || r.type || "Kayıt";
  return (
    <article className="rounded-2xl bg-card border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-green-600/15 ring-1 ring-emerald-500/30 flex items-center justify-center text-emerald-600">
          <Sprout className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-foreground truncate">{r.title}</h3>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-secondary text-foreground">{typeLabel}</span>
            {r.date && <span className="text-[11px] text-muted-foreground">{new Date(r.date).toLocaleDateString("tr-TR")}</span>}
          </div>
          <div className="mt-1 text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
            {r.crop && <span>🌾 {r.crop}</span>}
            {r.field && <span>📍 {r.field}</span>}
            {r.amount != null && <span>⚖️ {r.amount} {r.unit}</span>}
            {!!r.cost && <span className="text-rose-600 font-semibold">− {Number(r.cost).toLocaleString("tr-TR")} ₺</span>}
            {!!r.income && <span className="text-emerald-600 font-semibold">+ {Number(r.income).toLocaleString("tr-TR")} ₺</span>}
          </div>
          {r.note && <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{r.note}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <button onClick={onEdit} className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center" aria-label="Düzenle"><Pencil className="w-4 h-4" /></button>
          <button onClick={onDelete} className="w-9 h-9 rounded-full hover:bg-rose-500/10 text-rose-600 flex items-center justify-center" aria-label="Sil"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </article>
  );
}
