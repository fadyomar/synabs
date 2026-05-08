import { useState } from "react";

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

const MAIN_TABS = [
  { id: "converter", label: "EEG Converter", icon: "🔄", desc: "Convert EEG files to CSV", status: "ready" },
  { id: "offline",   label: "Offline",       icon: "📂", desc: "Analyze recorded EEG files", status: "ready" },
  { id: "online",    label: "Online",        icon: "📡", desc: "Stream from live EEG headset", status: "soon" },
  { id: "robotic",   label: "Robotic Rehab", icon: "🦾", desc: "Robotic rehabilitation system", status: "soon" },
  { id: "bci",       label: "BCI Rehab",     icon: "🧠", desc: "BCI rehabilitation system", status: "soon" },
  { id: "info",      label: "About",         icon: "ℹ️",  desc: "Project and team info", status: "ready" },
];

// ── PLACEHOLDER SCREENS ──────────────────────────────────────────────

function ConverterTab() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",gap:"24px"}}>
      <div style={{fontSize:"48px"}}>🔄</div>
      <h2 style={{margin:0,fontSize:"22px",fontWeight:700,color:BRAND.text}}>EEG File Converter</h2>
      <p style={{margin:0,fontSize:"14px",color:BRAND.textSec,textAlign:"center",maxWidth:"480px",lineHeight:1.7}}>
        Upload any EEG file in EDF, BDF, MAT, or GDF format and convert it to CSV for use in the Offline Analysis module.
      </p>
      <div style={{display:"flex",gap:"10px",flexWrap:"wrap",justifyContent:"center"}}>
        {["EDF","BDF","MAT","GDF"].map(f=>(
          <span key={f} style={{backgroundColor:"#EFF6FF",color:BRAND.primary,border:`1px solid ${BRAND.border}`,padding:"6px 14px",borderRadius:"8px",fontSize:"13px",fontWeight:600}}>
            {f} → CSV
          </span>
        ))}
      </div>
      <div style={{backgroundColor:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:"12px",padding:"14px 20px",fontSize:"13px",color:"#92400E",display:"flex",alignItems:"center",gap:"8px"}}>
        <span>🚧</span> Converter module — coming in v0.2
      </div>
    </div>
  );
}

function OnlineTab() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",gap:"24px"}}>
      <div style={{fontSize:"48px"}}>📡</div>
      <h2 style={{margin:0,fontSize:"22px",fontWeight:700,color:BRAND.text}}>Live EEG Streaming</h2>
      <p style={{margin:0,fontSize:"14px",color:BRAND.textSec,textAlign:"center",maxWidth:"480px",lineHeight:1.7}}>
        Connect to a live EEG headset and stream data in real-time. Supports OpenBCI, Emotiv, and g.tec devices via LSL protocol.
      </p>
      <div style={{display:"flex",gap:"10px",flexWrap:"wrap",justifyContent:"center"}}>
        {["OpenBCI","Emotiv","g.tec"].map(d=>(
          <span key={d} style={{backgroundColor:"#EFF6FF",color:BRAND.primary,border:`1px solid ${BRAND.border}`,padding:"6px 14px",borderRadius:"8px",fontSize:"13px",fontWeight:600}}>
            {d}
          </span>
        ))}
      </div>
      <div style={{backgroundColor:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:"12px",padding:"14px 20px",fontSize:"13px",color:"#92400E",display:"flex",alignItems:"center",gap:"8px"}}>
        <span>🚧</span> Online streaming module — coming in v0.3
      </div>
    </div>
  );
}

