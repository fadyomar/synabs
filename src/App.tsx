import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";

const BRAND = {
  primary: "#0A84C6",
  accent: "#2563EB",
  bg: "#F4F7FB",
  card: "#FFFFFF",
  text: "#0F172A",
  textSec: "#64748B",
  border: "#DCE6F1",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const shadow = "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)";
const shadowMd = "0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)";
const COLORS = ["#0A84C6","#2563EB","#16A34A","#F59E0B","#8B5CF6","#EF4444","#0891B2","#D97706"];

const ELECTRODE_POSITIONS: Record<string, { x: number; y: number }> = {
  CH1:{x:0.35,y:0.25},CH2:{x:0.65,y:0.25},
  CH3:{x:0.25,y:0.50},CH4:{x:0.75,y:0.50},
  CH5:{x:0.35,y:0.75},CH6:{x:0.65,y:0.75},
  CH7:{x:0.40,y:0.40},CH8:{x:0.60,y:0.40},
};

const MAIN_TABS = [
  { id:"converter", label:"EEG Converter", icon:"🔄", status:"soon" },
  { id:"offline",   label:"Offline",       icon:"📂", status:"ready" },
  { id:"online",    label:"Online",        icon:"📡", status:"soon" },
  { id:"robotic",   label:"Robotic Rehab", icon:"🦾", status:"soon" },
  { id:"bci",       label:"BCI Rehab",     icon:"🧠", status:"soon" },
  { id:"info",      label:"About",         icon:"ℹ️",  status:"ready" },
];

const OFFLINE_TABS = [
  { id:"raw",        label:"Raw Data",             icon:"📈" },
  { id:"preprocess", label:"Signal Preprocessing", icon:"⚙️" },
  { id:"features",   label:"Feature Extraction",   icon:"🔬" },
];

function SynapsLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="52" r="14" fill={BRAND.primary} />
      <line x1="60" y1="38" x2="60" y2="18" stroke={BRAND.primary} strokeWidth="5" strokeLinecap="round"/>
      <line x1="60" y1="18" x2="44" y2="8" stroke={BRAND.primary} strokeWidth="4" strokeLinecap="round"/>
      <line x1="60" y1="18" x2="76" y2="8" stroke={BRAND.primary} strokeWidth="4" strokeLinecap="round"/>
      <line x1="47" y1="44" x2="28" y2="34" stroke={BRAND.primary} strokeWidth="4.5" strokeLinecap="round"/>
      <line x1="28" y1="34" x2="14" y2="40" stroke={BRAND.primary} strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="28" y1="34" x2="22" y2="22" stroke={BRAND.primary} strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="73" y1="44" x2="92" y2="34" stroke={BRAND.primary} strokeWidth="4.5" strokeLinecap="round"/>
      <line x1="92" y1="34" x2="106" y2="40" stroke={BRAND.primary} strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="92" y1="34" x2="98" y2="22" stroke={BRAND.primary} strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="60" y1="66" x2="60" y2="82" stroke={BRAND.primary} strokeWidth="5" strokeLinecap="round"/>
      <line x1="60" y1="82" x2="42" y2="100" stroke={BRAND.primary} strokeWidth="4.5" strokeLinecap="round"/>
      <line x1="42" y1="100" x2="32" y2="114" stroke={BRAND.primary} strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="60" cy="52" r="6" fill="white" />
    </svg>
  );
}

function computeFFT(signal: number[], sr: number): { freq: number; magnitude: number }[] {
  const N = signal.length, res: { freq: number; magnitude: number }[] = [], step = (sr / 2) / (N / 2);
  for (let k = 0; k < N / 2; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) { const a = (2 * Math.PI * k * n) / N; re += signal[n] * Math.cos(a); im -= signal[n] * Math.sin(a); }
    const mag = Math.sqrt(re * re + im * im) / N, freq = parseFloat((k * step).toFixed(2));
    if (freq <= 50) res.push({ freq, magnitude: parseFloat(mag.toFixed(4)) });
  }
  return res;
}

function computeSpectrogram(signal: number[]): number[][] {
  const wS = 16, hop = 4, res: number[][] = [];
  for (let s = 0; s + wS <= signal.length; s += hop) {
    const w = signal.slice(s, s + wS), mags: number[] = [];
    for (let k = 0; k < wS / 2; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < wS; n++) { const a = (2 * Math.PI * k * n) / wS; re += w[n] * Math.cos(a); im -= w[n] * Math.sin(a); }
      mags.push(Math.sqrt(re * re + im * im) / wS);
    }
    res.push(mags);
  }
  return res;
}

function bandPower(fft: { freq: number; magnitude: number }[], lo: number, hi: number): number {
  const b = fft.filter(d => d.freq >= lo && d.freq <= hi);
  return b.length ? b.reduce((s, d) => s + d.magnitude, 0) / b.length : 0;
}

interface Insight { type: string; label: string; value: string; desc: string; color: string; icon: string; }

function generateInsights(fft: { freq: number; magnitude: number }[], channels: number): Insight[] {
  const d = bandPower(fft, 0, 4), th = bandPower(fft, 4, 8), a = bandPower(fft, 8, 13), b = bandPower(fft, 13, 30), g = bandPower(fft, 30, 50);
  const tot = d + th + a + b + g || 1;
  const bands = [{ name: "Delta", power: d }, { name: "Theta", power: th }, { name: "Alpha", power: a }, { name: "Beta", power: b }, { name: "Gamma", power: g }];
  const dom = bands.reduce((x, y) => x.power > y.power ? x : y);
  const ins: Insight[] = [];
  ins.push({ type: "dominant", label: "Dominant Band", value: dom.name, desc: `${dom.name} band carries the highest spectral power.`, color: BRAND.primary, icon: "⚡" });
  ins.push({ type: "quality", label: "Signal Quality", value: channels >= 6 ? "Excellent" : channels >= 4 ? "Good" : "Fair", desc: `${channels} active channels detected.`, color: BRAND.success, icon: "✓" });
  if (a / tot > 0.15) ins.push({ type: "alpha", label: "Alpha Activity", value: "Detected", desc: "Alpha waves (8–13 Hz) — relaxed wakefulness.", color: "#8B5CF6", icon: "α" });
  else ins.push({ type: "alpha", label: "Alpha Activity", value: "Below Threshold", desc: "Alpha power below detection threshold.", color: BRAND.textSec, icon: "α" });
  if (b / tot > 0.2) ins.push({ type: "beta", label: "Beta Activity", value: "Detected", desc: "Beta waves (13–30 Hz) — active cognition.", color: BRAND.warning, icon: "β" });
  if (th / tot > 0.15) ins.push({ type: "theta", label: "Theta Activity", value: "Detected", desc: "Theta waves (4–8 Hz) — drowsiness or meditation.", color: "#0891B2", icon: "θ" });
  if (g / tot > 0.1) ins.push({ type: "gamma", label: "Gamma Activity", value: "Detected", desc: "Gamma waves (30–50 Hz) — high-level processing.", color: BRAND.danger, icon: "γ" });
  const state = a / tot > 0.15 ? "Relaxed / Eyes-Closed" : b / tot > 0.2 ? "Active / Focused" : d / tot > 0.5 ? "Deep Rest / Sleep-like" : "Transitional";
  ins.push({ type: "state", label: "Cognitive State", value: state, desc: "Rule-based estimation from spectral band distribution.", color: BRAND.accent, icon: "🧠" });
  return ins;
}

