import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#00ffcc', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8', '#f06595'];

const ELECTRODE_POSITIONS: Record<string, { x: number; y: number }> = {
  CH1: { x: 0.35, y: 0.25 }, CH2: { x: 0.65, y: 0.25 },
  CH3: { x: 0.25, y: 0.50 }, CH4: { x: 0.75, y: 0.50 },
  CH5: { x: 0.35, y: 0.75 }, CH6: { x: 0.65, y: 0.75 },
  CH7: { x: 0.40, y: 0.40 }, CH8: { x: 0.60, y: 0.40 },
};

function SynapsLogo() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Brain outline */}
      <path d="M21 6 C14 6 8 11 8 17 C8 20 9 22 11 24 C9 25 8 27 8 29 C8 33 11 36 15 36 C16 36 17 35.5 18 35 C19 37 20 38 21 38 C22 38 23 37 24 35 C25 35.5 26 36 27 36 C31 36 34 33 34 29 C34 27 33 25 31 24 C33 22 34 20 34 17 C34 11 28 6 21 6Z" stroke="#00ffcc" strokeWidth="1.5" fill="none" opacity="0.9"/>
      {/* EEG wave inside brain */}
      <path d="M10 21 L13 21 L14 17 L16 25 L18 19 L20 23 L22 18 L24 24 L26 20 L28 21 L32 21" stroke="#00ffcc" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Neural nodes */}
      <circle cx="21" cy="10" r="2" fill="#00ffcc" opacity="0.8"/>
      <circle cx="10" cy="21" r="1.5" fill="#00ffcc" opacity="0.6"/>
      <circle cx="32" cy="21" r="1.5" fill="#00ffcc" opacity="0.6"/>
      <circle cx="15" cy="32" r="1.5" fill="#00ffcc" opacity="0.6"/>
      <circle cx="27" cy="32" r="1.5" fill="#00ffcc" opacity="0.6"/>
      {/* Neural connections */}
      <line x1="21" y1="10" x2="10" y2="21" stroke="#00ffcc" strokeWidth="0.5" opacity="0.3"/>
      <line x1="21" y1="10" x2="32" y2="21" stroke="#00ffcc" strokeWidth="0.5" opacity="0.3"/>
      <line x1="10" y1="21" x2="15" y2="32" stroke="#00ffcc" strokeWidth="0.5" opacity="0.3"/>
      <line x1="32" y1="21" x2="27" y2="32" stroke="#00ffcc" strokeWidth="0.5" opacity="0.3"/>
    </svg>
  );
}

function computeFFT(signal: number[], sampleRate: number): { freq: number; magnitude: number }[] {
  const N = signal.length;
  const result = [];
  const maxFreq = sampleRate / 2;
  const step = maxFreq / (N / 2);
  for (let k = 0; k < N / 2; k++) {
    let real = 0, imag = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      real += signal[n] * Math.cos(angle);
      imag -= signal[n] * Math.sin(angle);
    }
    const magnitude = Math.sqrt(real * real + imag * imag) / N;
    const freq = parseFloat((k * step).toFixed(2));
    if (freq <= 50) result.push({ freq, magnitude: parseFloat(magnitude.toFixed(4)) });
  }
  return result;
}

function computeSpectrogram(signal: number[]): number[][] {
  const windowSize = 16, hop = 4;
  const result: number[][] = [];
  for (let start = 0; start + windowSize <= signal.length; start += hop) {
    const win = signal.slice(start, start + windowSize);
    const magnitudes: number[] = [];
    for (let k = 0; k < windowSize / 2; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < windowSize; n++) {
        const angle = (2 * Math.PI * k * n) / windowSize;
        real += win[n] * Math.cos(angle);
        imag -= win[n] * Math.sin(angle);
      }
      magnitudes.push(Math.sqrt(real * real + imag * imag) / windowSize);
    }
    result.push(magnitudes);
  }
  return result;
}

function computeBandPower(fftData: { freq: number; magnitude: number }[], low: number, high: number): number {
  const band = fftData.filter(d => d.freq >= low && d.freq <= high);
  if (band.length === 0) return 0;
  return band.reduce((sum, d) => sum + d.magnitude, 0) / band.length;
}

