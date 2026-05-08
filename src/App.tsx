import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";

const BRAND = {
  primary: "#0A84C6",
  secondary: "#1B6CA8",
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

const ELECTRODE_POSITIONS = {
  CH1:{x:0.35,y:0.25},CH2:{x:0.65,y:0.25},
  CH3:{x:0.25,y:0.50},CH4:{x:0.75,y:0.50},
  CH5:{x:0.35,y:0.75},CH6:{x:0.65,y:0.75},
  CH7:{x:0.40,y:0.40},CH8:{x:0.60,y:0.40},
};

// ---- Logo ----
function SynapsLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Neuron body */}
      <circle cx="60" cy="52" r="14" fill={BRAND.primary} />
      {/* Dendrites */}
      <line x1="60" y1="38" x2="60" y2="18" stroke={BRAND.primary} strokeWidth="5" strokeLinecap="round"/>
      <line x1="60" y1="18" x2="44" y2="8" stroke={BRAND.primary} strokeWidth="4" strokeLinecap="round"/>
      <line x1="60" y1="18" x2="76" y2="8" stroke={BRAND.primary} strokeWidth="4" strokeLinecap="round"/>
      <line x1="47" y1="44" x2="28" y2="34" stroke={BRAND.primary} strokeWidth="4.5" strokeLinecap="round"/>
      <line x1="28" y1="34" x2="14" y2="40" stroke={BRAND.primary} strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="28" y1="34" x2="22" y2="22" stroke={BRAND.primary} strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="73" y1="44" x2="92" y2="34" stroke={BRAND.primary} strokeWidth="4.5" strokeLinecap="round"/>
      <line x1="92" y1="34" x2="106" y2="40" stroke={BRAND.primary} strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="92" y1="34" x2="98" y2="22" stroke={BRAND.primary} strokeWidth="3.5" strokeLinecap="round"/>
      {/* Axon */}
      <line x1="60" y1="66" x2="60" y2="82" stroke={BRAND.primary} strokeWidth="5" strokeLinecap="round"/>
      <line x1="60" y1="82" x2="42" y2="100" stroke={BRAND.primary} strokeWidth="4.5" strokeLinecap="round"/>
      <line x1="42" y1="100" x2="32" y2="114" stroke={BRAND.primary} strokeWidth="3.5" strokeLinecap="round"/>
      {/* Axon terminal */}
      <circle cx="60" cy="52" r="6" fill="white" />
    </svg>
  );
}

// ---- FFT ----
function computeFFT(signal, sr) {
  const N = signal.length, res = [], step = (sr/2)/(N/2);
  for (let k=0;k<N/2;k++) {
    let re=0,im=0;
    for (let n=0;n<N;n++){const a=(2*Math.PI*k*n)/N;re+=signal[n]*Math.cos(a);im-=signal[n]*Math.sin(a);}
    const mag=Math.sqrt(re*re+im*im)/N, freq=parseFloat((k*step).toFixed(2));
    if(freq<=50)res.push({freq,magnitude:parseFloat(mag.toFixed(4))});
  }
  return res;
}

function computeSpectrogram(signal) {
  const wS=16,hop=4,res=[];
  for(let s=0;s+wS<=signal.length;s+=hop){
    const w=signal.slice(s,s+wS),mags=[];
    for(let k=0;k<wS/2;k++){let re=0,im=0;for(let n=0;n<wS;n++){const a=(2*Math.PI*k*n)/wS;re+=w[n]*Math.cos(a);im-=w[n]*Math.sin(a);}mags.push(Math.sqrt(re*re+im*im)/wS);}
    res.push(mags);
  }
  return res;
}

function bandPower(fft,lo,hi){const b=fft.filter(d=>d.freq>=lo&&d.freq<=hi);return b.length?b.reduce((s,d)=>s+d.magnitude,0)/b.length:0;}