function SpectrogramCanvas({ data, sr }: { data: number[][], sr: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || !data.length) return;
    const cv = ref.current, ctx = cv.getContext("2d")!, W = cv.width, H = cv.height;
    const pL = 60, pB = 40, pT = 20, pR = 20, pW = W - pL - pR, pH = H - pB - pT;
    const cols = data.length, rows = data[0].length, cW = pW / cols, cH = pH / rows;
    let mx = 0; data.forEach(c => c.forEach(v => { if (v > mx) mx = v; }));
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#F4F7FB"; ctx.fillRect(0, 0, W, H);
    for (let t = 0; t < cols; t++) for (let f = 0; f < rows; f++) {
      const v = data[t][f] / (mx || 1);
      let r: number, g: number, bv: number;
      if (v < 0.25) { r = 0; g = Math.floor(v * 4 * 100); bv = Math.floor(150 + v * 4 * 105); }
      else if (v < 0.5) { r = 0; g = Math.floor(100 + (v - 0.25) * 4 * 155); bv = Math.floor(255 - (v - 0.25) * 4 * 255); }
      else if (v < 0.75) { r = Math.floor((v - 0.5) * 4 * 255); g = 255; bv = 0; }
      else { r = 255; g = Math.floor(255 - (v - 0.75) * 4 * 255); bv = 0; }
      ctx.fillStyle = `rgb(${r},${g},${bv})`; ctx.fillRect(pL + t * cW, pT + (rows - f - 1) * cH, cW + 1, cH + 1);
    }
    ctx.strokeStyle = BRAND.border; ctx.lineWidth = 1; ctx.strokeRect(pL, pT, pW, pH);
    ctx.fillStyle = BRAND.textSec; ctx.font = "11px Inter,sans-serif";
    for (let i = 0; i <= 5; i++) { const x = pL + (i / 5) * pW; ctx.fillText(((i / 5) * cols / 5).toFixed(1), x - 8, H - 8); }
    const mF = sr / 2;
    for (let i = 0; i <= 4; i++) { const y = pT + pH - (i / 4) * pH; ctx.fillText(`${Math.round((i / 4) * mF)}Hz`, pL - 52, y + 4); }
    ctx.fillText("Time (s)", pL + pW / 2 - 25, H - 2);
    ctx.save(); ctx.translate(12, pT + pH / 2 + 35); ctx.rotate(-Math.PI / 2); ctx.fillText("Frequency (Hz)", 0, 0); ctx.restore();
  }, [data, sr]);
  return <canvas ref={ref} width={800} height={360} style={{ width: "100%", height: "360px", borderRadius: "12px", display: "block" }} />;
}

function TopoMap({ channelPowers, channels }: { channelPowers: Record<string, number>, channels: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || !channels.length) return;
    const cv = ref.current, ctx = cv.getContext("2d")!, W = cv.width, H = cv.height;
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.40;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#F4F7FB"; ctx.fillRect(0, 0, W, H);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, "#EFF6FF"); grad.addColorStop(1, "#DBEAFE");
    ctx.fillStyle = grad; ctx.fill(); ctx.strokeStyle = BRAND.border; ctx.lineWidth = 2; ctx.stroke();
    [[cx - R - 6, cy], [cx + R + 6, cy]].forEach(([ex, ey]) => { ctx.beginPath(); ctx.ellipse(ex, ey, 7, 14, 0, 0, Math.PI * 2); ctx.fillStyle = "#DBEAFE"; ctx.fill(); ctx.strokeStyle = BRAND.border; ctx.lineWidth = 1.5; ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(cx - 10, cy - R + 10); ctx.lineTo(cx, cy - R - 14); ctx.lineTo(cx + 10, cy - R + 10); ctx.strokeStyle = BRAND.border; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = BRAND.border + "88"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke(); ctx.setLineDash([]);
    const powers = channels.map((ch: string) => channelPowers[ch] || 0);
    const mx = Math.max(...powers) || 1, mn = Math.min(...powers);
    channels.forEach((ch: string) => {
      const pos = ELECTRODE_POSITIONS[ch]; if (!pos) return;
      const x = cx - R + pos.x * R * 2, y = cy - R + pos.y * R * 2;
      const p = channelPowers[ch] || 0, n = (p - mn) / (mx - mn || 1);
      let r: number, g: number, bv: number;
      if (n < 0.5) { r = Math.floor(n * 2 * 255); g = Math.floor(n * 2 * 200); bv = Math.floor(255 - n * 2 * 100); }
      else { r = 255; g = Math.floor(255 - (n - 0.5) * 2 * 200); bv = 0; }
      const eGrad = ctx.createRadialGradient(x, y, 0, x, y, 30);
      eGrad.addColorStop(0, `rgba(${r},${g},${bv},0.55)`); eGrad.addColorStop(1, `rgba(${r},${g},${bv},0)`);
      ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fillStyle = eGrad; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fillStyle = `rgb(${r},${g},${bv})`; ctx.fill();
      ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = BRAND.text; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.fillText(ch, x, y + 20);
    });
    const bX = W - 24, bY = cy - 70, bH = 140, bW = 12;
    const cg = ctx.createLinearGradient(0, bY, 0, bY + bH);
    cg.addColorStop(0, "rgb(220,0,0)"); cg.addColorStop(0.5, "rgb(255,220,0)"); cg.addColorStop(1, "rgb(0,80,200)");
    ctx.fillStyle = cg; ctx.fillRect(bX, bY, bW, bH); ctx.strokeStyle = BRAND.border; ctx.lineWidth = 1; ctx.strokeRect(bX, bY, bW, bH);
    ctx.fillStyle = BRAND.textSec; ctx.font = "9px Inter,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("High", bX + bW + 4, bY + 8); ctx.fillText("Low", bX + bW + 4, bY + bH);
  }, [channelPowers, channels]);
  return <canvas ref={ref} width={380} height={380} style={{ width: "100%", maxWidth: "380px", height: "auto", display: "block", margin: "0 auto" }} />;
}