function RoboticTab() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",gap:"24px"}}>
      <div style={{fontSize:"48px"}}>🦾</div>
      <h2 style={{margin:0,fontSize:"22px",fontWeight:700,color:BRAND.text}}>Robotic Rehabilitation System</h2>
      <p style={{margin:0,fontSize:"14px",color:BRAND.textSec,textAlign:"center",maxWidth:"480px",lineHeight:1.7}}>
        Control robotic exoskeleton systems for stroke rehabilitation using classified EEG signals and motor imagery patterns.
      </p>
      <div style={{display:"flex",gap:"10px",flexWrap:"wrap",justifyContent:"center"}}>
        {["Exoskeleton Control","Arduino","ESP32","Motor Imagery"].map(f=>(
          <span key={f} style={{backgroundColor:"#EFF6FF",color:BRAND.primary,border:`1px solid ${BRAND.border}`,padding:"6px 14px",borderRadius:"8px",fontSize:"13px",fontWeight:600}}>
            {f}
          </span>
        ))}
      </div>
      <div style={{backgroundColor:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:"12px",padding:"14px 20px",fontSize:"13px",color:"#92400E",display:"flex",alignItems:"center",gap:"8px"}}>
        <span>🚧</span> Robotic Rehab module — coming in v0.4
      </div>
    </div>
  );
}

function BCITab() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",gap:"24px"}}>
      <div style={{fontSize:"48px"}}>🧠</div>
      <h2 style={{margin:0,fontSize:"22px",fontWeight:700,color:BRAND.text}}>BCI Rehabilitation System</h2>
      <p style={{margin:0,fontSize:"14px",color:BRAND.textSec,textAlign:"center",maxWidth:"480px",lineHeight:1.7}}>
        Brain-Computer Interface system for direct neural control of rehabilitation devices. Real-time classification and feedback loop for stroke recovery.
      </p>
      <div style={{display:"flex",gap:"10px",flexWrap:"wrap",justifyContent:"center"}}>
        {["Motor Imagery","P300","SSVEP","Neurofeedback"].map(f=>(
          <span key={f} style={{backgroundColor:"#EFF6FF",color:BRAND.primary,border:`1px solid ${BRAND.border}`,padding:"6px 14px",borderRadius:"8px",fontSize:"13px",fontWeight:600}}>
            {f}
          </span>
        ))}
      </div>
      <div style={{backgroundColor:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:"12px",padding:"14px 20px",fontSize:"13px",color:"#92400E",display:"flex",alignItems:"center",gap:"8px"}}>
        <span>🚧</span> BCI Rehab module — coming in v0.5
      </div>
    </div>
  );
}

function OfflineTab() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",gap:"16px"}}>
      <div style={{fontSize:"48px"}}>📂</div>
      <h2 style={{margin:0,fontSize:"22px",fontWeight:700,color:BRAND.text}}>Offline EEG Analysis</h2>
      <p style={{margin:0,fontSize:"14px",color:BRAND.textSec,textAlign:"center",maxWidth:"480px",lineHeight:1.7}}>
        Upload a recorded EEG CSV file and explore Raw Data, Signal Preprocessing, and Feature Extraction.
      </p>
      <div style={{backgroundColor:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:"12px",padding:"14px 20px",fontSize:"13px",color:"#166534",display:"flex",alignItems:"center",gap:"8px"}}>
        <span>✅</span> Active module — full analysis available
      </div>
    </div>
  );
}

