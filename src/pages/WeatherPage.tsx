import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, Wind, Droplets, Eye, Gauge, Sun, Sunrise, Sunset,
  CloudRain, CloudSnow, CloudSun, Cloud, Loader2, RefreshCw, Thermometer,
  Sparkles, AlertTriangle, BarChart3,
} from "lucide-react";

type CurrentWX = {
  temperature: number;
  apparent: number;
  humidity: number;
  wind: number;
  windDir: number;
  pressure: number;
  visibility: number;
  uv: number;
  code: number;
  isDay: boolean;
  sunrise: string;
  sunset: string;
};

const codeMap = (c: number): { label: string; Icon: typeof Sun } => {
  if ([0].includes(c)) return { label: "Açık", Icon: Sun };
  if ([1, 2].includes(c)) return { label: "Az bulutlu", Icon: CloudSun };
  if ([3].includes(c)) return { label: "Bulutlu", Icon: Cloud };
  if ([45, 48].includes(c)) return { label: "Sisli", Icon: Cloud };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(c))
    return { label: "Yağmurlu", Icon: CloudRain };
  if ([71, 73, 75, 77, 85, 86].includes(c)) return { label: "Karlı", Icon: CloudSnow };
  if ([95, 96, 99].includes(c)) return { label: "Fırtınalı", Icon: CloudRain };
  return { label: "Bilinmiyor", Icon: Cloud };
};

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "—";