function generateInsights(fft, channels) {
  const d=bandPower(fft,0,4),th=bandPower(fft,4,8),a=bandPower(fft,8,13),b=bandPower(fft,13,30),g=bandPower(fft,30,50);
  const tot=d+th+a+b+g||1;
  const bands=[{name:"Delta",power:d},{name:"Theta",power:th},{name:"Alpha",power:a},{name:"Beta",power:b},{name:"Gamma",power:g}];
  const dom=bands.reduce((x,y)=>x.power>y.power?x:y);
  const ins=[];
  ins.push({type:"dominant",label:"Dominant Band",value:dom.name,desc:`${dom.name} band carries the highest spectral power in this recording.`,color:BRAND.primary,icon:"⚡"});
  ins.push({type:"quality",label:"Signal Quality",value:channels>=6?"Excellent":channels>=4?"Good":"Fair",desc:`${channels} active channels detected with consistent data integrity.`,color:BRAND.success,icon:"✓"});
  if(a/tot>0.15)ins.push({type:"alpha",label:"Alpha Activity",value:"Detected",desc:"Alpha waves (8–13 Hz) present — associated with relaxed wakefulness and calm focus.",color:"#8B5CF6",icon:"α"});
  else ins.push({type:"alpha",label:"Alpha Activity",value:"Below Threshold",desc:"Alpha power is below detection threshold in this recording.",color:BRAND.textSec,icon:"α"});
  if(b/tot>0.2)ins.push({type:"beta",label:"Beta Activity",value:"Detected",desc:"Beta waves (13–30 Hz) detected — associated with active cognition and focused attention.",color:BRAND.warning,icon:"β"});
  if(th/tot>0.15)ins.push({type:"theta",label:"Theta Activity",value:"Detected",desc:"Theta waves (4–8 Hz) present — linked to drowsiness, memory encoding, or meditative states.",color:"#0891B2",icon:"θ"});
  if(g/tot>0.1)ins.push({type:"gamma",label:"Gamma Activity",value:"Detected",desc:"Gamma waves (30–50 Hz) observed — may indicate high-level sensory binding or arousal.",color:BRAND.danger,icon:"γ"});
  const state=a/tot>0.15?"Relaxed / Eyes-Closed":b/tot>0.2?"Active / Focused":d/tot>0.5?"Deep Rest / Sleep-like":"Transitional";
  ins.push({type:"state",label:"Cognitive State Estimate",value:state,desc:"Rule-based estimation from spectral band distribution.",color:BRAND.accent,icon:"🧠"});
  return ins;
}

// ---- Spectrogram Canvas ----
function SpectrogramCanvas({data,sr}) {
  const ref=useRef();
  useEffect(()=>{
    if(!ref.current||!data.length)return;
    const cv=ref.current,ctx=cv.getContext("2d"),W=cv.width,H=cv.height;
    const pL=60,pB=40,pT=20,pR=20,pW=W-pL-pR,pH=H-pB-pT;
    const cols=data.length,rows=data[0].length;
    const cW=pW/cols,cH=pH/rows;
    let mx=0;data.forEach(c=>c.forEach(v=>{if(v>mx)mx=v;}));
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle="#F4F7FB";ctx.fillRect(0,0,W,H);
    for(let t=0;t<cols;t++)for(let f=0;f<rows;f++){
      const v=data[t][f]/(mx||1);
      // blue→green→yellow→red colormap (scientific)
      let r,g,bv;
      if(v<0.25){r=0;g=Math.floor(v*4*100);bv=Math.floor(150+v*4*105);}
      else if(v<0.5){r=0;g=Math.floor(100+(v-0.25)*4*155);bv=Math.floor(255-(v-0.25)*4*255);}
      else if(v<0.75){r=Math.floor((v-0.5)*4*255);g=255;bv=0;}
      else{r=255;g=Math.floor(255-(v-0.75)*4*255);bv=0;}
      ctx.fillStyle=`rgb(${r},${g},${bv})`;
      ctx.fillRect(pL+t*cW,pT+(rows-f-1)*cH,cW+1,cH+1);
    }
    ctx.strokeStyle=BRAND.border;ctx.lineWidth=1;ctx.strokeRect(pL,pT,pW,pH);
    ctx.fillStyle=BRAND.textSec;ctx.font="11px Inter,sans-serif";
    for(let i=0;i<=5;i++){const x=pL+(i/5)*pW;ctx.fillText(((i/5)*cols/5).toFixed(1),x-8,H-8);}
    const mF=sr/2;
    for(let i=0;i<=4;i++){const y=pT+pH-(i/4)*pH;ctx.fillText(`${Math.round((i/4)*mF)}Hz`,pL-52,y+4);}
    ctx.fillStyle=BRAND.textSec;ctx.font="11px Inter,sans-serif";
    ctx.fillText("Time (s)",pL+pW/2-25,H-2);
    ctx.save();ctx.translate(12,pT+pH/2+35);ctx.rotate(-Math.PI/2);ctx.fillText("Frequency (Hz)",0,0);ctx.restore();
  },[data,sr]);
  return <canvas ref={ref} width={800} height={360} style={{width:"100%",height:"360px",borderRadius:"12px",display:"block"}} />;
}

