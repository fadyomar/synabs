import { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = [
  '#00ffcc',
  '#ff6b6b',
  '#ffd93d',
  '#6bcb77',
  '#4d96ff',
  '#ff922b',
  '#cc5de8',
  '#f06595',
];

function computeFFT(signal: number[], sampleRate: number) {
  const N = signal.length;
  const result = [];
  const maxFreq = sampleRate / 2;
  const step = maxFreq / (N / 2);
  for (let k = 0; k < N / 2; k++) {
    let real = 0,
      imag = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      real += signal[n] * Math.cos(angle);
      imag -= signal[n] * Math.sin(angle);
    }
    const magnitude = Math.sqrt(real * real + imag * imag) / N;
    const freq = parseFloat((k * step).toFixed(2));
    if (freq <= 50)
      result.push({ freq, magnitude: parseFloat(magnitude.toFixed(4)) });
  }
  return result;
}

function computeSpectrogram(signal: number[], sampleRate: number) {
  const windowSize = 16;
  const hop = 4;
  const result: number[][] = [];
  for (let start = 0; start + windowSize <= signal.length; start += hop) {
    const window = signal.slice(start, start + windowSize);
    const magnitudes: number[] = [];
    for (let k = 0; k < windowSize / 2; k++) {
      let real = 0,
        imag = 0;
      for (let n = 0; n < windowSize; n++) {
        const angle = (2 * Math.PI * k * n) / windowSize;
        real += window[n] * Math.cos(angle);
        imag -= window[n] * Math.sin(angle);
      }
      magnitudes.push(Math.sqrt(real * real + imag * imag) / windowSize);
    }
    result.push(magnitudes);
  }
  return result;
}

function computeBandPower(fftData: any[], low: number, high: number) {
  const band = fftData.filter((d) => d.freq >= low && d.freq <= high);
  if (band.length === 0) return 0;
  return band.reduce((sum, d) => sum + d.magnitude, 0) / band.length;
}

function generateInsights(fftData: any[], channels: number) {
  const delta = computeBandPower(fftData, 0, 4);
  const theta = computeBandPower(fftData, 4, 8);
  const alpha = computeBandPower(fftData, 8, 13);
  const beta = computeBandPower(fftData, 13, 30);
  const gamma = computeBandPower(fftData, 30, 50);
  const total = delta + theta + alpha + beta + gamma;

  const insights: {
    icon: string;
    color: string;
    title: string;
    desc: string;
  }[] = [];

  // Delta
  if (delta / total > 0.5) {
    insights.push({
      icon: '🟣',
      color: '#cc5de8',
      title: 'Strong Delta Activity',
      desc: 'إشارة Delta عالية — ممكن تكون نوم عميق أو إشارة بطيئة',
    });
  }

  // Alpha
  if (alpha / total > 0.15) {
    insights.push({
      icon: '🟢',
      color: '#00ffcc',
      title: 'Alpha Activity Detected',
      desc: 'نشاط Alpha موجود — علامة على الاسترخاء أو التركيز الهادئ',
    });
  } else {
    insights.push({
      icon: '⚪',
      color: '#888',
      title: 'Low Alpha Power',
      desc: 'نشاط Alpha منخفض',
    });
  }

  // Beta
  if (beta / total > 0.2) {
    insights.push({
      icon: '🟡',
      color: '#ffd93d',
      title: 'Beta Activity Detected',
      desc: 'نشاط Beta موجود — علامة على التركيز أو النشاط الذهني',
    });
  }

  // Theta
  if (theta / total > 0.15) {
    insights.push({
      icon: '🔵',
      color: '#4d96ff',
      title: 'Theta Activity Detected',
      desc: 'نشاط Theta موجود — ممكن يكون نعاس أو تأمل',
    });
  }

  // Gamma
  if (gamma / total > 0.1) {
    insights.push({
      icon: '🔴',
      color: '#ff6b6b',
      title: 'Gamma Activity Detected',
      desc: 'نشاط Gamma موجود — معالجة معلومات عالية',
    });
  }

  // Signal Quality
  insights.push({
    icon: '📶',
    color: '#6bcb77',
    title: `Signal Quality: Good`,
    desc: `${channels} قنوات — البيانات مكتملة`,
  });

  // Dominant band
  const bands = [
    { name: 'Delta', power: delta },
    { name: 'Theta', power: theta },
    { name: 'Alpha', power: alpha },
    { name: 'Beta', power: beta },
    { name: 'Gamma', power: gamma },
  ];
  const dominant = bands.reduce((a, b) => (a.power > b.power ? a : b));
  insights.push({
    icon: '⚡',
    color: '#ff922b',
    title: `Dominant Band: ${dominant.name}`,
    desc: `الـ ${dominant.name} عنده أعلى طاقة في الإشارة`,
  });

  return insights;
}