const WeatherPage = () => {
  const navigate = useNavigate();
  const [coords, setCoords] = useState<{ lat: number; lon: number; city?: string } | null>(null);
  const [data, setData] = useState<CurrentWX | null>(null);
  const [hourly, setHourly] = useState<{ time: string; temp: number; code: number }[]>([]);
  const [daily, setDaily] = useState<
    { date: string; min: number; max: number; code: number; pop: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [unit, setUnit] = useState<"metric" | "imperial">(() => {
    if (typeof window === "undefined") return "metric";
    return (localStorage.getItem("agro_wx_unit") as "metric" | "imperial") || "metric";
  });

  useEffect(() => {
    try { localStorage.setItem("agro_wx_unit", unit); } catch {}
  }, [unit]);

  const tempU = unit === "metric" ? "°C" : "°F";
  const windU = unit === "metric" ? "km/s" : "mph";
  const toT = (c: number) => unit === "metric" ? c : Math.round(c * 9 / 5 + 32);
  const toW = (k: number) => unit === "metric" ? k : Math.round(k * 0.621371);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      // Reverse geocode (best-effort)
      let city = "";
      try {
        const r = await fetch(
          `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=tr`
        );
        const j = await r.json();
        city = j?.results?.[0]?.name || "";
      } catch {}
      setCoords({ lat, lon, city });

      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code,is_day,uv_index` +
          `&hourly=temperature_2m,weather_code` +
          `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,sunrise,sunset` +
          `&timezone=auto&forecast_days=7`
      );
      const j = await r.json();
      const c = j.current || {};
      const d = j.daily || {};
      setData({
        temperature: Math.round(c.temperature_2m ?? 0),
        apparent: Math.round(c.apparent_temperature ?? 0),
        humidity: Math.round(c.relative_humidity_2m ?? 0),
        wind: Math.round(c.wind_speed_10m ?? 0),
        windDir: Math.round(c.wind_direction_10m ?? 0),
        pressure: Math.round(c.surface_pressure ?? 0),
        visibility: 10,
        uv: Math.round(c.uv_index ?? 0),
        code: c.weather_code ?? 0,
        isDay: !!c.is_day,
        sunrise: d.sunrise?.[0],
        sunset: d.sunset?.[0],
      });
      const now = new Date();
      const startIdx = (j.hourly?.time as string[])?.findIndex((t) => new Date(t) >= now) ?? 0;
      const hh = (j.hourly?.time as string[])?.slice(startIdx, startIdx + 12).map((t, i) => ({
        time: t,
        temp: Math.round(j.hourly.temperature_2m[startIdx + i]),
        code: j.hourly.weather_code[startIdx + i],
      })) || [];
      setHourly(hh);
      const dd = (d.time as string[])?.map((t: string, i: number) => ({
        date: t,
        min: Math.round(d.temperature_2m_min[i]),
        max: Math.round(d.temperature_2m_max[i]),
        code: d.weather_code[i],
        pop: d.precipitation_probability_max?.[i] ?? 0,
      })) || [];
      setDaily(dd);
    } catch (e: any) {
      setErr(e?.message?.includes("denied") ? "Konum izni verilmedi." : "Hava verisi alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wx = data ? codeMap(data.code) : null;
  const bgGradient = data?.isDay
    ? "linear-gradient(160deg, #0ea5e9 0%, #0284c7 35%, #1e3a8a 100%)"
    : "linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #334155 100%)";

  const chart = useMemo(() => {
    if (!daily.length) return null;
    const W = 600, H = 180, pad = 24;
    const allTemps = daily.flatMap(d => [d.min, d.max]);
    const minT = Math.min(...allTemps) - 2;
    const maxT = Math.max(...allTemps) + 2;
    const xStep = (W - pad * 2) / Math.max(1, daily.length - 1);
    const yFor = (t: number) => H - pad - ((t - minT) / (maxT - minT)) * (H - pad * 2);
    const xFor = (i: number) => pad + i * xStep;
    const maxPath = daily.map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(d.max)}`).join(" ");
    const minPath = daily.map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(d.min)}`).join(" ");
    const areaPath = `${maxPath} ${daily.slice().reverse().map((d, i) => `L ${xFor(daily.length - 1 - i)} ${yFor(d.min)}`).join(" ")} Z`;
    return { W, H, pad, xFor, yFor, maxPath, minPath, areaPath };
  }, [daily]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: bgGradient }}>
      {/* Aurora bloblar */}
      <motion.div
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-32 -right-24 w-[480px] h-[480px] rounded-full bg-white/10 blur-[120px]"
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="pointer-events-none absolute bottom-0 -left-20 w-[420px] h-[420px] rounded-full bg-cyan-300/20 blur-[110px]"
      />

      <div className="relative max-w-3xl mx-auto px-5 pt-5 pb-24 text-white">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-xl flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm font-medium opacity-90">
            <MapPin className="w-4 h-4" />
            <span>{coords?.city || "Konum"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex p-1 rounded-full bg-white/15 backdrop-blur-xl text-xs font-bold">
              {(["metric", "imperial"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`relative px-3 h-8 rounded-full transition ${unit === u ? "text-slate-900" : "text-white/80"}`}
                >
                  {unit === u && (
                    <motion.span layoutId="unitPill" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 400, damping: 28 }} />
                  )}
                  <span className="relative">{u === "metric" ? "°C" : "°F"}</span>
                </button>
              ))}
            </div>
            <button
              onClick={load}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-xl flex items-center justify-center active:scale-90 transition-transform"
              aria-label="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {loading && !data && (
            <motion.div
              key="ld"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-[60vh] flex flex-col items-center justify-center gap-3"
            >
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm opacity-80">Hava verisi yükleniyor…</p>
            </motion.div>
          )}

          {err && !loading && (
            <motion.div
              key="er"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="mt-20 mx-auto max-w-sm bg-white/15 backdrop-blur-xl rounded-3xl p-6 text-center"
            >
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-300" />
              <p className="font-semibold mb-1">{err}</p>
              <p className="text-sm opacity-80 mb-4">Tekrar denemek ister misin?</p>
              <button
                onClick={load}
                className="px-5 py-2.5 rounded-full bg-white text-slate-900 text-sm font-bold active:scale-95 transition-transform"
              >
                Tekrar dene
              </button>
            </motion.div>
          )}

          {data && !err && (
            <motion.div
              key="wx"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 space-y-6"
            >
              {/* Hero current */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.8, rotate: -8, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-white/15 backdrop-blur-xl mb-4 shadow-2xl"
                >
                  {wx && <wx.Icon className="w-16 h-16" strokeWidth={1.5} />}
                </motion.div>
                <div className="flex items-start justify-center">
                  <span className="text-[110px] leading-none font-extralight tracking-tighter">
                    {toT(data.temperature)}
                  </span>
                  <span className="text-4xl mt-3 ml-1 opacity-80">{tempU}</span>
                </div>
                <p className="text-lg font-medium opacity-90">{wx?.label}</p>
                <p className="text-sm opacity-70">Hissedilen {toT(data.apparent)}°</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { Icon: Wind, label: "Rüzgâr", value: `${toW(data.wind)} ${windU}` },
                  { Icon: Droplets, label: "Nem", value: `%${data.humidity}` },
                  { Icon: Gauge, label: "Basınç", value: `${data.pressure} hPa` },
                  { Icon: Sun, label: "UV İndeks", value: `${data.uv}` },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className="bg-white/15 backdrop-blur-xl rounded-2xl p-4"
                  >
                    <s.Icon className="w-5 h-5 opacity-80 mb-2" />
                    <p className="text-xs opacity-70">{s.label}</p>
                    <p className="text-lg font-semibold">{s.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Hourly */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-white/15 backdrop-blur-xl rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider opacity-80">
                  <Thermometer className="w-3.5 h-3.5" /> Saatlik tahmin
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {hourly.map((h) => {
                    const m = codeMap(h.code);
                    return (
                      <div key={h.time} className="flex-shrink-0 w-16 text-center">
                        <p className="text-[11px] opacity-80">
                          {new Date(h.time).toLocaleTimeString("tr-TR", { hour: "2-digit" })}
                        </p>
                        <m.Icon className="w-6 h-6 mx-auto my-2 opacity-90" />
                        <p className="text-sm font-semibold">{toT(h.temp)}°</p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Comparison Chart — Min vs Max gün gün */}
              {chart && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/15 backdrop-blur-xl rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80">
                      <BarChart3 className="w-3.5 h-3.5" /> Gün gün karşılaştırma
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-300" />Maks</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-300" />Min</span>
                    </div>
                  </div>
                  <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full h-44">
                    <defs>
                      <linearGradient id="wxArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fb923c" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path d={chart.areaPath} fill="url(#wxArea)" />
                    <path d={chart.maxPath} fill="none" stroke="#fdba74" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d={chart.minPath} fill="none" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {daily.map((d, i) => (
                      <g key={d.date}>
                        <circle cx={chart.xFor(i)} cy={chart.yFor(d.max)} r="3.2" fill="#fff" stroke="#f97316" strokeWidth="1.8" />
                        <circle cx={chart.xFor(i)} cy={chart.yFor(d.min)} r="3.2" fill="#fff" stroke="#0ea5e9" strokeWidth="1.8" />
                        <text x={chart.xFor(i)} y={chart.H - 4} textAnchor="middle" fontSize="10" fill="#fff" opacity="0.8">
                          {i === 0 ? "Bug" : new Date(d.date).toLocaleDateString("tr-TR", { weekday: "short" }).slice(0, 3)}
                        </text>
                        <text x={chart.xFor(i)} y={chart.yFor(d.max) - 7} textAnchor="middle" fontSize="9" fill="#fed7aa">{toT(d.max)}°</text>
                        <text x={chart.xFor(i)} y={chart.yFor(d.min) + 13} textAnchor="middle" fontSize="9" fill="#bae6fd">{toT(d.min)}°</text>
                      </g>
                    ))}
                  </svg>
                </motion.div>
              )}

              {/* Daily */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-white/15 backdrop-blur-xl rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider opacity-80">
                  <Sparkles className="w-3.5 h-3.5" /> 7 günlük
                </div>
                <div className="space-y-2">
                  {daily.map((d, i) => {
                    const m = codeMap(d.code);
                    const day =
                      i === 0
                        ? "Bugün"
                        : new Date(d.date).toLocaleDateString("tr-TR", { weekday: "short" });
                    return (
                      <div key={d.date} className="flex items-center gap-3">
                        <span className="w-12 text-sm font-medium">{day}</span>
                        <m.Icon className="w-5 h-5 opacity-90" />
                        <span className="text-xs opacity-70 w-10">%{d.pop}</span>
                        <span className="text-sm opacity-80 w-8 text-right">{toT(d.min)}°</span>
                        <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-300 via-amber-300 to-orange-400"
                            style={{ width: `${Math.min(100, ((d.max - d.min) / 30) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-8">{toT(d.max)}°</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Sun */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="grid grid-cols-2 gap-3"
              >
                <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-4">
                  <Sunrise className="w-5 h-5 opacity-80 mb-2 text-amber-300" />
                  <p className="text-xs opacity-70">Gün doğumu</p>
                  <p className="text-lg font-semibold">{fmtTime(data.sunrise)}</p>
                </div>
                <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-4">
                  <Sunset className="w-5 h-5 opacity-80 mb-2 text-orange-300" />
                  <p className="text-xs opacity-70">Gün batımı</p>
                  <p className="text-lg font-semibold">{fmtTime(data.sunset)}</p>
                </div>
              </motion.div>

              <p className="text-center text-[11px] opacity-60 pt-2">
                Veri kaynağı: Open-Meteo
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WeatherPage;