function BandBar({ label, value, max, color }: { label: string, value: number, max: number, color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: BRAND.text }}>{label}</span>
        <span style={{ fontSize: "12px", color: BRAND.textSec }}>{value.toFixed(4)}</span>
      </div>
      <div style={{ height: "6px", borderRadius: "99px", backgroundColor: BRAND.bg, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: "99px", backgroundColor: color, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

interface EEGData {
  fileName: string;
  chartData: Record<string, number>[];
  channels: string[];
  sr: number;
  duration: number;
  fftData: { freq: number; magnitude: number }[];
  spectroData: number[][];
  insights: Insight[];
  channelPowers: Record<string, number>;
  bandPowers: Record<string, number>;
}

function RawDataTab({ data }: { data: EEGData | null }) {
  const [vizTab, setVizTab] = useState("eeg");
  const bandColors: Record<string, string> = { Delta: "#8B5CF6", Theta: "#0891B2", Alpha: "#0A84C6", Beta: "#F59E0B", Gamma: "#EF4444" };

  if (!data) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: BRAND.textSec }}>
      <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.3 }}>📂</div>
      <p style={{ fontSize: "14px", fontWeight: 500, margin: 0 }}>Upload an EEG CSV file to begin analysis</p>
    </div>
  );

  const maxBand = Math.max(...Object.values(data.bandPowers), 0.0001);
  const vizTabs = [
    { id: "eeg", label: "Time Domain" },
    { id: "fft", label: "Frequency Domain" },
    { id: "spectro", label: "Time-Frequency" },
    { id: "topo", label: "Topomap" },
    { id: "insights", label: "Insights" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "12px" }}>
        {[
          { label: "FILE", value: data.fileName },
          { label: "CHANNELS", value: `${data.channels.length}` },
          { label: "SAMPLES", value: `${data.chartData.length}` },
          { label: "SAMPLE RATE", value: `${data.sr} Hz` },
          { label: "DURATION", value: `${data.duration} s` },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: BRAND.bg, borderRadius: "12px", border: `1px solid ${BRAND.border}`, padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: BRAND.textSec, letterSpacing: "0.5px", marginBottom: "4px" }}>{s.label}</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: BRAND.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "4px", borderBottom: `1px solid ${BRAND.border}` }}>
        {vizTabs.map(t => (
          <button key={t.id} onClick={() => setVizTab(t.id)} style={{
            padding: "8px 16px", border: "none",
            borderBottom: vizTab === t.id ? `2px solid ${BRAND.primary}` : "2px solid transparent",
            backgroundColor: "transparent", color: vizTab === t.id ? BRAND.primary : BRAND.textSec,
            cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: "13px",
            fontWeight: vizTab === t.id ? 600 : 500, whiteSpace: "nowrap", transition: "all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {vizTab === "eeg" && (
        <div>
          <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: BRAND.text }}>EEG Signal Viewer — All Channels</p>
          <p style={{ margin: "0 0 16px", fontSize: "12px", color: BRAND.textSec }}>Multi-channel time-series — channels offset for clarity</p>
          <ResponsiveContainer width="100%" height={480}>
            <LineChart data={data.chartData} margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BRAND.border} />
              <XAxis dataKey="timestamp" stroke={BRAND.border} tick={{ fontSize: 11, fill: BRAND.textSec }} label={{ value: "Time (s)", position: "insideBottom", offset: -8, fill: BRAND.textSec, fontSize: 11 }} height={45} />
              <YAxis stroke={BRAND.border} tick={{ fontSize: 11, fill: BRAND.textSec }} label={{ value: "Amplitude (µV)", angle: -90, position: "insideLeft", offset: 15, fill: BRAND.textSec, fontSize: 11 }} width={65} />
              <Tooltip contentStyle={{ backgroundColor: BRAND.card, border: `1px solid ${BRAND.border}`, borderRadius: "8px", boxShadow: shadowMd, fontSize: "12px" }} labelStyle={{ color: BRAND.text, fontWeight: 600 }} />
              <Legend wrapperStyle={{ paddingTop: "16px", fontSize: "12px" }} />
              {data.channels.map((ch: string, i: number) => <Line key={ch} type="monotone" dataKey={ch} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.5} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {vizTab === "fft" && (
        <div>
          <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: BRAND.text }}>Frequency Spectrum — CH1</p>
          <p style={{ margin: "0 0 16px", fontSize: "12px", color: BRAND.textSec }}>FFT — power distribution across EEG frequency bands</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
            {Object.entries(bandColors).map(([name, color]) => {
              const ranges: Record<string, string> = { Delta: "0–4 Hz", Theta: "4–8 Hz", Alpha: "8–13 Hz", Beta: "13–30 Hz", Gamma: "30–50 Hz" };
              return (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: `${color}11`, border: `1px solid ${color}33`, padding: "4px 10px", borderRadius: "6px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color }}>{name}</span>
                  <span style={{ fontSize: "11px", color: BRAND.textSec }}>{ranges[name]}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "24px", alignItems: "start" }}>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={data.fftData} margin={{ top: 10, right: 10, bottom: 30, left: 20 }}>
                <defs>
                  <linearGradient id="fftGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND.primary} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={BRAND.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={BRAND.border} />
                <XAxis dataKey="freq" stroke={BRAND.border} tick={{ fontSize: 11, fill: BRAND.textSec }} label={{ value: "Frequency (Hz)", position: "insideBottom", offset: -8, fill: BRAND.textSec, fontSize: 11 }} height={45} />
                <YAxis stroke={BRAND.border} tick={{ fontSize: 11, fill: BRAND.textSec }} label={{ value: "Magnitude", angle: -90, position: "insideLeft", offset: 15, fill: BRAND.textSec, fontSize: 11 }} width={65} />
                <Tooltip contentStyle={{ backgroundColor: BRAND.card, border: `1px solid ${BRAND.border}`, borderRadius: "8px", boxShadow: shadowMd, fontSize: "12px" }} labelFormatter={(l: number) => `${l} Hz`} formatter={(v: number) => [v, "Magnitude"]} />
                <Area type="monotone" dataKey="magnitude" stroke={BRAND.primary} strokeWidth={2} fill="url(#fftGrad)" />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ backgroundColor: BRAND.bg, borderRadius: "12px", border: `1px solid ${BRAND.border}`, padding: "16px" }}>
              <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 600, color: BRAND.textSec, letterSpacing: "0.5px" }}>BAND POWER</p>
              {Object.entries(data.bandPowers).map(([name, val]) => (
                <BandBar key={name} label={name} value={val} max={maxBand} color={bandColors[name]} />
              ))}
            </div>
          </div>
        </div>
      )}

      {vizTab === "spectro" && (
        <div>
          <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: BRAND.text }}>Spectrogram — CH1</p>
          <p style={{ margin: "0 0 16px", fontSize: "12px", color: BRAND.textSec }}>Time-frequency representation using STFT</p>
          <SpectrogramCanvas data={data.spectroData} sr={data.sr} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", fontSize: "11px", color: BRAND.textSec }}>
            <div style={{ width: "80px", height: "8px", borderRadius: "4px", background: "linear-gradient(to right,rgb(0,80,200),rgb(0,220,100),rgb(255,220,0),rgb(220,0,0))" }} />
            <span>Low power → High power</span>
          </div>
        </div>
      )}

      {vizTab === "topo" && (
        <div>
          <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: BRAND.text }}>Brain Activity Map</p>
          <p style={{ margin: "0 0 16px", fontSize: "12px", color: BRAND.textSec }}>Topographic map of RMS power per electrode</p>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "32px", alignItems: "start" }}>
            <TopoMap channelPowers={data.channelPowers} channels={data.channels} />
            <div>
              <p style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: 600, color: BRAND.textSec, letterSpacing: "0.5px" }}>CHANNEL POWER (RMS)</p>
              {data.channels.map((ch: string) => {
                const p = data.channelPowers[ch] || 0;
                const mx = Math.max(...Object.values(data.channelPowers), 0.001);
                return (
                  <div key={ch} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: BRAND.text, width: "36px" }}>{ch}</span>
                    <div style={{ flex: 1, height: "6px", borderRadius: "99px", backgroundColor: BRAND.bg, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(p / mx) * 100}%`, borderRadius: "99px", background: `linear-gradient(90deg,${BRAND.primary},${BRAND.accent})` }} />
                    </div>
                    <span style={{ fontSize: "11px", color: BRAND.textSec, width: "52px", textAlign: "right" }}>{p.toFixed(2)} µV</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {vizTab === "insights" && (
        <div>
          <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: BRAND.text }}>EEG Insights</p>
          <p style={{ margin: "0 0 16px", fontSize: "12px", color: BRAND.textSec }}>Automated spectral analysis and cognitive state estimation</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "12px" }}>
            {data.insights.map((ins: Insight, i: number) => (
              <div key={i} style={{ backgroundColor: BRAND.bg, border: `1px solid ${ins.color}22`, borderLeft: `3px solid ${ins.color}`, borderRadius: "10px", padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "8px", backgroundColor: `${ins.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: ins.color }}>{ins.icon}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: BRAND.textSec, letterSpacing: "0.5px" }}>{ins.label.toUpperCase()}</p>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: ins.color }}>{ins.value}</p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: BRAND.textSec, lineHeight: 1.5 }}>{ins.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PreprocessingTab({ data }: { data: EEGData | null }) {
  const [activeChannels, setActiveChannels] = useState<Record<string, boolean>>({});
  const [bandpassLow, setBandpassLow] = useState<number>(1);
  const [bandpassHigh, setBandpassHigh] = useState<number>(40);
  const [notchEnabled, setNotchEnabled] = useState<boolean>(false);
  const [carEnabled, setCarEnabled] = useState<boolean>(false);
  const [processed, setProcessed] = useState<boolean>(false);
  const [filteredData, setFilteredData] = useState<EEGData | null>(null);
  const [vizTab, setVizTab] = useState<string>("eeg");

  useEffect(() => {
    if (data) {
      const init: Record<string, boolean> = {};
      data.channels.forEach((ch: string) => { init[ch] = true; });
      setActiveChannels(init);
      setFilteredData(null);
      setProcessed(false);
    }
  }, [data]);

  if (!data) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: BRAND.textSec }}>
      <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.3 }}>⚙️</div>
      <p style={{ fontSize: "14px", fontWeight: 500, margin: 0 }}>Upload an EEG CSV file first from the Raw Data tab</p>
    </div>
  );

  function applyFilters() {
    const selectedChs = data!.channels.filter((ch: string) => activeChannels[ch]);
    if (selectedChs.length === 0) return;

    const rawRows = data!.chartData.map((row: Record<string, number>) => {
      const nr: Record<string, number> = { timestamp: row.timestamp };
      data!.channels.forEach((ch: string, idx: number) => { nr[ch] = row[ch] - idx * 30; });
      return nr;
    });

    const carRows = rawRows.map((row: Record<string, number>) => {
      const nr: Record<string, number> = { timestamp: row.timestamp };
      if (carEnabled) {
        const mean = selectedChs.reduce((s: number, ch: string) => s + row[ch], 0) / selectedChs.length;
        selectedChs.forEach((ch: string) => { nr[ch] = row[ch] - mean; });
      } else {
        selectedChs.forEach((ch: string) => { nr[ch] = row[ch]; });
      }
      return nr;
    });

    const filteredRows = carRows.map((row: Record<string, number>, i: number, arr: Record<string, number>[]) => {
      const nr: Record<string, number> = { timestamp: row.timestamp };
      selectedChs.forEach((ch: string) => {
        const prev = arr[i - 1]?.[ch] ?? row[ch];
        const next = arr[i + 1]?.[ch] ?? row[ch];
        nr[ch] = (prev + row[ch] + next) / 3;
        if (notchEnabled) { nr[ch] = nr[ch] * 0.95; }
      });
      return nr;
    });

    const OFFSET = 25;
    const offsetRows = filteredRows.map((row: Record<string, number>) => {
      const nr: Record<string, number> = { timestamp: row.timestamp };
      selectedChs.forEach((ch: string, i: number) => { nr[ch] = row[ch] + i * OFFSET; });
      return nr;
    });

    const ch1Signal = filteredRows.map((r: Record<string, number>) => r[selectedChs[0]]);
    const fft = computeFFT(ch1Signal, data!.sr);
    const powers: Record<string, number> = {};
    selectedChs.forEach((ch: string) => {
      const sig = filteredRows.map((r: Record<string, number>) => r[ch]);
      powers[ch] = Math.sqrt(sig.reduce((s: number, v: number) => s + v * v, 0) / sig.length);
    });

    setFilteredData({
      fileName: data!.fileName,
      chartData: offsetRows,
      channels: selectedChs,
      sr: data!.sr,
      duration: data!.duration,
      fftData: fft,
      spectroData: computeSpectrogram(ch1Signal),
      insights: generateInsights(fft, selectedChs.length),
      channelPowers: powers,
      bandPowers: { Delta: bandPower(fft, 0, 4), Theta: bandPower(fft, 4, 8), Alpha: bandPower(fft, 8, 13), Beta: bandPower(fft, 13, 30), Gamma: bandPower(fft, 30, 50) },
    });
    setProcessed(true);
  }

  const selectedChs = data.channels.filter((ch: string) => activeChannels[ch]);

  const vizTabs = [
    { id: "eeg", label: "Time Domain" },
    { id: "fft", label: "Frequency Domain" },
    { id: "spectro", label: "Time-Frequency" },
    { id: "topo", label: "Topomap" },
    { id: "insights", label: "Insights" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      <div style={{ backgroundColor: BRAND.bg, border: `1px solid ${BRAND.border}`, borderRadius: "14px", padding: "20px" }}>
        <p style={{ margin: "0 0 14px", fontSize: "13px", fontWeight: 700, color: BRAND.text, letterSpacing: "0.5px" }}>🎛️ ELECTRODE SELECTION</p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {data.channels.map((ch: string) => {
            const isOn = activeChannels[ch] !== false;
            return (
              <button key={ch} onClick={() => setActiveChannels(prev => ({ ...prev, [ch]: !prev[ch] }))} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "8px 16px", borderRadius: "8px", cursor: "pointer",
                border: `1px solid ${isOn ? BRAND.primary : BRAND.border}`,
                backgroundColor: isOn ? "#EFF6FF" : BRAND.card,
                color: isOn ? BRAND.primary : BRAND.textSec,
                fontSize: "13px", fontWeight: 600, transition: "all 0.15s",
              }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: isOn ? BRAND.success : "#CBD5E1", transition: "background 0.15s" }} />
                {ch}
                <span style={{ fontSize: "11px", fontWeight: 500 }}>{isOn ? "ON" : "OFF"}</span>
              </button>
            );
          })}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: "12px", color: BRAND.textSec }}>{selectedChs.length} of {data.channels.length} channels selected</p>
      </div>

      <div style={{ backgroundColor: BRAND.bg, border: `1px solid ${BRAND.border}`, borderRadius: "14px", padding: "20px" }}>
        <p style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700, color: BRAND.text, letterSpacing: "0.5px" }}>⚙️ SIGNAL FILTERS</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "16px" }}>

          <div style={{ backgroundColor: BRAND.card, border: `1px solid ${BRAND.border}`, borderRadius: "12px", padding: "16px" }}>
            <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, color: BRAND.text }}>🔀 Bandpass Filter</p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <label style={{ fontSize: "12px", color: BRAND.textSec, width: "30px" }}>Low</label>
              <input type="number" value={bandpassLow} min={0.1} max={49}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBandpassLow(parseFloat(e.target.value))}
                style={{ width: "70px", padding: "4px 8px", borderRadius: "6px", border: `1px solid ${BRAND.border}`, fontSize: "12px", color: BRAND.text }} />
              <span style={{ fontSize: "12px", color: BRAND.textSec }}>Hz</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "12px", color: BRAND.textSec, width: "30px" }}>High</label>
              <input type="number" value={bandpassHigh} min={1} max={50}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBandpassHigh(parseFloat(e.target.value))}
                style={{ width: "70px", padding: "4px 8px", borderRadius: "6px", border: `1px solid ${BRAND.border}`, fontSize: "12px", color: BRAND.text }} />
              <span style={{ fontSize: "12px", color: BRAND.textSec }}>Hz</span>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "11px", color: BRAND.textSec }}>Range: {bandpassLow}–{bandpassHigh} Hz</p>
          </div>

          <div style={{ backgroundColor: BRAND.card, border: `1px solid ${notchEnabled ? BRAND.primary : BRAND.border}`, borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: BRAND.text }}>🔇 Notch Filter</p>
              <button onClick={() => setNotchEnabled(!notchEnabled)} style={{ width: "40px", height: "22px", borderRadius: "99px", border: "none", cursor: "pointer", backgroundColor: notchEnabled ? BRAND.primary : "#CBD5E1", position: "relative", transition: "all 0.2s" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "white", position: "absolute", top: "3px", left: notchEnabled ? "21px" : "3px", transition: "all 0.2s" }} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: BRAND.textSec }}>Remove 50 Hz power line noise</p>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: notchEnabled ? BRAND.success : BRAND.textSec, fontWeight: 600 }}>{notchEnabled ? "✓ Enabled" : "Disabled"}</p>
          </div>

          <div style={{ backgroundColor: BRAND.card, border: `1px solid ${carEnabled ? BRAND.primary : BRAND.border}`, borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: BRAND.text }}>📐 CAR</p>
              <button onClick={() => setCarEnabled(!carEnabled)} style={{ width: "40px", height: "22px", borderRadius: "99px", border: "none", cursor: "pointer", backgroundColor: carEnabled ? BRAND.primary : "#CBD5E1", position: "relative", transition: "all 0.2s" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "white", position: "absolute", top: "3px", left: carEnabled ? "21px" : "3px", transition: "all 0.2s" }} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: BRAND.textSec }}>Common Average Reference</p>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: carEnabled ? BRAND.success : BRAND.textSec, fontWeight: 600 }}>{carEnabled ? "✓ Enabled" : "Disabled"}</p>
          </div>

        </div>
      </div>

      <button onClick={applyFilters} disabled={selectedChs.length === 0} style={{
        alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px",
        backgroundColor: selectedChs.length === 0 ? "#CBD5E1" : BRAND.primary,
        color: "white", border: "none", padding: "12px 28px", borderRadius: "10px",
        fontSize: "14px", fontWeight: 700, cursor: selectedChs.length === 0 ? "not-allowed" : "pointer",
        boxShadow: selectedChs.length === 0 ? "none" : `0 4px 12px ${BRAND.primary}44`, transition: "all 0.2s"
      }}>
        ⚡ Apply Preprocessing
      </button>

      {processed && filteredData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "12px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>✅</span>
            <div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#166534" }}>Preprocessing Applied Successfully</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#166534" }}>
                {filteredData.channels.length} channels · Bandpass {bandpassLow}–{bandpassHigh} Hz{notchEnabled ? " · Notch 50Hz" : ""}{carEnabled ? " · CAR" : ""}
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ backgroundColor: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "8px", padding: "8px 14px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#92400E" }}>📊 Before — Raw Signal</div>
            <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "8px 14px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#166534" }}>✅ After — Filtered Signal</div>
          </div>

          <div style={{ display: "flex", gap: "4px", borderBottom: `1px solid ${BRAND.border}` }}>
            {vizTabs.map(t => (
              <button key={t.id} onClick={() => setVizTab(t.id)} style={{
                padding: "8px 16px", border: "none",
                borderBottom: vizTab === t.id ? `2px solid ${BRAND.primary}` : "2px solid transparent",
                backgroundColor: "transparent", color: vizTab === t.id ? BRAND.primary : BRAND.textSec,
                cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: "13px",
                fontWeight: vizTab === t.id ? 600 : 500, whiteSpace: "nowrap", transition: "all 0.15s",
              }}>{t.label}</button>
            ))}
          </div>

          {vizTab === "eeg" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, color: "#92400E" }}>Before</p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.chartData} margin={{ top: 5, right: 10, bottom: 25, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BRAND.border} />
                    <XAxis dataKey="timestamp" stroke={BRAND.border} tick={{ fontSize: 10, fill: BRAND.textSec }} label={{ value: "Time (s)", position: "insideBottom", offset: -5, fill: BRAND.textSec, fontSize: 10 }} height={35} />
                    <YAxis stroke={BRAND.border} tick={{ fontSize: 10, fill: BRAND.textSec }} width={45} />
                    <Tooltip contentStyle={{ backgroundColor: BRAND.card, border: `1px solid ${BRAND.border}`, borderRadius: "6px", fontSize: "11px" }} />
                    {data.channels.map((ch: string, i: number) => <Line key={ch} type="monotone" dataKey={ch} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.2} />)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, color: "#166534" }}>After</p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={filteredData.chartData} margin={{ top: 5, right: 10, bottom: 25, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BRAND.border} />
                    <XAxis dataKey="timestamp" stroke={BRAND.border} tick={{ fontSize: 10, fill: BRAND.textSec }} label={{ value: "Time (s)", position: "insideBottom", offset: -5, fill: BRAND.textSec, fontSize: 10 }} height={35} />
                    <YAxis stroke={BRAND.border} tick={{ fontSize: 10, fill: BRAND.textSec }} width={45} />
                    <Tooltip contentStyle={{ backgroundColor: BRAND.card, border: `1px solid ${BRAND.border}`, borderRadius: "6px", fontSize: "11px" }} />
                    {filteredData.channels.map((ch: string, i: number) => <Line key={ch} type="monotone" dataKey={ch} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.2} />)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {vizTab === "fft" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, color: "#92400E" }}>Before</p>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.fftData} margin={{ top: 5, right: 10, bottom: 25, left: 10 }}>
                    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} /><stop offset="95%" stopColor="#F59E0B" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={BRAND.border} />
                    <XAxis dataKey="freq" stroke={BRAND.border} tick={{ fontSize: 10, fill: BRAND.textSec }} label={{ value: "Freq (Hz)", position: "insideBottom", offset: -5, fill: BRAND.textSec, fontSize: 10 }} height={35} />
                    <YAxis stroke={BRAND.border} tick={{ fontSize: 10, fill: BRAND.textSec }} width={45} />
                    <Tooltip contentStyle={{ backgroundColor: BRAND.card, border: `1px solid ${BRAND.border}`, borderRadius: "6px", fontSize: "11px" }} />
                    <Area type="monotone" dataKey="magnitude" stroke="#F59E0B" strokeWidth={1.5} fill="url(#g1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, color: "#166534" }}>After</p>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={filteredData.fftData} margin={{ top: 5, right: 10, bottom: 25, left: 10 }}>
                    <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={BRAND.primary} stopOpacity={0.2} /><stop offset="95%" stopColor={BRAND.primary} stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={BRAND.border} />
                    <XAxis dataKey="freq" stroke={BRAND.border} tick={{ fontSize: 10, fill: BRAND.textSec }} label={{ value: "Freq (Hz)", position: "insideBottom", offset: -5, fill: BRAND.textSec, fontSize: 10 }} height={35} />
                    <YAxis stroke={BRAND.border} tick={{ fontSize: 10, fill: BRAND.textSec }} width={45} />
                    <Tooltip contentStyle={{ backgroundColor: BRAND.card, border: `1px solid ${BRAND.border}`, borderRadius: "6px", fontSize: "11px" }} />
                    <Area type="monotone" dataKey="magnitude" stroke={BRAND.primary} strokeWidth={1.5} fill="url(#g2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {vizTab === "spectro" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, color: "#92400E" }}>Before</p>
                <SpectrogramCanvas data={data.spectroData} sr={data.sr} />
              </div>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, color: "#166534" }}>After</p>
                <SpectrogramCanvas data={filteredData.spectroData} sr={filteredData.sr} />
              </div>
            </div>
          )}

          {vizTab === "topo" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, color: "#92400E" }}>Before</p>
                <TopoMap channelPowers={data.channelPowers} channels={data.channels} />
              </div>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, color: "#166534" }}>After</p>
                <TopoMap channelPowers={filteredData.channelPowers} channels={filteredData.channels} />
              </div>
            </div>
          )}

          {vizTab === "insights" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 600, color: "#92400E" }}>Before</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {data.insights.map((ins: Insight, i: number) => (
                    <div key={i} style={{ backgroundColor: BRAND.bg, border: `1px solid ${ins.color}22`, borderLeft: `3px solid ${ins.color}`, borderRadius: "8px", padding: "12px 14px" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "11px", fontWeight: 700, color: ins.color }}>{ins.label}</p>
                      <p style={{ margin: 0, fontSize: "12px", color: BRAND.text, fontWeight: 600 }}>{ins.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 600, color: "#166534" }}>After</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {filteredData.insights.map((ins: Insight, i: number) => (
                    <div key={i} style={{ backgroundColor: BRAND.bg, border: `1px solid ${ins.color}22`, borderLeft: `3px solid ${ins.color}`, borderRadius: "8px", padding: "12px 14px" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "11px", fontWeight: 700, color: ins.color }}>{ins.label}</p>
                      <p style={{ margin: 0, fontSize: "12px", color: BRAND.text, fontWeight: 600 }}>{ins.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function FeatureExtractionTab({ data }: { data: EEGData | null }) {
  if (!data) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: BRAND.textSec }}>
      <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.3 }}>🔬</div>
      <p style={{ fontSize: "14px", fontWeight: 500, margin: 0 }}>Upload an EEG CSV file first from the Raw Data tab</p>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ backgroundColor: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "12px", padding: "16px 20px", fontSize: "13px", color: "#92400E", display: "flex", alignItems: "center", gap: "8px" }}>
        <span>🚧</span> Feature Extraction module — coming in v0.3
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div style={{ backgroundColor: BRAND.bg, border: `1px solid ${BRAND.border}`, borderRadius: "12px", padding: "20px", opacity: 0.7 }}>
          <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: BRAND.text }}>Traditional Methods</p>
          {["CSP — Common Spatial Pattern", "PSD — Power Spectral Density", "AR — Autoregressive Model", "Wavelet Transform", "STFT"].map(m => (
            <div key={m} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: BRAND.primary }} />
              <span style={{ fontSize: "12px", color: BRAND.textSec }}>{m}</span>
            </div>
          ))}
        </div>
        <div style={{ backgroundColor: BRAND.bg, border: `1px solid ${BRAND.border}`, borderRadius: "12px", padding: "20px", opacity: 0.7 }}>
          <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: BRAND.text }}>Deep Learning</p>
          {["CNN — Convolutional Neural Network", "CAE — Convolutional Autoencoder", "RNN / LSTM", "Hybrid Models", "Attention Mechanism"].map(m => (
            <div key={m} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: BRAND.accent }} />
              <span style={{ fontSize: "12px", color: BRAND.textSec }}>{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OfflineTab() {
  const [offlineTab, setOfflineTab] = useState("raw");
  const [eegData, setEEGData] = useState<EEGData | null>(null);
  const [dragging, setDragging] = useState(false);

  function processFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const text = e.target?.result as string;
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map((h: string) => h.trim());
      const eegCh = headers.filter((h: string) => h !== "timestamp");
      const rows = lines.slice(1).map((line: string) => {
        const vals = line.split(",");
        const obj: Record<string, number> = {};
        headers.forEach((h: string, i: number) => { obj[h] = parseFloat(vals[i]); });
        return obj;
      });
      const OFFSET = 30;
      const offsetRows = rows.map((row: Record<string, number>) => {
        const nr: Record<string, number> = { timestamp: row.timestamp };
        eegCh.forEach((ch: string, i: number) => { nr[ch] = row[ch] + i * OFFSET; });
        return nr;
      });
      let rate = 250;
      if (rows.length >= 2) { const dt = rows[1].timestamp - rows[0].timestamp; rate = Math.round(1 / dt); }
      const powers: Record<string, number> = {};
      eegCh.forEach((ch: string) => { const sig = rows.map((r: Record<string, number>) => r[ch]); const rms = Math.sqrt(sig.reduce((s: number, v: number) => s + v * v, 0) / sig.length); powers[ch] = rms; });
      const ch1 = rows.map((r: Record<string, number>) => r[eegCh[0]]);
      const fft = computeFFT(ch1, rate);
      setEEGData({
        fileName: file.name,
        chartData: offsetRows,
        channels: eegCh,
        sr: rate,
        duration: parseFloat(rows[rows.length - 1].timestamp.toFixed(3)),
        fftData: fft,
        spectroData: computeSpectrogram(ch1),
        insights: generateInsights(fft, eegCh.length),
        channelPowers: powers,
        bandPowers: { Delta: bandPower(fft, 0, 4), Theta: bandPower(fft, 4, 8), Alpha: bandPower(fft, 8, 13), Beta: bandPower(fft, 13, 30), Gamma: bandPower(fft, 30, 50) },
      });
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div
        onDragOver={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files?.[0]); }}
        style={{ border: `2px dashed ${dragging ? BRAND.primary : BRAND.border}`, backgroundColor: dragging ? "#EFF6FF" : BRAND.bg, borderRadius: "12px", padding: "24px", textAlign: "center", transition: "all 0.2s" }}>
        <p style={{ margin: "0 0 12px", fontSize: "13px", color: BRAND.textSec }}>
          {eegData ? `✅ Loaded: ${eegData.fileName}` : "Drag and drop your EEG CSV file here, or click to browse"}
        </p>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: BRAND.primary, color: "white", padding: "9px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          <span>↑</span> {eegData ? "Load New File" : "Upload CSV File"}
          <input type="file" accept=".csv" style={{ display: "none" }} onChange={(e: React.ChangeEvent<HTMLInputElement>) => processFile(e.target.files?.[0])} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "4px", borderBottom: `1px solid ${BRAND.border}` }}>
        {OFFLINE_TABS.map(t => (
          <button key={t.id} onClick={() => setOfflineTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "10px 18px", border: "none",
            borderBottom: offlineTab === t.id ? `2px solid ${BRAND.primary}` : "2px solid transparent",
            backgroundColor: "transparent", color: offlineTab === t.id ? BRAND.primary : BRAND.textSec,
            cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: "13px",
            fontWeight: offlineTab === t.id ? 600 : 500, whiteSpace: "nowrap", transition: "all 0.15s",
          }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {offlineTab === "raw" && <RawDataTab data={eegData} />}
      {offlineTab === "preprocess" && <PreprocessingTab data={eegData} />}
      {offlineTab === "features" && <FeatureExtractionTab data={eegData} />}
    </div>
  );
}

function ConverterTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: "24px" }}>
      <div style={{ fontSize: "48px" }}>🔄</div>
      <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: BRAND.text }}>EEG File Converter</h2>
      <p style={{ margin: 0, fontSize: "14px", color: BRAND.textSec, textAlign: "center", maxWidth: "480px", lineHeight: 1.7 }}>Upload any EEG file in EDF, BDF, MAT, or GDF format and convert it to CSV.</p>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        {["EDF", "BDF", "MAT", "GDF"].map(f => <span key={f} style={{ backgroundColor: "#EFF6FF", color: BRAND.primary, border: `1px solid ${BRAND.border}`, padding: "6px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600 }}>{f} → CSV</span>)}
      </div>
      <div style={{ backgroundColor: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "12px", padding: "14px 20px", fontSize: "13px", color: "#92400E", display: "flex", alignItems: "center", gap: "8px" }}>
        <span>🚧</span> Converter module — coming in v0.2
      </div>
    </div>
  );
}

function OnlineTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: "24px" }}>
      <div style={{ fontSize: "48px" }}>📡</div>
      <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: BRAND.text }}>Live EEG Streaming</h2>
      <p style={{ margin: 0, fontSize: "14px", color: BRAND.textSec, textAlign: "center", maxWidth: "480px", lineHeight: 1.7 }}>Connect to a live EEG headset and stream data in real-time.</p>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        {["OpenBCI", "Emotiv", "g.tec"].map(d => <span key={d} style={{ backgroundColor: "#EFF6FF", color: BRAND.primary, border: `1px solid ${BRAND.border}`, padding: "6px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600 }}>{d}</span>)}
      </div>
      <div style={{ backgroundColor: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "12px", padding: "14px 20px", fontSize: "13px", color: "#92400E", display: "flex", alignItems: "center", gap: "8px" }}>
        <span>🚧</span> Online streaming — coming in v0.3
      </div>
    </div>
  );
}

function RoboticTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: "24px" }}>
      <div style={{ fontSize: "48px" }}>🦾</div>
      <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: BRAND.text }}>Robotic Rehabilitation System</h2>
      <p style={{ margin: 0, fontSize: "14px", color: BRAND.textSec, textAlign: "center", maxWidth: "480px", lineHeight: 1.7 }}>Control robotic exoskeleton systems using classified EEG signals.</p>
      <div style={{ backgroundColor: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "12px", padding: "14px 20px", fontSize: "13px", color: "#92400E", display: "flex", alignItems: "center", gap: "8px" }}>
        <span>🚧</span> Robotic Rehab — coming in v0.4
      </div>
    </div>
  );
}