function SpectrogramCanvas({
  data,
  sampleRate,
}: {
  data: number[][];
  sampleRate: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const paddingLeft = 60,
      paddingBottom = 40,
      paddingTop = 20,
      paddingRight = 20;
    const plotW = W - paddingLeft - paddingRight;
    const plotH = H - paddingBottom - paddingTop;
    const cols = data.length;
    const rows = data[0].length;
    const cellW = plotW / cols;
    const cellH = plotH / rows;

    let maxVal = 0;
    data.forEach((col) =>
      col.forEach((v) => {
        if (v > maxVal) maxVal = v;
      })
    );
    ctx.clearRect(0, 0, W, H);

    for (let t = 0; t < cols; t++) {
      for (let f = 0; f < rows; f++) {
        const val = data[t][f] / (maxVal || 1);
        const r = Math.floor(Math.min(255, val * 2 * 255));
        const g = Math.floor(Math.min(255, val * 1.5 * 200));
        const b = Math.floor(Math.max(0, 255 - val * 3 * 255));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(
          paddingLeft + t * cellW,
          paddingTop + (rows - f - 1) * cellH,
          cellW + 1,
          cellH + 1
        );
      }
    }

    ctx.strokeStyle = '#00ffcc44';
    ctx.lineWidth = 1;
    ctx.strokeRect(paddingLeft, paddingTop, plotW, plotH);
    ctx.font = '11px monospace';

    const timeSteps = 5;
    for (let i = 0; i <= timeSteps; i++) {
      const x = paddingLeft + (i / timeSteps) * plotW;
      const timeVal = (((i / timeSteps) * cols) / timeSteps).toFixed(2);
      ctx.fillStyle = '#888888';
      ctx.fillText(timeVal, x - 8, H - 10);
      ctx.strokeStyle = '#ffffff11';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, paddingTop + plotH);
      ctx.stroke();
    }

    const maxFreq = sampleRate / 2;
    const freqSteps = 4;
    for (let i = 0; i <= freqSteps; i++) {
      const y = paddingTop + plotH - (i / freqSteps) * plotH;
      const freqVal = Math.round((i / freqSteps) * maxFreq);
      ctx.fillStyle = '#888888';
      ctx.fillText(`${freqVal} Hz`, paddingLeft - 50, y + 4);
      ctx.strokeStyle = '#ffffff11';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + plotW, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '12px monospace';
    ctx.fillText('Time (windows)', paddingLeft + plotW / 2 - 45, H - 2);
    ctx.save();
    ctx.translate(12, paddingTop + plotH / 2 + 50);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('Frequency (Hz)', 0, 0);
    ctx.restore();
  }, [data, sampleRate]);

  return (
    <div
      style={{
        backgroundColor: '#0a0a0f',
        border: '1px solid #00ffcc33',
        borderRadius: '12px',
        padding: '16px',
        width: '100%',
      }}
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={380}
        style={{
          width: '100%',
          height: '380px',
          borderRadius: '8px',
          display: 'block',
        }}
      />
    </div>
  );
}

