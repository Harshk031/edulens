import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './AIPipelineVisualizer.css';

export default function AIPipelineVisualizer({ mode = 'offline' }) {
  const containerRef = useRef(null);
  const stagesRef = useRef([]);

  useEffect(() => {
    // GSAP animation for pipeline stages
    if (stagesRef.current.length === 0) return;

    // Create timeline
    const tl = gsap.timeline({ repeat: -1 });

    stagesRef.current.forEach((stage, idx) => {
      tl.to(
        stage,
        {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: 'back.out',
        },
        idx * 0.3
      );

      tl.to(
        stage,
        {
          opacity: 0.6,
          duration: 2,
        },
        `>${idx === 0 ? 0 : -0.1}`
      );
    });

    return () => {
      tl.kill();
    };
  }, []);

  const stages = mode === 'offline'
    ? ['📥 Input', '🖥️ LM Studio', '⚙️ Processing', '📤 Output']
    : ['📥 Input', '☁️ Provider', '🔄 API Call', '📤 Response'];

  return (
    <div className="pipeline-visualizer" ref={containerRef}>
      <h3>🧠 AI Pipeline Flow</h3>
      <div className="pipeline-container">
        {stages.map((stage, idx) => (
          <div key={idx} className="pipeline-wrapper">
            <div
              className="pipeline-stage"
              ref={(el) => {
                if (el) stagesRef.current[idx] = el;
              }}
            >
              <div className="stage-content">{stage}</div>
            </div>
            {idx < stages.length - 1 && (
              <div className="pipeline-arrow">→</div>
            )}
          </div>
        ))}
      </div>
      <div className="pipeline-info">
        <p>Mode: <strong>{mode.toUpperCase()}</strong></p>
      </div>
    </div>
  );
}