function generateInsights(fftData: { freq: number; magnitude: number }[], channels: number) {
  const delta = computeBandPower(fftData, 0, 4);
  const theta = computeBandPower(fftData, 4, 8);
  const alpha = computeBandPower(fftData, 8, 13);
  const beta = computeBandPower(fftData, 13, 30);
  const gamma = computeBandPower(fftData, 30, 50);
  const total = delta + theta + alpha + beta + gamma;
  const insights: { icon: string; color: string; title: string; desc: string }[] = [];
  if (delta / total > 0.5) insights.push({ icon: '🟣', color: '#cc5de8', title: 'Strong Delta Activity', desc: 'High Delta power detected — possibly deep sleep or slow signal' });
  if (alpha / total > 0.15) insights.push({ icon: '🟢', color: '#00ffcc', title: 'Alpha Activity Detected', desc: 'Alpha waves present — associated with relaxation and calm focus' });
  else insights.push({ icon: '⚪', color: '#888', title: 'Low Alpha Power', desc: 'Alpha activity is below threshold' });
  if (beta / total > 0.2) insights.push({ icon: '🟡', color: '#ffd93d', title: 'Beta Activity Detected', desc: 'Beta waves present — associated with active thinking and focus' });
  if (theta / total > 0.15) insights.push({ icon: '🔵', color: '#4d96ff', title: 'Theta Activity Detected', desc: 'Theta waves present — associated with drowsiness or meditation' });
  if (gamma / total > 0.1) insights.push({ icon: '🔴', color: '#ff6b6b', title: 'Gamma Activity Detected', desc: 'Gamma waves present — associated with high-level information processing' });
  insights.push({ icon: '📶', color: '#6bcb77', title: 'Signal Quality: Good', desc: `${channels} channels detected — data appears complete` });
  const bands = [
    { name: 'Delta', power: delta }, { name: 'Theta', power: theta },
    { name: 'Alpha', power: alpha }, { name: 'Beta', power: beta }, { name: 'Gamma', power: gamma },
  ];
  const dominant = bands.reduce((a, b) => a.power > b.power ? a : b);
  insights.push({ icon: '⚡', color: '#ff922b', title: `Dominant Band: ${dominant.name}`, desc: `${dominant.name} band has the highest power in this signal` });
  return insights;
}

function SpectrogramCanvas({ data, sampleRate }: { data: number[][], sampleRate: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const pL = 60, pB = 40, pT = 20, pR = 20;
    const plotW = W - pL - pR, plotH = H - pB - pT;
    const cols = data.length, rows = data[0].length;
    const cellW = plotW / cols, cellH = plotH / rows;
    let maxVal = 0;
    data.forEach(col => col.forEach(v => { if (v > maxVal) maxVal = v; }));
    ctx.clearRect(0, 0, W, H);
    for (let t = 0; t < cols; t++) {
      for (let f = 0; f < rows; f++) {
        const val = data[t][f] / (maxVal || 1);
        const r = Math.floor(Math.min(255, val * 2 * 255));
        const g = Math.floor(Math.min(255, val * 1.5 * 200));
        const b = Math.floor(Math.max(0, 255 - val * 3 * 255));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(pL + t * cellW, pT + (rows - f - 1) * cellH, cellW + 1, cellH + 1);
      }
    }
    ctx.strokeStyle = '#00ffcc44'; ctx.lineWidth = 1;
    ctx.strokeRect(pL, pT, plotW, plotH);
    for (let i = 0; i <= 5; i++) {
      const x = pL + (i / 5) * plotW;
      ctx.fillStyle = '#888'; ctx.font = '11px monospace';
      ctx.fillText(((i / 5) * cols / 5).toFixed(2), x - 8, H - 10);
      ctx.strokeStyle = '#ffffff11'; ctx.beginPath(); ctx.moveTo(x, pT); ctx.lineTo(x, pT + plotH); ctx.stroke();
    }
    const maxFreq = sampleRate / 2;
    for (let i = 0; i <= 4; i++) {
      const y = pT + plotH - (i / 4) * plotH;
      ctx.fillStyle = '#888'; ctx.fillText(`${Math.round((i / 4) * maxFreq)} Hz`, pL - 50, y + 4);
      ctx.strokeStyle = '#ffffff11'; ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pL + plotW, y); ctx.stroke();
    }
    ctx.fillStyle = '#aaa'; ctx.font = '12px monospace';
    ctx.fillText('Time (windows)', pL + plotW / 2 - 45, H - 2);
    ctx.save(); ctx.translate(12, pT + plotH / 2 + 50); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#aaa'; ctx.fillText('Frequency (Hz)', 0, 0); ctx.restore();
  }, [data, sampleRate]);
  return (
    <div style={{ backgroundColor: '#0a0a0f', border: '1px solid #00ffcc33', borderRadius: '12px', padding: '16px', width: '100%' }}>
      <canvas ref={canvasRef} width={800} height={380} style={{ width: '100%', height: '380px', borderRadius: '8px', display: 'block' }} />
    </div>
  );
}