function App() {
  const [fileName, setFileName] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [sampleRate, setSampleRate] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fftData, setFftData] = useState<any[]>([]);
  const [spectroData, setSpectroData] = useState<number[][]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    'eeg' | 'fft' | 'spectrogram' | 'insights'
  >('eeg');

  function handleFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map((h: string) => h.trim());
      const eegChannels = headers.filter((h: string) => h !== 'timestamp');

      const rows = lines.slice(1).map((line: string) => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((h: string, i: number) => {
          obj[h] = parseFloat(values[i]);
        });
        return obj;
      });

      const OFFSET = 30;
      const offsetRows = rows.map((row: any) => {
        const newRow: any = { timestamp: row.timestamp };
        eegChannels.forEach((ch, i) => {
          newRow[ch] = row[ch] + i * OFFSET;
        });
        return newRow;
      });

      let sr = 250;
      if (rows.length >= 2) {
        const dt = rows[1].timestamp - rows[0].timestamp;
        sr = Math.round(1 / dt);
        setSampleRate(sr);
        setDuration(parseFloat(rows[rows.length - 1].timestamp.toFixed(3)));
      }

      const ch1Signal = rows.map((r: any) => r[eegChannels[0]]);
      const fft = computeFFT(ch1Signal, sr);
      setFftData(fft);
      setSpectroData(computeSpectrogram(ch1Signal, sr));
      setInsights(generateInsights(fft, eegChannels.length));
      setChannels(eegChannels);
      setChartData(offsetRows);
    };
    reader.readAsText(file);
  }

  return (
    <div
      style={{
        backgroundColor: '#0a0a0f',
        minHeight: '100vh',
        fontFamily: 'monospace',
        color: 'white',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: '#0d0d1a',
          padding: '16px 32px',
          borderBottom: '1px solid #00ffcc33',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>⚡</span>
        <span
          style={{ color: '#00ffcc', fontSize: '1.4rem', fontWeight: 'bold' }}
        >
          Synaps
        </span>
        <span style={{ color: '#444', fontSize: '0.8rem', marginLeft: '8px' }}>
          v0.1 — Neurotechnology Platform
        </span>
      </div>

      <div
        style={{
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        {/* Upload */}
        <label
          style={{
            backgroundColor: '#00ffcc',
            color: '#0a0a0f',
            padding: '12px 28px',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          📂 Upload EEG
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </label>

        {/* Info Panel */}
        {fileName && (
          <div
            style={{
              width: '100%',
              backgroundColor: '#0d0d1a',
              borderRadius: '12px',
              border: '1px solid #00ffcc33',
              padding: '20px 24px',
              display: 'flex',
              gap: '32px',
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'FILE', value: `📄 ${fileName}` },
              { label: 'CHANNELS', value: `📊 ${channels.length}` },
              { label: 'SAMPLES', value: `🔢 ${chartData.length}` },
              { label: 'SAMPLE RATE', value: `⚡ ${sampleRate} Hz` },
              { label: 'DURATION', value: `⏱️ ${duration} sec` },
            ].map((item) => (
              <div key={item.label}>
                <p
                  style={{
                    color: '#555',
                    fontSize: '0.75rem',
                    margin: '0 0 4px 0',
                  }}
                >
                  {item.label}
                </p>
                <p style={{ color: '#00ffcc', fontSize: '0.95rem', margin: 0 }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        {chartData.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignSelf: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            {[
              { id: 'eeg', label: '📈 EEG Viewer' },
              { id: 'fft', label: '📊 FFT Viewer' },
              { id: 'spectrogram', label: '🌈 Spectrogram' },
              { id: 'insights', label: '🧠 Insights' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  backgroundColor:
                    activeTab === tab.id ? '#00ffcc' : 'transparent',
                  color: activeTab === tab.id ? '#0a0a0f' : '#00ffcc',
                  border: '1px solid #00ffcc',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* EEG Chart */}
        {activeTab === 'eeg' && chartData.length > 0 && (
          <div
            style={{
              width: '100%',
              backgroundColor: '#0d0d1a',
              borderRadius: '12px',
              border: '1px solid #00ffcc22',
              padding: '24px',
            }}
          >
            <p style={{ color: '#00ffcc', marginBottom: '16px' }}>
              📈 EEG Signals — All Channels
            </p>
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#555"
                  tick={{ fontSize: 10, fill: '#888' }}
                  label={{
                    value: 'Time (sec)',
                    position: 'insideBottom',
                    offset: -2,
                    fill: '#888',
                    fontSize: 11,
                  }}
                  height={40}
                />
                <YAxis
                  stroke="#555"
                  tick={{ fontSize: 10, fill: '#888' }}
                  tickCount={8}
                  label={{
                    value: 'Amplitude (µV)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 10,
                    fill: '#888',
                    fontSize: 11,
                  }}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d0d1a',
                    border: '1px solid #00ffcc33',
                  }}
                  labelStyle={{ color: '#00ffcc' }}
                />
                <Legend wrapperStyle={{ paddingTop: '16px' }} />
                {channels.map((ch, i) => (
                  <Line
                    key={ch}
                    type="monotone"
                    dataKey={ch}
                    stroke={COLORS[i % COLORS.length]}
                    dot={false}
                    strokeWidth={1.5}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* FFT Chart */}
        {activeTab === 'fft' && fftData.length > 0 && (
          <div
            style={{
              width: '100%',
              backgroundColor: '#0d0d1a',
              borderRadius: '12px',
              border: '1px solid #ff6b6b22',
              padding: '24px',
            }}
          >
            <p style={{ color: '#ff6b6b', marginBottom: '4px' }}>
              📊 FFT — Frequency Spectrum (CH1)
            </p>
            <p
              style={{
                color: '#555',
                fontSize: '0.78rem',
                marginBottom: '16px',
              }}
            >
              بيوضح القوة عند كل تردد في الإشارة
            </p>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '16px',
              }}
            >
              {[
                { name: 'Delta', range: '0-4 Hz', color: '#cc5de8' },
                { name: 'Theta', range: '4-8 Hz', color: '#4d96ff' },
                { name: 'Alpha', range: '8-13 Hz', color: '#00ffcc' },
                { name: 'Beta', range: '13-30 Hz', color: '#ffd93d' },
                { name: 'Gamma', range: '30-50 Hz', color: '#ff6b6b' },
              ].map((band) => (
                <div
                  key={band.name}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '2px',
                      backgroundColor: band.color,
                    }}
                  />
                  <span style={{ color: band.color, fontSize: '0.78rem' }}>
                    {band.name} {band.range}
                  </span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={fftData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis
                  dataKey="freq"
                  stroke="#555"
                  tick={{ fontSize: 10, fill: '#888' }}
                  label={{
                    value: 'Frequency (Hz)',
                    position: 'insideBottom',
                    offset: -2,
                    fill: '#888',
                    fontSize: 11,
                  }}
                  height={40}
                />
                <YAxis
                  stroke="#555"
                  tick={{ fontSize: 10, fill: '#888' }}
                  label={{
                    value: 'Magnitude',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 10,
                    fill: '#888',
                    fontSize: 11,
                  }}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d0d1a',
                    border: '1px solid #ff6b6b33',
                  }}
                  labelStyle={{ color: '#ff6b6b' }}
                  formatter={(val: any) => [val, 'Magnitude']}
                  labelFormatter={(label) => `Freq: ${label} Hz`}
                />
                <Line
                  type="monotone"
                  dataKey="magnitude"
                  stroke="#ff6b6b"
                  dot={false}
                  strokeWidth={1.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Spectrogram */}
        {activeTab === 'spectrogram' && (
          <div
            style={{
              width: '100%',
              backgroundColor: '#0d0d1a',
              borderRadius: '12px',
              border: '1px solid #ffd93d22',
              padding: '24px',
            }}
          >
            <p style={{ color: '#ffd93d', marginBottom: '4px' }}>
              🌈 Spectrogram — CH1
            </p>
            <p
              style={{
                color: '#555',
                fontSize: '0.78rem',
                marginBottom: '16px',
              }}
            >
              اللون الأحمر = طاقة عالية — الأزرق = طاقة منخفضة
            </p>
            {spectroData.length > 0 ? (
              <SpectrogramCanvas data={spectroData} sampleRate={sampleRate} />
            ) : (
              <p style={{ color: '#555' }}>ارفع ملف الأول</p>
            )}
          </div>
        )}

        {/* Insights */}
        {activeTab === 'insights' && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <p
              style={{
                color: '#00ffcc',
                fontSize: '1.1rem',
                margin: '0 0 8px 0',
              }}
            >
              🧠 EEG Insights — CH1
            </p>
            <p
              style={{
                color: '#555',
                fontSize: '0.78rem',
                margin: '0 0 16px 0',
              }}
            >
              تحليل أوتوماتيك للإشارة بناءً على قوة كل نطاق تردد
            </p>
            {insights.length > 0 ? (
              insights.map((ins, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: '#0d0d1a',
                    border: `1px solid ${ins.color}33`,
                    borderLeft: `4px solid ${ins.color}`,
                    borderRadius: '10px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{ins.icon}</span>
                  <div>
                    <p
                      style={{
                        color: ins.color,
                        margin: '0 0 4px 0',
                        fontWeight: 'bold',
                        fontSize: '0.95rem',
                      }}
                    >
                      {ins.title}
                    </p>
                    <p
                      style={{ color: '#888', margin: 0, fontSize: '0.82rem' }}
                    >
                      {ins.desc}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#555' }}>ارفع ملف الأول</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