function InfoTab() {
  const shadowMd = "0 4px 12px rgba(15,23,42,0.08)";
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"28px"}}>
      <div style={{background:"linear-gradient(135deg,#EFF6FF 0%,#FFFFFF 100%)",border:`1px solid ${BRAND.border}`,borderRadius:"18px",padding:"28px",boxShadow:shadow}}>
        <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"16px"}}>
          <div style={{width:"56px",height:"56px",borderRadius:"16px",backgroundColor:"#EFF6FF",border:`1px solid ${BRAND.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <SynapsLogo size={36}/>
          </div>
          <div>
            <p style={{margin:"0 0 4px",fontSize:"11px",fontWeight:700,color:BRAND.primary,letterSpacing:"1.4px"}}>RESEARCH PROJECT</p>
            <h2 style={{margin:0,fontSize:"22px",fontWeight:800,color:BRAND.text}}>Stroke Rehabilitation System Based on BCI Technique</h2>
          </div>
        </div>
        <p style={{margin:0,fontSize:"14px",color:BRAND.textSec,lineHeight:1.8}}>
          Synaps is a neurotechnology platform developed to support EEG signal visualization, frequency-domain analysis, brain-computer interface research, and smart rehabilitation applications.
        </p>
      </div>

      <div>
        <p style={{margin:"0 0 14px",fontSize:"12px",fontWeight:700,color:BRAND.textSec,letterSpacing:"1.2px"}}>RESEARCH TEAM</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"18px"}}>
          {[
            {img:"/fady.jpg",name:"Fady Mostafa",role:"M.Sc. in Robotics and Smart Systems",uni:"Military Technical College, Egypt",tags:"Robotics • Smart Systems • Neurotechnology"},
            {img:"/amr.jpg",name:"Amr Mostafa",role:"PhD Student in Neuroscience",uni:"Queen's University, Canada",tags:"Neuroscience • EEG • BCI Research"},
          ].map(m=>(
            <div key={m.name} style={{backgroundColor:BRAND.card,border:`1px solid ${BRAND.border}`,borderRadius:"18px",padding:"22px",boxShadow:shadow,display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center"}}>
              <img src={m.img} alt={m.name} style={{width:"140px",height:"140px",borderRadius:"20px",objectFit:"cover",border:"3px solid #EFF6FF",boxShadow:shadowMd,marginBottom:"14px"}} />
              <h3 style={{margin:"0 0 6px",fontSize:"18px",fontWeight:800,color:BRAND.text}}>{m.name}</h3>
              <p style={{margin:"0 0 6px",fontSize:"13px",fontWeight:600,color:BRAND.primary}}>{m.role}</p>
              <p style={{margin:"0 0 12px",fontSize:"12px",color:BRAND.textSec}}>{m.uni}</p>
              <div style={{backgroundColor:"#EFF6FF",border:`1px solid ${BRAND.border}`,color:BRAND.primary,padding:"5px 12px",borderRadius:"99px",fontSize:"11px",fontWeight:700}}>{m.tags}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{backgroundColor:BRAND.card,border:`1px solid ${BRAND.border}`,borderRadius:"18px",padding:"24px",boxShadow:shadow}}>
        <p style={{margin:"0 0 14px",fontSize:"12px",fontWeight:700,color:BRAND.textSec,letterSpacing:"1.2px"}}>PROJECT AFFILIATION AND SPONSORS</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"16px"}}>
          {[
            {img:"/sponser_2.png",name:"Military Technical College / TIPO",desc:"Prosthetics Technology Incubator, Egypt"},
            {img:"/sponser_1.png",name:"Academy of Scientific Research and Technology",desc:"Research sponsorship and scientific support"},
            {img:"/queen.jfif",name:"Queen's University",desc:"Neuroscience and BCI research contribution"},
          ].map(s=>(
            <div key={s.name} style={{backgroundColor:BRAND.bg,border:`1px solid ${BRAND.border}`,borderRadius:"16px",padding:"16px",display:"flex",alignItems:"center",gap:"14px"}}>
              <img src={s.img} alt={s.name} style={{width:"90px",height:"68px",objectFit:"contain",borderRadius:"10px",backgroundColor:"white",border:`1px solid ${BRAND.border}`,padding:"6px",flexShrink:0}} />
              <div>
                <p style={{margin:"0 0 4px",fontSize:"13px",fontWeight:700,color:BRAND.text}}>{s.name}</p>
                <p style={{margin:0,fontSize:"12px",color:BRAND.textSec}}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p style={{margin:"0 0 12px",fontSize:"12px",fontWeight:700,color:BRAND.textSec,letterSpacing:"1.2px"}}>PLATFORM CAPABILITIES</p>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
          {["EEG Visualization","FFT Analysis","Spectrogram","Topographic Mapping","AI Insights","BCI Research","Stroke Rehabilitation","Neurorobotics","Signal Processing","Smart Rehabilitation"].map(t=>(
            <span key={t} style={{backgroundColor:"#EFF6FF",color:BRAND.primary,border:`1px solid ${BRAND.border}`,padding:"6px 12px",borderRadius:"8px",fontSize:"12px",fontWeight:600}}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────

export default function App() {
  const [mainTab, setMainTab] = useState<string>("offline");

  const cardStyle: React.CSSProperties = {
    backgroundColor: BRAND.card,
    borderRadius: "16px",
    border: `1px solid ${BRAND.border}`,
    boxShadow: shadow,
    padding: "24px",
  };

  return (
    <div style={{backgroundColor:BRAND.bg,minHeight:"100vh",fontFamily:"Inter,-apple-system,sans-serif",color:BRAND.text}}>

      {/* HEADER */}
      <div style={{position:"sticky",top:0,zIndex:100,backgroundColor:"rgba(255,255,255,0.92)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${BRAND.border}`,boxShadow:"0 1px 2px rgba(15,23,42,0.04)"}}>
        <div style={{maxWidth:"1280px",margin:"0 auto",padding:"0 32px",height:"64px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <SynapsLogo size={38} />
            <div>
              <div style={{fontWeight:700,fontSize:"18px",letterSpacing:"0.5px",color:BRAND.primary}}>synaps</div>
              <div style={{fontSize:"9px",letterSpacing:"2.5px",color:BRAND.textSec,marginTop:"-2px",fontWeight:500}}>DECODE THE BRAIN</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"6px",backgroundColor:"#F0FDF4",border:"1px solid #BBF7D0",padding:"4px 10px",borderRadius:"99px"}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",backgroundColor:BRAND.success}} />
              <span style={{fontSize:"11px",fontWeight:600,color:BRAND.success}}>System Online</span>
            </div>
            <span style={{fontSize:"11px",color:BRAND.textSec,backgroundColor:BRAND.bg,padding:"3px 8px",borderRadius:"6px",border:`1px solid ${BRAND.border}`}}>v0.2.0</span>
          </div>
        </div>
      </div>

      {/* MAIN NAV TABS */}
      <div style={{backgroundColor:BRAND.card,borderBottom:`1px solid ${BRAND.border}`,boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
        <div style={{maxWidth:"1280px",margin:"0 auto",padding:"0 32px",display:"flex",gap:"4px",overflowX:"auto"}}>
          {MAIN_TABS.map(t=>(
            <button
              key={t.id}
              onClick={()=>t.status==="ready"&&setMainTab(t.id)}
              style={{
                display:"flex",
                alignItems:"center",
                gap:"8px",
                padding:"16px 20px",
                border:"none",
                borderBottom: mainTab===t.id ? `2px solid ${BRAND.primary}` : "2px solid transparent",
                backgroundColor:"transparent",
                color: mainTab===t.id ? BRAND.primary : t.status==="soon" ? "#CBD5E1" : BRAND.textSec,
                cursor: t.status==="soon" ? "not-allowed" : "pointer",
                fontFamily:"Inter,sans-serif",
                fontSize:"13px",
                fontWeight: mainTab===t.id ? 700 : 500,
                whiteSpace:"nowrap",
                transition:"all 0.15s",
              }}
            >
              <span style={{fontSize:"16px"}}>{t.icon}</span>
              {t.label}
              {t.status==="soon" && (
                <span style={{fontSize:"9px",backgroundColor:"#F1F5F9",color:"#94A3B8",padding:"2px 6px",borderRadius:"99px",fontWeight:600,letterSpacing:"0.5px"}}>
                  SOON
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:"1280px",margin:"0 auto",padding:"32px"}}>

        {/* TAB DESCRIPTION */}
        <div style={{marginBottom:"24px"}}>
          {MAIN_TABS.filter(t=>t.id===mainTab).map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:"12px"}}>
              <span style={{fontSize:"24px"}}>{t.icon}</span>
              <div>
                <h1 style={{margin:0,fontSize:"22px",fontWeight:700,color:BRAND.text}}>{t.label}</h1>
                <p style={{margin:0,fontSize:"13px",color:BRAND.textSec}}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div style={{...cardStyle}}>
          {mainTab==="converter" && <ConverterTab />}
          {mainTab==="offline"   && <OfflineTab />}
          {mainTab==="online"    && <OnlineTab />}
          {mainTab==="robotic"   && <RoboticTab />}
          {mainTab==="bci"       && <BCITab />}
          {mainTab==="info"      && <InfoTab />}
        </div>

      </div>
    </div>
  );
}