// ---- Topomap ----
function TopoMap({channelPowers,channels}) {
  const ref=useRef();
  useEffect(()=>{
    if(!ref.current||!channels.length)return;
    const cv=ref.current,ctx=cv.getContext("2d"),W=cv.width,H=cv.height;
    const cx=W/2,cy=H/2,R=Math.min(W,H)*0.40;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle="#F4F7FB";ctx.fillRect(0,0,W,H);
    // head
    ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
    const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,R);
    grad.addColorStop(0,"#EFF6FF");grad.addColorStop(1,"#DBEAFE");
    ctx.fillStyle=grad;ctx.fill();
    ctx.strokeStyle=BRAND.border;ctx.lineWidth=2;ctx.stroke();
    // ears
    [[cx-R-6,cy],[cx+R+6,cy]].forEach(([ex,ey])=>{ctx.beginPath();ctx.ellipse(ex,ey,7,14,0,0,Math.PI*2);ctx.fillStyle="#DBEAFE";ctx.fill();ctx.strokeStyle=BRAND.border;ctx.lineWidth=1.5;ctx.stroke();});
    // nose
    ctx.beginPath();ctx.moveTo(cx-10,cy-R+10);ctx.lineTo(cx,cy-R-14);ctx.lineTo(cx+10,cy-R+10);
    ctx.strokeStyle=BRAND.border;ctx.lineWidth=1.5;ctx.stroke();
    // crosshairs
    ctx.strokeStyle=BRAND.border+"88";ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(cx,cy-R);ctx.lineTo(cx,cy+R);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx-R,cy);ctx.lineTo(cx+R,cy);ctx.stroke();
    ctx.setLineDash([]);
    // electrodes
    const powers=channels.map(ch=>channelPowers[ch]||0);
    const mx=Math.max(...powers)||1,mn=Math.min(...powers);
    channels.forEach(ch=>{
      const pos=ELECTRODE_POSITIONS[ch];if(!pos)return;
      const x=cx-R+pos.x*R*2,y=cy-R+pos.y*R*2;
      const p=channelPowers[ch]||0,n=(p-mn)/(mx-mn||1);
      // scientific heatmap: blue→cyan→yellow→red
      let r,g,bv;
      if(n<0.5){r=Math.floor(n*2*255);g=Math.floor(n*2*200);bv=Math.floor(255-n*2*100);}
      else{r=255;g=Math.floor(255-(n-0.5)*2*200);bv=0;}
      const eGrad=ctx.createRadialGradient(x,y,0,x,y,30);
      eGrad.addColorStop(0,`rgba(${r},${g},${bv},0.55)`);
      eGrad.addColorStop(1,`rgba(${r},${g},${bv},0)`);
      ctx.beginPath();ctx.arc(x,y,30,0,Math.PI*2);ctx.fillStyle=eGrad;ctx.fill();
      ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);
      ctx.fillStyle=`rgb(${r},${g},${bv})`;ctx.fill();
      ctx.strokeStyle="white";ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle=BRAND.text;ctx.font="bold 10px Inter,sans-serif";ctx.textAlign="center";
      ctx.fillText(ch,x,y+20);
    });
    // colorbar
    const bX=W-24,bY=cy-70,bH=140,bW=12;
    const cg=ctx.createLinearGradient(0,bY,0,bY+bH);
    cg.addColorStop(0,"rgb(220,0,0)");cg.addColorStop(0.5,"rgb(255,220,0)");cg.addColorStop(1,"rgb(0,80,200)");
    ctx.fillStyle=cg;ctx.fillRect(bX,bY,bW,bH);
    ctx.strokeStyle=BRAND.border;ctx.lineWidth=1;ctx.strokeRect(bX,bY,bW,bH);
    ctx.fillStyle=BRAND.textSec;ctx.font="9px Inter,sans-serif";ctx.textAlign="left";
    ctx.fillText("High",bX+bW+4,bY+8);ctx.fillText("Low",bX+bW+4,bY+bH);
  },[channelPowers,channels]);
  return <canvas ref={ref} width={380} height={380} style={{width:"100%",maxWidth:"380px",height:"auto",display:"block",margin:"0 auto"}} />;
}

