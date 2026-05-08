```tsx
import '@fontsource/inter';
import { useState } from 'react';
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

const THEME = {
  background: '#F4F7FB',
  surface: '#FFFFFF',

  primary: '#0A84C6',
  primarySoft: '#D9EEF9',
  accent: '#1B6CA8',

  text: '#0F172A',
  textSecondary: '#64748B',

  border: '#DCE6F1',

  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const COLORS = [
  '#0A84C6',
  '#1B6CA8',
  '#2563EB',
  '#0F766E',
  '#14B8A6',
  '#0891B2',
  '#4F46E5',
  '#7C3AED',
];

function SynapsLogo() {
  return (
    <img
      src="/logo.png"
      alt="Synaps"
      style={{
        width: 42,
        height: 42,
        objectFit: 'contain',
      }}
    />
  );
}

function App() {
  const [fileName, setFileName] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('eeg');

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;

      const lines = text.trim().split('\n');

      const headers = lines[0]
        .split(',')
        .map((h) => h.trim());

      const eegChannels = headers.filter(
        (h) => h !== 'timestamp'
      );

      const rows = lines.slice(1).map((line) => {
        const values = line.split(',');

        const obj: any = {};

        headers.forEach((h, i) => {
          obj[h] = parseFloat(values[i]);
        });

        return obj;
      });

      const OFFSET = 30;

      const offsetRows = rows.map((row) => {
        const newRow: any = {
          timestamp: row.timestamp,
        };

        eegChannels.forEach((ch, i) => {
          newRow[ch] = row[ch] + i * OFFSET;
        });

        return newRow;
      });

      setChannels(eegChannels);
      setChartData(offsetRows);
    };

    reader.readAsText(file);
  }

  const tabs = [
    { id: 'eeg', label: 'EEG Viewer' },
    { id: 'fft', label: 'FFT Viewer' },
    { id: 'spectrogram', label: 'Spectrogram' },
    { id: 'topomap', label: 'Topomap' },
    { id: 'insights', label: 'Insights' },
  ];

  return (
    <div
      style={{
        backgroundColor: THEME.background,
        minHeight: '100vh',
        width: '100%',
        fontFamily: "'Inter', sans-serif",
        color: THEME.text,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          backgroundColor: THEME.surface,
          padding: '18px 40px',
          borderBottom: `1px solid ${THEME.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <SynapsLogo />

          <div>
            <div
              style={{
                color: THEME.primary,
                fontSize: '1.55rem',
                fontWeight: 700,
                letterSpacing: '-0.5px',
              }}
            >
              SYNAPS
            </div>

            <div
              style={{
                color: THEME.textSecondary,
                fontSize: '0.72rem',
                letterSpacing: '3px',
                marginTop: '2px',
                fontWeight: 500,
              }}
            >
              DECODE THE BRAIN
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: THEME.success,
            }}
          />

          <span
            style={{
              color: THEME.textSecondary,
              fontSize: '0.85rem',
            }}
          >
            Synaps v0.1
          </span>
        </div>
      </div>

      {/* MAIN */}
      <div
        style={{
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* HERO */}
        <div
          style={{
            backgroundColor: THEME.surface,
            border: `1px solid ${THEME.border}`,
            borderRadius: 20,
            padding: '32px',
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: THEME.text,
                }}
              >
                Neurotechnology Platform
              </h1>

              <p
                style={{
                  marginTop: 10,
                  color: THEME.textSecondary,
                  fontSize: '1rem',
                  maxWidth: 700,
                  lineHeight: 1.7,
                }}
              >
                Upload, visualize, analyze, and explore EEG
                signals through a modern neuroscience
                interface built for BCI research and
                neurorobotics.
              </p>
            </div>

            <label
              style={{
                backgroundColor: THEME.primary,
                color: 'white',
                padding: '14px 24px',
                borderRadius: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow:
                  '0 4px 12px rgba(10,132,198,0.18)',
                transition: 'all 0.2s ease',
              }}
            >
              Upload EEG CSV

              <input
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {fileName && (
            <div
              style={{
                marginTop: 20,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                backgroundColor: THEME.primarySoft,
                padding: '10px 14px',
                borderRadius: 12,
                color: THEME.primary,
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              EEG File Loaded • {fileName}
            </div>
          )}
        </div>

        {/* TABS */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                backgroundColor:
                  activeTab === tab.id
                    ? THEME.primary
                    : 'transparent',

                color:
                  activeTab === tab.id
                    ? 'white'
                    : THEME.textSecondary,

                border: 'none',

                padding: '10px 18px',

                cursor: 'pointer',

                fontFamily: "'Inter', sans-serif",

                fontWeight: 600,

                fontSize: '0.84rem',

                borderRadius: '12px',

                transition: 'all 0.2s ease',

                boxShadow:
                  activeTab === tab.id
                    ? '0 4px 12px rgba(10,132,198,0.18)'
                    : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* EEG VIEWER */}
        {activeTab === 'eeg' && (
          <div
            style={{
              backgroundColor: THEME.surface,
              border: `1px solid ${THEME.border}`,
              borderRadius: 20,
              padding: 28,
              boxShadow:
                '0 1px 2px rgba(15,23,42,0.04)',
            }}
          >
            <div
              style={{
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.2rem',
                  color: THEME.text,
                }}
              >
                EEG Signal Viewer
              </h2>

              <p
                style={{
                  color: THEME.textSecondary,
                  marginTop: 8,
                  fontSize: '0.92rem',
                }}
              >
                Multi-channel EEG visualization in the
                time domain.
              </p>
            </div>

            {chartData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={520}
              >
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E2E8F0"
                  />

                  <XAxis
                    dataKey="timestamp"
                    stroke="#CBD5E1"
                    tick={{
                      fontSize: 11,
                      fill: '#64748B',
                    }}
                  />

                  <YAxis
                    stroke="#CBD5E1"
                    tick={{
                      fontSize: 11,
                      fill: '#64748B',
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${THEME.border}`,
                      borderRadius: 12,
                    }}
                  />

                  <Legend />

                  {channels.map((ch, i) => (
                    <Line
                      key={ch}
                      type="monotone"
                      dataKey={ch}
                      stroke={
                        COLORS[i % COLORS.length]
                      }
                      dot={false}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: 420,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: THEME.textSecondary,
                }}
              >
                <div
                  style={{
                    fontSize: '3rem',
                    marginBottom: 14,
                  }}
                >
                  🧠
                </div>

                <p
                  style={{
                    fontSize: '1rem',
                  }}
                >
                  Upload an EEG CSV file to begin
                  visualization.
                </p>
              </div>
            )}
          </div>
        )}

        {/* PLACEHOLDERS */}
        {activeTab !== 'eeg' && (
          <div
            style={{
              backgroundColor: THEME.surface,
              border: `1px solid ${THEME.border}`,
              borderRadius: 20,
              padding: 60,
              textAlign: 'center',
              boxShadow:
                '0 1px 2px rgba(15,23,42,0.04)',
            }}
          >
            <h2
              style={{
                marginBottom: 10,
              }}
            >
              {tabs.find((t) => t.id === activeTab)
                ?.label}
            </h2>

            <p
              style={{
                color: THEME.textSecondary,
                maxWidth: 600,
                margin: '0 auto',
                lineHeight: 1.8,
              }}
            >
              This module will be connected next inside
              the Synaps neurotechnology pipeline.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
```