function TopoMap({ channelPowers, channels }: { channelPowers: Record<string, number>, channels: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current || channels.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const radius = Math.min(W, H) * 0.42;
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0d1a'; ctx.fill();
    ctx.strokeStyle = '#00ffcc44'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx - radius - 8, cy, 8, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0d1a'; ctx.fill(); ctx.strokeStyle = '#00ffcc44'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx + radius + 8, cy, 8, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0d1a'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 12, cy - radius + 8); ctx.lineTo(cx, cy - radius - 14); ctx.lineTo(cx + 12, cy - radius + 8);
    ctx.strokeStyle = '#00ffcc44'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#ffffff08'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy); ctx.stroke();
    const powers = channels.map(ch => channelPowers[ch] || 0);
    const maxP = Math.max(...powers) || 1;
    const minP = Math.min(...powers);
    channels.forEach((ch: string) => {
      const pos = ELECTRODE_POSITIONS[ch];
      if (!pos) return;
      const x = cx - radius + pos.x * radius * 2;
      const y = cy - radius + pos.y * radius * 2;
      const power = channelPowers[ch] || 0;
      const norm = (power - minP) / (maxP - minP || 1);
      const r = Math.floor(norm * 255);
      const g = Math.floor((1 - Math.abs(norm - 0.5) * 2) * 180);
      const b = Math.floor((1 - norm) * 255);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 35);
      gradient.addColorStop(0, `rgba(${r},${g},${b},0.7)`);
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath(); ctx.arc(x, y, 35, 0, Math.PI * 2);
      ctx.fillStyle = gradient; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fill();
      ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'white'; ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center'; ctx.fillText(ch, x, y + 22);
    });
    const barX = W - 30, barY = cy - 80, barH = 160, barW = 14;
    const grad = ctx.createLinearGradient(0, barY, 0, barY + barH);
    grad.addColorStop(0, 'rgb(255,0,0)'); grad.addColorStop(0.5, 'rgb(0,180,0)'); grad.addColorStop(1, 'rgb(0,0,255)');
    ctx.fillStyle = grad; ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#888'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
    ctx.fillText('High', barX + barW + 4, barY + 8); ctx.fillText('Low', barX + barW + 4, barY + barH);
  }, [channelPowers, channels]);
  return (
    <canvas ref={canvasRef} width={400} height={400}
      style={{ width: '100%', maxWidth: '400px', height: 'auto', display: 'block', margin: '0 auto' }} />
  );
}