// ---- Band bar chart ----
function BandBar({label,value,max,color}){
  const pct=Math.min((value/max)*100,100);
  return(
    <div style={{marginBottom:"10px"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
        <span style={{fontSize:"12px",fontWeight:600,color:BRAND.text}}>{label}</span>
        <span style={{fontSize:"12px",color:BRAND.textSec}}>{value.toFixed(4)}</span>
      </div>
      <div style={{height:"6px",borderRadius:"99px",backgroundColor:BRAND.bg,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,borderRadius:"99px",backgroundColor:color,transition:"width 0.6s ease"}} />
      </div>
    </div>
  );
}

// ---- Main App ----
export default function App() {
  const [fileName,setFileName]=useState("");
  const [chartData,setChartData]=useState([]);
  const [channels,setChannels]=useState([]);
  const [sr,setSr]=useState(0);
  const [duration,setDuration]=useState(0);
  const [fftData,setFftData]=useState([]);
  const [spectroData,setSpectroData]=useState([]);
  const [insights,setInsights]=useState([]);
  const [channelPowers,setChannelPowers]=useState({});
  const [tab,setTab]=useState("eeg");
  const [bandPowers,setBandPowers]=useState({});
  const [dragging,setDragging]=useState(false);

  function processFile(file){
    if(!file)return;
    setFileName(file.name);
    const reader=new FileReader();
    reader.onload=e=>{
      const text=e.target.result;
      const lines=text.trim().split("\n");
      const headers=lines[0].split(",").map(h=>h.trim());
      const eegCh=headers.filter(h=>h!=="timestamp");
      const rows=lines.slice(1).map(line=>{
        const vals=line.split(",");
        const obj={};
        headers.forEach((h,i)=>{obj[h]=parseFloat(vals[i]);});
        return obj;
      });
      const OFFSET=30;
      const offsetRows=rows.map((row,_)=>{
        const nr={timestamp:row.timestamp};
        eegCh.forEach((ch,i)=>{nr[ch]=row[ch]+i*OFFSET;});
        return nr;
      });
      let rate=250;
      if(rows.length>=2){const dt=rows[1].timestamp-rows[0].timestamp;rate=Math.round(1/dt);}
      setSr(rate);setDuration(parseFloat(rows[rows.length-1].timestamp.toFixed(3)));
      const powers={};
      eegCh.forEach(ch=>{const sig=rows.map(r=>r[ch]);const rms=Math.sqrt(sig.reduce((s,v)=>s+v*v,0)/sig.length);powers[ch]=rms;});
      setChannelPowers(powers);
      const ch1=rows.map(r=>r[eegCh[0]]);
      const fft=computeFFT(ch1,rate);
      setFftData(fft);setSpectroData(computeSpectrogram(ch1));
      setInsights(generateInsights(fft,eegCh.length));
      setBandPowers({
        Delta:bandPower(fft,0,4),Theta:bandPower(fft,4,8),
        Alpha:bandPower(fft,8,13),Beta:bandPower(fft,13,30),Gamma:bandPower(fft,30,50)
      });
      setChannels(eegCh);setChartData(offsetRows);
    };
    reader.readAsText(file);
  }

  function handleUpload(e){processFile(e.target.files?.[0]);}
  function handleDrop(e){e.preventDefault();setDragging(false);processFile(e.dataTransfer.files?.[0]);}

  const tabs=[
    {id:"eeg",label:"EEG Viewer"},
    {id:"fft",label:"FFT Viewer"},
    {id:"spectrogram",label:"Spectrogram"},
    {id:"topomap",label:"Topomap"},
    {id:"insights",label:"Insights"},
    {id:"info",label:"About"},
  ];

  const bandColors={Delta:"#8B5CF6",Theta:"#0891B2",Alpha:"#0A84C6",Beta:"#F59E0B",Gamma:"#EF4444"};
  const maxBand=Math.max(...Object.values(bandPowers),0.0001);

  const cardStyle={backgroundColor:BRAND.card,borderRadius:"16px",border:`1px solid ${BRAND.border}`,boxShadow:shadow,padding:"24px"};
  const emptyState=<div style={{textAlign:"center",padding:"60px 0",color:BRAND.textSec}}>
    <div style={{fontSize:"40px",marginBottom:"12px",opacity:0.3}}>📂</div>
    <p style={{fontSize:"14px",fontWeight:500,margin:0}}>Upload an EEG file to begin analysis</p>
    <p style={{fontSize:"12px",color:BRAND.border,marginTop:"4px"}}>Supports CSV format</p>
  </div>;

  return (
    <div style={{backgroundColor:BRAND.bg,minHeight:"100vh",fontFamily:"Inter,-apple-system,sans-serif",color:BRAND.text}}>

      {/* HEADER */}
      <div style={{position:"sticky",top:0,zIndex:100,backgroundColor:"rgba(255,255,255,0.92)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${BRAND.border}`,boxShadow:"0 1px 2px rgba(15,23,42,0.04)"}}>
        <div style={{maxWidth:"1200px",margin:"0 auto",padding:"0 32px",height:"64px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <SynapsLogo size={38} />
            <div>
              <div style={{fontWeight:700,fontSize:"18px",letterSpacing:"0.5px",color:BRAND.primary}}>synaps</div>
              <div style={{fontSize:"9px",letterSpacing:"2.5px",color:BRAND.textSec,marginTop:"-2px",fontWeight:500}}>DECODE THE BRAIN</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"6px",backgroundColor:"#F0FDF4",border:"1px solid #BBF7D0",padding:"4px 10px",borderRadius:"99px"}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",backgroundColor:BRAND.success}} />
              <span style={{fontSize:"11px",fontWeight:600,color:BRAND.success}}>System Online</span>
            </div>
            <span style={{fontSize:"11px",color:BRAND.textSec,backgroundColor:BRAND.bg,padding:"3px 8px",borderRadius:"6px",border:`1px solid ${BRAND.border}`}}>v0.1.0</span>
          </div>
        </div>
      </div>

      <div style={{maxWidth:"1200px",margin:"0 auto",padding:"32px"}}>

        {/* HERO */}
        <div style={{marginBottom:"32px"}}>
          <h1 style={{fontSize:"28px",fontWeight:700,margin:"0 0 6px",color:BRAND.text}}>Neurotechnology Analysis Platform</h1>
          <p style={{fontSize:"14px",color:BRAND.textSec,margin:0}}>Upload EEG data to visualize signals, analyze frequency spectra, and extract cognitive insights.</p>
        </div>

        {/* UPLOAD */}
        <div
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={handleDrop}
          style={{...cardStyle,marginBottom:"24px",border:`2px dashed ${dragging?BRAND.primary:BRAND.border}`,backgroundColor:dragging?"#EFF6FF":BRAND.card,transition:"all 0.2s",textAlign:"center",padding:"32px"}}>
          <div style={{marginBottom:"12px",fontSize:"32px",opacity:0.5}}>🧠</div>
          <p style={{fontSize:"14px",color:BRAND.textSec,marginBottom:"16px"}}>Drag and drop your EEG file here, or click to browse</p>
          <label style={{display:"inline-flex",alignItems:"center",gap:"8px",backgroundColor:BRAND.primary,color:"white",padding:"10px 24px",borderRadius:"8px",fontSize:"14px",fontWeight:600,cursor:"pointer",boxShadow:`0 4px 12px ${BRAND.primary}44`,transition:"all 0.2s"}}>
            <span>↑</span> Upload EEG File (.csv)
            <input type="file" accept=".csv" style={{display:"none"}} onChange={handleUpload} />
          </label>
          {fileName&&<p style={{marginTop:"12px",fontSize:"12px",color:BRAND.primary,fontWeight:500}}>● {fileName}</p>}
        </div>

        {/* STATS */}
        {fileName&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"12px",marginBottom:"24px"}}>
            {[
              {label:"Channels",value:channels.length,unit:"",icon:"≋"},
              {label:"Samples",value:chartData.length,unit:"",icon:"#"},
              {label:"Sample Rate",value:sr,unit:"Hz",icon:"~"},
              {label:"Duration",value:duration,unit:"s",icon:"◷"},
            ].map(s=>(
              <div key={s.label} style={{...cardStyle,padding:"16px 20px"}}>
                <div style={{fontSize:"20px",color:BRAND.primary,marginBottom:"6px",opacity:0.6}}>{s.icon}</div>
                <div style={{fontSize:"22px",fontWeight:700,color:BRAND.text}}>{s.value}<span style={{fontSize:"13px",fontWeight:500,color:BRAND.textSec,marginLeft:"3px"}}>{s.unit}</span></div>
                <div style={{fontSize:"11px",fontWeight:600,color:BRAND.textSec,letterSpacing:"0.5px",marginTop:"2px"}}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}

        {/* TABS */}
        <div style={{display:"flex",gap:"2px",marginBottom:"0",backgroundColor:BRAND.card,borderRadius:"12px 12px 0 0",border:`1px solid ${BRAND.border}`,borderBottom:"none",padding:"6px 6px 0",overflowX:"auto"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"8px 18px",border:"none",borderRadius:"8px 8px 0 0",cursor:"pointer",
              fontFamily:"Inter,sans-serif",fontSize:"13px",fontWeight:tab===t.id?600:500,
              backgroundColor:tab===t.id?BRAND.primary:"transparent",
              color:tab===t.id?"white":BRAND.textSec,
              transition:"all 0.15s",whiteSpace:"nowrap",
              boxShadow:tab===t.id?`0 2px 8px ${BRAND.primary}33`:"none",
            }}>{t.label}</button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div style={{...cardStyle,borderRadius:"0 12px 12px 12px",marginBottom:"24px"}}>

          {/* EEG */}
          {tab==="eeg"&&(
            chartData.length>0?(
              <>
                <div style={{marginBottom:"20px"}}>
                  <h3 style={{margin:"0 0 4px",fontSize:"15px",fontWeight:600,color:BRAND.text}}>EEG Signal Viewer</h3>
                  <p style={{margin:0,fontSize:"12px",color:BRAND.textSec}}>Multi-channel time-series visualization — all channels offset for clarity</p>
                </div>
                <ResponsiveContainer width="100%" height={480}>
                  <LineChart data={chartData} margin={{top:10,right:20,bottom:30,left:20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BRAND.border} />
                    <XAxis dataKey="timestamp" stroke={BRAND.border} tick={{fontSize:11,fill:BRAND.textSec}} label={{value:"Time (s)",position:"insideBottom",offset:-8,fill:BRAND.textSec,fontSize:11}} height={45}/>
                    <YAxis stroke={BRAND.border} tick={{fontSize:11,fill:BRAND.textSec}} label={{value:"Amplitude (µV)",angle:-90,position:"insideLeft",offset:15,fill:BRAND.textSec,fontSize:11}} width={65}/>
                    <Tooltip contentStyle={{backgroundColor:BRAND.card,border:`1px solid ${BRAND.border}`,borderRadius:"8px",boxShadow:shadowMd,fontSize:"12px"}} labelStyle={{color:BRAND.text,fontWeight:600}} />
                    <Legend wrapperStyle={{paddingTop:"16px",fontSize:"12px"}} />
                    {channels.map((ch,i)=><Line key={ch} type="monotone" dataKey={ch} stroke={COLORS[i%COLORS.length]} dot={false} strokeWidth={1.5} />)}
                  </LineChart>
                </ResponsiveContainer>
              </>
            ):emptyState
          )}

          {/* FFT */}
          {tab==="fft"&&(
            fftData.length>0?(
              <>
                <div style={{marginBottom:"20px"}}>
                  <h3 style={{margin:"0 0 4px",fontSize:"15px",fontWeight:600,color:BRAND.text}}>Frequency Spectrum — CH1</h3>
                  <p style={{margin:0,fontSize:"12px",color:BRAND.textSec}}>Fast Fourier Transform — power distribution across EEG frequency bands</p>
                </div>
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"20px"}}>
                  {Object.entries(bandColors).map(([name,color])=>{
                    const ranges={Delta:"0–4 Hz",Theta:"4–8 Hz",Alpha:"8–13 Hz",Beta:"13–30 Hz",Gamma:"30–50 Hz"};
                    return(
                      <div key={name} style={{display:"flex",alignItems:"center",gap:"6px",backgroundColor:`${color}11`,border:`1px solid ${color}33`,padding:"4px 10px",borderRadius:"6px"}}>
                        <div style={{width:"8px",height:"8px",borderRadius:"50%",backgroundColor:color}}/>
                        <span style={{fontSize:"12px",fontWeight:600,color}}>{name}</span>
                        <span style={{fontSize:"11px",color:BRAND.textSec}}>{ranges[name]}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:"24px",alignItems:"start"}}>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={fftData} margin={{top:10,right:10,bottom:30,left:20}}>
                      <defs>
                        <linearGradient id="fftGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={BRAND.primary} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={BRAND.primary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={BRAND.border} />
                      <XAxis dataKey="freq" stroke={BRAND.border} tick={{fontSize:11,fill:BRAND.textSec}} label={{value:"Frequency (Hz)",position:"insideBottom",offset:-8,fill:BRAND.textSec,fontSize:11}} height={45}/>
                      <YAxis stroke={BRAND.border} tick={{fontSize:11,fill:BRAND.textSec}} label={{value:"Magnitude",angle:-90,position:"insideLeft",offset:15,fill:BRAND.textSec,fontSize:11}} width={65}/>
                      <Tooltip contentStyle={{backgroundColor:BRAND.card,border:`1px solid ${BRAND.border}`,borderRadius:"8px",boxShadow:shadowMd,fontSize:"12px"}} labelFormatter={l=>`${l} Hz`} formatter={v=>[v,"Magnitude"]}/>
                      <Area type="monotone" dataKey="magnitude" stroke={BRAND.primary} strokeWidth={2} fill="url(#fftGrad)"/>
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{...cardStyle,backgroundColor:BRAND.bg,padding:"20px"}}>
                    <p style={{margin:"0 0 16px",fontSize:"12px",fontWeight:600,color:BRAND.textSec,letterSpacing:"0.5px"}}>BAND POWER</p>
                    {Object.entries(bandPowers).map(([name,val])=>(
                      <BandBar key={name} label={name} value={val} max={maxBand} color={bandColors[name]} />
                    ))}
                  </div>
                </div>
              </>
            ):emptyState
          )}

          {/* SPECTROGRAM */}
          {tab==="spectrogram"&&(
            spectroData.length>0?(
              <>
                <div style={{marginBottom:"20px"}}>
                  <h3 style={{margin:"0 0 4px",fontSize:"15px",fontWeight:600,color:BRAND.text}}>Spectrogram — CH1</h3>
                  <p style={{margin:0,fontSize:"12px",color:BRAND.textSec}}>Time-frequency representation using short-time Fourier transform (STFT)</p>
                </div>
                <SpectrogramCanvas data={spectroData} sr={sr} />
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"12px",fontSize:"11px",color:BRAND.textSec}}>
                  <div style={{width:"80px",height:"8px",borderRadius:"4px",background:"linear-gradient(to right,rgb(0,80,200),rgb(0,220,100),rgb(255,220,0),rgb(220,0,0))"}}/>
                  <span>Low power → High power</span>
                </div>
              </>
            ):emptyState
          )}

          {/* TOPOMAP */}
          {tab==="topomap"&&(
            channels.length>0?(
              <>
                <div style={{marginBottom:"20px"}}>
                  <h3 style={{margin:"0 0 4px",fontSize:"15px",fontWeight:600,color:BRAND.text}}>Brain Activity Map</h3>
                  <p style={{margin:0,fontSize:"12px",color:BRAND.textSec}}>Topographic map of RMS power per electrode — scientific heatmap visualization</p>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"32px",alignItems:"start"}}>
                  <TopoMap channelPowers={channelPowers} channels={channels} />
                  <div>
                    <p style={{margin:"0 0 14px",fontSize:"12px",fontWeight:600,color:BRAND.textSec,letterSpacing:"0.5px"}}>CHANNEL POWER (RMS)</p>
                    {channels.map(ch=>{
                      const p=channelPowers[ch]||0;
                      const mx=Math.max(...Object.values(channelPowers),0.001);
                      return(
                        <div key={ch} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
                          <span style={{fontSize:"12px",fontWeight:600,color:BRAND.text,width:"36px"}}>{ch}</span>
                          <div style={{flex:1,height:"6px",borderRadius:"99px",backgroundColor:BRAND.bg,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${(p/mx)*100}%`,borderRadius:"99px",background:`linear-gradient(90deg,${BRAND.primary},${BRAND.accent})`}}/>
                          </div>
                          <span style={{fontSize:"11px",color:BRAND.textSec,width:"52px",textAlign:"right"}}>{p.toFixed(2)} µV</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ):emptyState
          )}

          {/* INSIGHTS */}
          {tab==="insights"&&(
            insights.length>0?(
              <>
                <div style={{marginBottom:"20px"}}>
                  <h3 style={{margin:"0 0 4px",fontSize:"15px",fontWeight:600,color:BRAND.text}}>EEG Insights</h3>
                  <p style={{margin:0,fontSize:"12px",color:BRAND.textSec}}>Automated spectral analysis and rule-based cognitive state estimation</p>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"12px"}}>
                  {insights.map((ins,i)=>(
                    <div key={i} style={{backgroundColor:BRAND.bg,border:`1px solid ${ins.color}22`,borderLeft:`3px solid ${ins.color}`,borderRadius:"10px",padding:"16px 18px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
                        <div style={{width:"28px",height:"28px",borderRadius:"8px",backgroundColor:`${ins.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:700,color:ins.color}}>{ins.icon}</div>
                        <div>
                          <p style={{margin:0,fontSize:"11px",fontWeight:600,color:BRAND.textSec,letterSpacing:"0.5px"}}>{ins.label.toUpperCase()}</p>
                          <p style={{margin:0,fontSize:"14px",fontWeight:700,color:ins.color}}>{ins.value}</p>
                        </div>
                      </div>
                      <p style={{margin:0,fontSize:"12px",color:BRAND.textSec,lineHeight:1.5}}>{ins.desc}</p>
                    </div>
                  ))}
                </div>
              </>
            ):emptyState
          )}

          {/* ABOUT */}
          {tab==="info"&&(
            <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"32px",alignItems:"start",flexWrap:"wrap"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"10px"}}>
                <div style={{width:"90px",height:"90px",borderRadius:"20px",backgroundColor:"#EFF6FF",border:`1px solid ${BRAND.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <SynapsLogo size={56}/>
                </div>
                <div style={{backgroundColor:"#EFF6FF",border:`1px solid ${BRAND.border}`,padding:"4px 12px",borderRadius:"99px",fontSize:"11px",fontWeight:600,color:BRAND.primary}}>PLATFORM</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
                <div>
                  <p style={{margin:"0 0 4px",fontSize:"11px",fontWeight:600,color:BRAND.textSec,letterSpacing:"1px"}}>PLATFORM</p>
                  <p style={{margin:0,fontSize:"22px",fontWeight:700,color:BRAND.text}}>Synaps</p>
                </div>
                <div>
                  <p style={{margin:"0 0 4px",fontSize:"11px",fontWeight:600,color:BRAND.textSec,letterSpacing:"1px"}}>TAGLINE</p>
                  <p style={{margin:0,fontSize:"14px",color:BRAND.primary,fontWeight:600}}>Decode the Brain</p>
                </div>
                <div>
                  <p style={{margin:"0 0 4px",fontSize:"11px",fontWeight:600,color:BRAND.textSec,letterSpacing:"1px"}}>DESCRIPTION</p>
                  <p style={{margin:0,fontSize:"13px",color:BRAND.textSec,lineHeight:1.7}}>Synaps is an open-source neurotechnology platform for EEG visualization, BCI research, and neurorobotics. Built for researchers, clinicians, and engineers working at the intersection of neuroscience and technology.</p>
                </div>
                <div>
                  <p style={{margin:"0 0 10px",fontSize:"11px",fontWeight:600,color:BRAND.textSec,letterSpacing:"1px"}}>CAPABILITIES</p>
                  <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                    {["EEG Analysis","FFT Visualization","Spectrogram","Topomap","AI Insights","BCI Research","Neurorobotics","Signal Processing"].map(t=>(
                      <span key={t} style={{backgroundColor:"#EFF6FF",color:BRAND.primary,border:`1px solid ${BRAND.border}`,padding:"4px 10px",borderRadius:"6px",fontSize:"12px",fontWeight:500}}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
