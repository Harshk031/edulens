import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import './pipeline.css';

const STAGES = ['Transcribe', 'Structure', 'Index', 'Context', 'Summary', 'Ready'];

export default function BackendPipeline(){
  const dots = useRef([]);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Idle');

  useEffect(()=>{
    const onStage = (e) => {
      const { stage: s, progress: p } = e.detail || {};
      setStage(s || ''); setProgress(Math.max(0, Math.min(100, p||0)));
      const idx = Math.max(0, STAGES.findIndex(x => s && s.toLowerCase().includes(x.toLowerCase())));
      dots.current.forEach((el,i)=>{
        gsap.to(el, { opacity: i<=idx ? 1 : .25, scale: i===idx ? 1.1 : 1, duration: .3 });
      });
    };
    window.addEventListener('pipeline:backend:stage', onStage);
    return () => window.removeEventListener('pipeline:backend:stage', onStage);
  },[]);

  return (
    <div className="pipe-box">
      <div className="pipe-title">Backend Pipeline</div>
      <div className="pipe-row">
        {STAGES.map((s,i)=> (
          <div key={s} className="pipe-node">
            <div className="node-dot" ref={el=> dots.current[i]=el} />
            <div className="node-label">{s}</div>
            {i<STAGES.length-1 && <div className="node-arrow"/>}
          </div>
        ))}
      </div>
      <div className="pipe-meta"><span>{stage}</span><span>{progress}%</span></div>
    </div>
  );
}