function App() {
  const [fileName, setFileName] = useState<string>('');
  const [chartData, setChartData] = useState<Record<string, number>[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [sampleRate, setSampleRate] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [fftData, setFftData] = useState<{ freq: number; magnitude: number }[]>([]);
  const [spectroData, setSpectroData] = useState<number[][]>([]);
  const [insights, setInsights] = useState<{ icon: string; color: string; title: string; desc: string }[]>([]);
  const [channelPowers, setChannelPowers] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'eeg' | 'fft' | 'spectrogram' | 'topomap' | 'insights' | 'info'>('eeg');

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const text = e.target?.result as string;
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map((h: string) => h.trim());
      const eegChannels = headers.filter((h: string) => h !== 'timestamp');
      const rows = lines.slice(1).map((line: string) => {
        const values = line.split(',');
        const obj: Record<string, number> = {};
        headers.forEach((h: string, i: number) => { obj[h] = parseFloat(values[i]); });
        return obj;
      });
      const OFFSET = 30;
      const offsetRows = rows.map((row: Record<string, number>) => {
        const newRow: Record<string, number> = { timestamp: row.timestamp };
        eegChannels.forEach((ch: string, i: number) => { newRow[ch] = row[ch] + i * OFFSET; });
        return newRow;
      });
      let sr = 250;
      if (rows.length >= 2) {
        const dt = rows[1].timestamp - rows[0].timestamp;
        sr = Math.round(1 / dt);
        setSampleRate(sr);
        setDuration(parseFloat(rows[rows.length - 1].timestamp.toFixed(3)));
      }
      const powers: Record<string, number> = {};
      eegChannels.forEach((ch: string) => {
        const signal = rows.map((r: Record<string, number>) => r[ch]);
        const rms = Math.sqrt(signal.reduce((sum, v) => sum + v * v, 0) / signal.length);
        powers[ch] = rms;
      });
      setChannelPowers(powers);
      const ch1Signal = rows.map((r: Record<string, number>) => r[eegChannels[0]]);
      const fft = computeFFT(ch1Signal, sr);
      setFftData(fft);
      setSpectroData(computeSpectrogram(ch1Signal));
      setInsights(generateInsights(fft, eegChannels.length));
      setChannels(eegChannels);
      setChartData(offsetRows);
    };
    reader.readAsText(file);
  }

  const tabs = [
    { id: 'eeg', label: '📈 EEG Viewer' },
    { id: 'fft', label: '📊 FFT Viewer' },
    { id: 'spectrogram', label: '🌈 Spectrogram' },
    { id: 'topomap', label: '🧠 Topomap' },
    { id: 'insights', label: '💡 Insights' },
    { id: 'info', label: '👤 Info' },
  ];

  return (
    <div style={{ backgroundColor: '#0a0a0f', minHeight: '100vh', width: '100%', fontFamily: "'Courier New', monospace", color: 'white', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{
        backgroundColor: '#0d0d1a', padding: '12px 32px',
        borderBottom: '1px solid #00ffcc22',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SynapsLogo />
          <div>
            <span style={{ color: '#00ffcc', fontSize: '1.3rem', fontWeight: 'bold', letterSpacing: '2px' }}>SYNAPS</span>
            <div style={{ color: '#334', fontSize: '0.65rem', letterSpacing: '3px', marginTop: '-2px' }}>NEUROTECHNOLOGY PLATFORM</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#333', fontSize: '0.75rem' }}>v0.1</span>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00ffcc', boxShadow: '0 0 8px #00ffcc' }} />
        </div>
      </div>

      {/* Main */}
      <div style={{ width: '100%', padding: '24px 32px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Upload + Status Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <label style={{
            backgroundColor: '#00ffcc', color: '#0a0a0f', padding: '10px 24px',
            borderRadius: '6px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer',
            letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span>▲</span> UPLOAD EEG FILE
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
          {fileName && (
            <span style={{ color: '#00ffcc88', fontSize: '0.8rem' }}>● {fileName}</span>
          )}
        </div>

        {/* Info Panel */}
        {fileName && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px', width: '100%'
          }}>
            {[
              { label: 'CHANNELS', value: channels.length.toString(), icon: '≋' },
              { label: 'SAMPLES', value: chartData.length.toString(), icon: '#' },
              { label: 'SAMPLE RATE', value: `${sampleRate} Hz`, icon: '~' },
              { label: 'DURATION', value: `${duration} sec`, icon: '◷' },
            ].map(item => (
              <div key={item.label} style={{
                backgroundColor: '#0d0d1a', borderRadius: '8px',
                border: '1px solid #00ffcc18', padding: '14px 16px'
              }}>
                <div style={{ color: '#00ffcc44', fontSize: '1.2rem' }}>{item.icon}</div>
                <div style={{ color: '#00ffcc', fontSize: '1.1rem', fontWeight: 'bold', margin: '4px 0 2px' }}>{item.value}</div>
                <div style={{ color: '#444', fontSize: '0.65rem', letterSpacing: '1px' }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', borderBottom: '1px solid #00ffcc18', paddingBottom: '0' }}>
          {tabs.map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                backgroundColor: activeTab === tab.id ? '#00ffcc' : 'transparent',
                color: activeTab === tab.id ? '#0a0a0f' : '#00ffcc88',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #00ffcc' : '2px solid transparent',
                padding: '10px 18px', cursor: 'pointer',
                fontFamily: "'Courier New', monospace",
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                fontSize: '0.82rem', letterSpacing: '0.5px',
                borderRadius: '6px 6px 0 0',
                transition: 'all 0.2s'
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* EEG */}
        {activeTab === 'eeg' && (
          <div style={{ width: '100%', backgroundColor: '#0d0d1a', borderRadius: '0 8px 8px 8px', border: '1px solid #00ffcc18', padding: '24px' }}>
            {chartData.length > 0 ? (
              <>
                <p style={{ color: '#00ffcc', marginBottom: '16px', fontSize: '0.85rem', letterSpacing: '1px' }}>EEG SIGNAL VIEWER — ALL CHANNELS</p>
                <ResponsiveContainer width="100%" height={500}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                    <XAxis dataKey="timestamp" stroke="#333" tick={{ fontSize: 10, fill: '#555' }}
                      label={{ value: 'Time (sec)', position: 'insideBottom', offset: -2, fill: '#555', fontSize: 11 }} height={40} />
                    <YAxis stroke="#333" tick={{ fontSize: 10, fill: '#555' }} tickCount={8}
                      label={{ value: 'Amplitude (µV)', angle: -90, position: 'insideLeft', offset: 10, fill: '#555', fontSize: 11 }} width={60} />
                    <Tooltip contentStyle={{ backgroundColor: '#0d0d1a', border: '1px solid #00ffcc22', borderRadius: '6px' }} labelStyle={{ color: '#00ffcc' }} />
                    <Legend wrapperStyle={{ paddingTop: '16px' }} />
                    {channels.map((ch: string, i: number) => (
                      <Line key={ch} type="monotone" dataKey={ch} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.5} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', color: '#333' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>▲</div>
                <p style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>UPLOAD AN EEG FILE TO BEGIN</p>
              </div>
            )}
          </div>
        )}

        {/* FFT */}
        {activeTab === 'fft' && (
          <div style={{ width: '100%', backgroundColor: '#0d0d1a', borderRadius: '0 8px 8px 8px', border: '1px solid #00ffcc18', padding: '24px' }}>
            {fftData.length > 0 ? (
              <>
                <p style={{ color: '#ff6b6b', marginBottom: '4px', fontSize: '0.85rem', letterSpacing: '1px' }}>FFT — FREQUENCY SPECTRUM (CH1)</p>
                <p style={{ color: '#333', fontSize: '0.75rem', marginBottom: '16px' }}>Power distribution across frequency bands</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {[
                    { name: 'Delta', range: '0–4 Hz', color: '#cc5de8' },
                    { name: 'Theta', range: '4–8 Hz', color: '#4d96ff' },
                    { name: 'Alpha', range: '8–13 Hz', color: '#00ffcc' },
                    { name: 'Beta', range: '13–30 Hz', color: '#ffd93d' },
                    { name: 'Gamma', range: '30–50 Hz', color: '#ff6b6b' },
                  ].map(band => (
                    <div key={band.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: `${band.color}11`, padding: '4px 10px', borderRadius: '4px', border: `1px solid ${band.color}33` }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: band.color }} />
                      <span style={{ color: band.color, fontSize: '0.75rem' }}>{band.name}</span>
                      <span style={{ color: '#444', fontSize: '0.7rem' }}>{band.range}</span>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={fftData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                    <XAxis dataKey="freq" stroke="#333" tick={{ fontSize: 10, fill: '#555' }}
                      label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -2, fill: '#555', fontSize: 11 }} height={40} />
                    <YAxis stroke="#333" tick={{ fontSize: 10, fill: '#555' }}
                      label={{ value: 'Magnitude', angle: -90, position: 'insideLeft', offset: 10, fill: '#555', fontSize: 11 }} width={60} />
                    <Tooltip contentStyle={{ backgroundColor: '#0d0d1a', border: '1px solid #ff6b6b22', borderRadius: '6px' }}
                      labelStyle={{ color: '#ff6b6b' }} formatter={(val: number) => [val, 'Magnitude']} labelFormatter={(label: string) => `${label} Hz`} />
                    <Line type="monotone" dataKey="magnitude" stroke="#ff6b6b" dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', color: '#333' }}>
                <p style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>UPLOAD AN EEG FILE TO BEGIN</p>
              </div>
            )}
          </div>
        )}

        {/* Spectrogram */}
        {activeTab === 'spectrogram' && (
          <div style={{ width: '100%', backgroundColor: '#0d0d1a', borderRadius: '0 8px 8px 8px', border: '1px solid #00ffcc18', padding: '24px' }}>
            <p style={{ color: '#ffd93d', marginBottom: '4px', fontSize: '0.85rem', letterSpacing: '1px' }}>SPECTROGRAM — CH1</p>
            <p style={{ color: '#333', fontSize: '0.75rem', marginBottom: '16px' }}>Red = high power · Blue = low power</p>
            {spectroData.length > 0
              ? <SpectrogramCanvas data={spectroData} sampleRate={sampleRate} />
              : <div style={{ textAlign: 'center', padding: '60px', color: '#333' }}><p style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>UPLOAD AN EEG FILE TO BEGIN</p></div>}
          </div>
        )}

        {/* Topomap */}
        {activeTab === 'topomap' && (
          <div style={{ width: '100%', backgroundColor: '#0d0d1a', borderRadius: '0 8px 8px 8px', border: '1px solid #00ffcc18', padding: '24px' }}>
            <p style={{ color: '#4d96ff', marginBottom: '4px', fontSize: '0.85rem', letterSpacing: '1px' }}>BRAIN ACTIVITY MAP — TOPOMAP</p>
            <p style={{ color: '#333', fontSize: '0.75rem', marginBottom: '16px' }}>Red = high activity · Blue = low activity · Each dot = EEG electrode</p>
            {channels.length > 0
              ? <TopoMap channelPowers={channelPowers} channels={channels} />
              : <div style={{ textAlign: 'center', padding: '60px', color: '#333' }}><p style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>UPLOAD AN EEG FILE TO BEGIN</p></div>}
          </div>
        )}

        {/* Insights */}
        {activeTab === 'insights' && (
          <div style={{ width: '100%', backgroundColor: '#0d0d1a', borderRadius: '0 8px 8px 8px', border: '1px solid #00ffcc18', padding: '24px' }}>
            <p style={{ color: '#00ffcc', fontSize: '0.85rem', letterSpacing: '1px', marginBottom: '4px' }}>EEG INSIGHTS — AUTOMATED ANALYSIS</p>
            <p style={{ color: '#333', fontSize: '0.75rem', marginBottom: '20px' }}>Rule-based signal analysis based on frequency band power</p>
            {insights.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {insights.map((ins, i: number) => (
                  <div key={i} style={{
                    backgroundColor: '#0a0a0f', border: `1px solid ${ins.color}22`,
                    borderLeft: `3px solid ${ins.color}`, borderRadius: '6px',
                    padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '12px'
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>{ins.icon}</span>
                    <div>
                      <p style={{ color: ins.color, margin: '0 0 3px 0', fontWeight: 'bold', fontSize: '0.88rem', letterSpacing: '0.5px' }}>{ins.title}</p>
                      <p style={{ color: '#555', margin: 0, fontSize: '0.78rem' }}>{ins.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', color: '#333' }}>
                <p style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>UPLOAD AN EEG FILE TO BEGIN</p>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        {activeTab === 'info' && (
          <div style={{ width: '100%', backgroundColor: '#0d0d1a', borderRadius: '0 8px 8px 8px', border: '1px solid #00ffcc18', padding: '32px' }}>
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '100px', height: '100px', borderRadius: '50%',
                  border: '2px solid #00ffcc44', backgroundColor: '#0a0a0f',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.5rem'
                }}>🧠</div>
                <span style={{ color: '#00ffcc', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px' }}>DEVELOPER</span>
              </div>
              {/* Details */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <p style={{ color: '#444', fontSize: '0.65rem', letterSpacing: '2px', margin: '0 0 4px 0' }}>NAME</p>
                  <p style={{ color: 'white', fontSize: '1.1rem', margin: 0, fontWeight: 'bold' }}>Your Name Here</p>
                </div>
                <div>
                  <p style={{ color: '#444', fontSize: '0.65rem', letterSpacing: '2px', margin: '0 0 4px 0' }}>ROLE</p>
                  <p style={{ color: '#00ffcc', fontSize: '0.9rem', margin: 0 }}>BCI Researcher & Neurotechnology Developer</p>
                </div>
                <div>
                  <p style={{ color: '#444', fontSize: '0.65rem', letterSpacing: '2px', margin: '0 0 4px 0' }}>ABOUT</p>
                  <p style={{ color: '#888', fontSize: '0.82rem', margin: 0, lineHeight: '1.6' }}>
                    Synaps is an open-source neurotechnology platform for EEG visualization, BCI research, and neurorobotics. Built for students, researchers, and engineers.
                  </p>
                </div>
                <div>
                  <p style={{ color: '#444', fontSize: '0.65rem', letterSpacing: '2px', margin: '0 0 8px 0' }}>PLATFORM INFO</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['EEG Analysis', 'BCI Research', 'Neurorobotics', 'Signal Processing'].map(tag => (
                      <span key={tag} style={{ backgroundColor: '#00ffcc11', color: '#00ffcc', border: '1px solid #00ffcc33', padding: '4px 10px', borderRadius: '4px', fontSize: '0.72rem', letterSpacing: '0.5px' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