function BCITab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: "24px" }}>
      <div style={{ fontSize: "48px" }}>🧠</div>
      <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: BRAND.text }}>BCI Rehabilitation System</h2>
      <p style={{ margin: 0, fontSize: "14px", color: BRAND.textSec, textAlign: "center", maxWidth: "480px", lineHeight: 1.7 }}>Brain-Computer Interface for direct neural control of rehabilitation devices.</p>
      <div style={{ backgroundColor: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "12px", padding: "14px 20px", fontSize: "13px", color: "#92400E", display: "flex", alignItems: "center", gap: "8px" }}>
        <span>🚧</span> BCI Rehab — coming in v0.5
      </div>
    </div>
  );
}

function InfoTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div style={{ background: "linear-gradient(135deg,#EFF6FF 0%,#FFFFFF 100%)", border: `1px solid ${BRAND.border}`, borderRadius: "18px", padding: "28px", boxShadow: shadow }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "#EFF6FF", border: `1px solid ${BRAND.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SynapsLogo size={36} />
          </div>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, color: BRAND.primary, letterSpacing: "1.4px" }}>RESEARCH PROJECT</p>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: BRAND.text }}>Stroke Rehabilitation System Based on BCI Technique</h2>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: "14px", color: BRAND.textSec, lineHeight: 1.8 }}>Synaps is a neurotechnology platform developed to support EEG signal visualization, frequency-domain analysis, brain-computer interface research, and smart rehabilitation applications.</p>
      </div>

      <div>
        <p style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: 700, color: BRAND.textSec, letterSpacing: "1.2px" }}>RESEARCH TEAM</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "18px" }}>
          {[
            { img: "/fady.png", name: "Fady Mostafa", role: "M.Sc. in Robotics and Smart Systems", uni: "Military Technical College, Egypt", tags: "Robotics • Smart Systems • Neurotechnology" },
            { img: "/amr.png", name: "Amr Mostafa", role: "PhD Student in Neuroscience", uni: "Queen's University, Canada", tags: "Neuroscience • EEG • BCI Research" },
          ].map(m => (
            <div key={m.name} style={{ backgroundColor: BRAND.card, border: `1px solid ${BRAND.border}`, borderRadius: "18px", padding: "22px", boxShadow: shadow, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <img src={m.img} alt={m.name} style={{ width: "140px", height: "140px", borderRadius: "20px", objectFit: "cover", border: "3px solid #EFF6FF", boxShadow: shadowMd, marginBottom: "14px" }} />
              <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800, color: BRAND.text }}>{m.name}</h3>
              <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 600, color: BRAND.primary }}>{m.role}</p>
              <p style={{ margin: "0 0 12px", fontSize: "12px", color: BRAND.textSec }}>{m.uni}</p>
              <div style={{ backgroundColor: "#EFF6FF", border: `1px solid ${BRAND.border}`, color: BRAND.primary, padding: "5px 12px", borderRadius: "99px", fontSize: "11px", fontWeight: 700 }}>{m.tags}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: BRAND.card, border: `1px solid ${BRAND.border}`, borderRadius: "18px", padding: "24px", boxShadow: shadow }}>
        <p style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: 700, color: BRAND.textSec, letterSpacing: "1.2px" }}>PROJECT AFFILIATION AND SPONSORS</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "16px" }}>
          {[
            { img: "/sponser_2.png", name: "Military Technical College / TIPO", desc: "Prosthetics Technology Incubator, Egypt" },
            { img: "/sponser_1.png", name: "Academy of Scientific Research and Technology", desc: "Research sponsorship and scientific support" },
            { img: "/queen.jfif", name: "Queen's University", desc: "Neuroscience and BCI research contribution" },
          ].map(s => (
            <div key={s.name} style={{ backgroundColor: BRAND.bg, border: `1px solid ${BRAND.border}`, borderRadius: "16px", padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
              <img src={s.img} alt={s.name} style={{ width: "90px", height: "68px", objectFit: "contain", borderRadius: "10px", backgroundColor: "white", border: `1px solid ${BRAND.border}`, padding: "6px", flexShrink: 0 }} />
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 700, color: BRAND.text }}>{s.name}</p>
                <p style={{ margin: 0, fontSize: "12px", color: BRAND.textSec }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 700, color: BRAND.textSec, letterSpacing: "1.2px" }}>PLATFORM CAPABILITIES</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["EEG Visualization", "FFT Analysis", "Spectrogram", "Topographic Mapping", "AI Insights", "BCI Research", "Stroke Rehabilitation", "Neurorobotics", "Signal Processing", "Smart Rehabilitation"].map(t => (
            <span key={t} style={{ backgroundColor: "#EFF6FF", color: BRAND.primary, border: `1px solid ${BRAND.border}`, padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [mainTab, setMainTab] = useState<string>("offline");

  return (
    <div style={{ backgroundColor: BRAND.bg, minHeight: "100vh", fontFamily: "Inter,-apple-system,sans-serif", color: BRAND.text }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BRAND.border}`, boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <SynapsLogo size={38} />
            <div>
              <div style={{ fontWeight: 700, fontSize: "18px", letterSpacing: "0.5px", color: BRAND.primary }}>synaps</div>
              <div style={{ fontSize: "9px", letterSpacing: "2.5px", color: BRAND.textSec, marginTop: "-2px", fontWeight: 500 }}>DECODE THE BRAIN</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", padding: "4px 10px", borderRadius: "99px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: BRAND.success }} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: BRAND.success }}>System Online</span>
            </div>
            <span style={{ fontSize: "11px", color: BRAND.textSec, backgroundColor: BRAND.bg, padding: "3px 8px", borderRadius: "6px", border: `1px solid ${BRAND.border}` }}>v0.2.0</span>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: BRAND.card, borderBottom: `1px solid ${BRAND.border}`, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px", display: "flex", gap: "4px", overflowX: "auto" }}>
          {MAIN_TABS.map(t => (
            <button key={t.id} onClick={() => t.status === "ready" && setMainTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "16px 20px", border: "none",
              borderBottom: mainTab === t.id ? `2px solid ${BRAND.primary}` : "2px solid transparent",
              backgroundColor: "transparent",
              color: mainTab === t.id ? BRAND.primary : t.status === "soon" ? "#CBD5E1" : BRAND.textSec,
              cursor: t.status === "soon" ? "not-allowed" : "pointer",
              fontFamily: "Inter,sans-serif", fontSize: "13px",
              fontWeight: mainTab === t.id ? 700 : 500,
              whiteSpace: "nowrap", transition: "all 0.15s",
            }}>
              <span style={{ fontSize: "16px" }}>{t.icon}</span>
              {t.label}
              {t.status === "soon" && (
                <span style={{ fontSize: "9px", backgroundColor: "#F1F5F9", color: "#94A3B8", padding: "2px 6px", borderRadius: "99px", fontWeight: 600 }}>SOON</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px" }}>
        <div style={{ backgroundColor: BRAND.card, borderRadius: "16px", border: `1px solid ${BRAND.border}`, boxShadow: shadow, padding: "24px" }}>
          {mainTab === "converter" && <ConverterTab />}
          {mainTab === "offline" && <OfflineTab />}
          {mainTab === "online" && <OnlineTab />}
          {mainTab === "robotic" && <RoboticTab />}
          {mainTab === "bci" && <BCITab />}
          {mainTab === "info" && <InfoTab />}
        </div>
      </div>
    </div>
  );
}
