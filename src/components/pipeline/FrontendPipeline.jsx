import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import './pipeline.css';

const STAGES = ['Click', 'useHybridAI', 'API Request', 'Provider', 'Response', 'Render'];

export default function FrontendPipeline(){
  const dots = useRef([]);
  const [stage, setStage] = useState('Idle');

  useEffect(()=>{
    const onF = (e) => {
      const { stage: s } = e.detail || {};
      setStage(s||'');
      const idx = Math.max(0, STAGES.findIndex(x => s && s.toLowerCase().includes(x.toLowerCase())));
      dots.current.forEach((el,i)=>{
        gsap.to(el, { opacity: i<=idx ? 1 : .25, scale: i===idx ? 1.1 : 1, duration: .25 });
      });
    };
    window.addEventListener('pipeline:frontend:stage', onF);
    return () => window.removeEventListener('pipeline:frontend:stage', onF);
  },[]);

  return (
    <div className="pipe-box">
      <div className="pipe-title">Frontend Pipeline</div>
      <div className="pipe-row">
        {STAGES.map((s,i)=> (
          <div key={s} className="pipe-node">
            <div className="node-dot" ref={el=> dots.current[i]=el} />
            <div className="node-label">{s}</div>
            {i<STAGES.length-1 && <div className="node-arrow"/>}
          </div>
        ))}
      </div>
      <div className="pipe-meta"><span>{stage}</span></div>
    </div>
  );
}
