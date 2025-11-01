import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './LaunchScreen.css';

const QUOTES = [
  "Discipline turns dreams into destiny.",
  "Today, you reclaim your focus.",
  "Excellence is a continuous journey.",
  "Your future self will thank you.",
  "Focus is the gateway to mastery."
];

export default function LaunchScreen({ onComplete }) {
  const containerRef = useRef(null);
  const rocketRef = useRef(null);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    const tl = gsap.timeline({ onComplete });

    // Phase 1: Entering Divine Focus State (0-1.5s)
    tl.fromTo('.launch-text',
      { opacity: 0, y: 20, filter: 'blur(10px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power2.out' }
    );

    // Phase 2: Rocket launch (1.5-3.5s)
    tl.to('.launch-text', { 
      opacity: 0, 
      duration: 0.3 
    }, '+=0.2');

    tl.fromTo(rocketRef.current,
      { y: '100vh', opacity: 0, scale: 0.5 },
      { 
        y: '-20vh', 
        opacity: 1, 
        scale: 1.5,
        duration: 2,
        ease: 'power4.inOut',
        onStart: () => {
          // Trigger particle burst
          createParticleBurst();
        }
      }
    );

    // Phase 3: Motivational quote (3.5-5s)
    tl.fromTo('.launch-quote',
      { opacity: 0, scale: 0.9, filter: 'blur(5px)' },
      { 
        opacity: 1, 
        scale: 1, 
        filter: 'blur(0px)',
        duration: 0.8,
        ease: 'back.out(1.2)'
      },
      '-=0.5'
    );

    tl.to('.launch-quote', { 
      opacity: 1, 
      duration: 0.7 
    });

    // Phase 4: Fade out (5s)
    tl.to(containerRef.current, {
      opacity: 0,
      filter: 'blur(20px)',
      duration: 0.5,
      ease: 'power2.in'
    });

    return () => tl.kill();
  }, [onComplete]);

  const createParticleBurst = () => {
    const container = containerRef.current;
    if (!container) return;

    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = '50%';
      particle.style.top = '50%';
      container.appendChild(particle);

      const angle = (Math.PI * 2 * i) / 30;
      const velocity = 100 + Math.random() * 200;
      const x = Math.cos(angle) * velocity;
      const y = Math.sin(angle) * velocity;

      gsap.to(particle, {
        x,
        y,
        opacity: 0,
        duration: 1 + Math.random(),
        ease: 'power2.out',
        onComplete: () => particle.remove()
      });
    }
  };

  return (
    <div ref={containerRef} className="launch-screen">
      <div className="launch-bg-glow"></div>
      
      <div className="launch-content">
        <div className="launch-text">
          <div className="launch-glow-text">Entering Divine Focus State...</div>
        </div>

        <div ref={rocketRef} className="launch-rocket">
          <svg className="rocket-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            {/* Main rocket body */}
            <defs>
              <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#00FFB2', stopOpacity: 1}} />
                <stop offset="50%" style={{stopColor: '#00E0FF', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: '#0C1412', stopOpacity: 1}} />
              </linearGradient>
              <linearGradient id="windowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: '#00FFB2', stopOpacity: 0.8}} />
                <stop offset="100%" style={{stopColor: '#00E0FF', stopOpacity: 0.4}} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Rocket body */}
            <path d="M 100 20 L 120 100 L 110 140 L 90 140 L 80 100 Z" 
                  fill="url(#bodyGrad)" 
                  stroke="#00FF8C" 
                  strokeWidth="2"
                  filter="url(#glow)"/>
            
            {/* Nose cone */}
            <path d="M 100 20 L 85 40 L 115 40 Z" 
                  fill="#00FF8C" 
                  stroke="#00FFB2" 
                  strokeWidth="1.5"/>
            
            {/* Window */}
            <circle cx="100" cy="60" r="12" 
                    fill="url(#windowGrad)" 
                    stroke="#00E0FF" 
                    strokeWidth="2"/>
            <circle cx="100" cy="60" r="8" 
                    fill="rgba(0, 255, 178, 0.3)"/>
            
            {/* Side fins */}
            <path d="M 80 100 L 60 130 L 80 120 Z" 
                  fill="#00E0FF" 
                  stroke="#00FFB2" 
                  strokeWidth="1.5"
                  opacity="0.9"/>
            <path d="M 120 100 L 140 130 L 120 120 Z" 
                  fill="#00E0FF" 
                  stroke="#00FFB2" 
                  strokeWidth="1.5"
                  opacity="0.9"/>
            
            {/* Stripes */}
            <rect x="85" y="80" width="30" height="3" fill="#003B2F" opacity="0.6"/>
            <rect x="85" y="90" width="30" height="3" fill="#003B2F" opacity="0.6"/>
            <rect x="85" y="100" width="30" height="3" fill="#003B2F" opacity="0.6"/>
          </svg>
          
          {/* Animated flames */}
          <div className="rocket-flame flame-main"></div>
          <div className="rocket-flame flame-side-left"></div>
          <div className="rocket-flame flame-side-right"></div>
          <div className="rocket-exhaust"></div>
        </div>

        <div className="launch-quote">
          <div className="quote-text">{quote}</div>
          <div className="quote-author">— EduLens</div>
        </div>
      </div>

      <div className="launch-particles">
        {[...Array(50)].map((_, i) => (
          <div 
            key={i} 
            className="ambient-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}
