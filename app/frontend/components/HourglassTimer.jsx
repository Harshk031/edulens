import { useEffect, useRef, useState } from 'react';
import './HourglassTimer.css';

export default function HourglassTimer({ duration = 1500, remaining = 1500 }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);
  
  const progress = Math.max(0, Math.min(1, 1 - remaining / duration));
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    updateSize();
    
    // Particle system
    const maxParticles = 200;
    const particles = particlesRef.current;
    
    // Initialize particles in top chamber
    if (particles.length === 0) {
      for (let i = 0; i < maxParticles; i++) {
        particles.push({
          x: 80 + Math.random() * 40,
          y: 40 + Math.random() * 80,
          vx: 0,
          vy: 0,
          radius: 1.5 + Math.random() * 0.5,
          inBottomChamber: false
        });
      }
    }
    
    const animate = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      
      // Clear canvas
      ctx.clearRect(0, 0, w, h);
      
      // Draw hourglass outline
      ctx.strokeStyle = '#00FF8C';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 255, 140, 0.6)';
      
      // Top chamber
      ctx.beginPath();
      ctx.moveTo(60, 30);
      ctx.lineTo(140, 30);
      ctx.lineTo(120, 120);
      ctx.lineTo(100, 140);
      ctx.closePath();
      ctx.stroke();
      
      // Bottom chamber
      ctx.beginPath();
      ctx.moveTo(100, 160);
      ctx.lineTo(120, 180);
      ctx.lineTo(140, 270);
      ctx.lineTo(60, 270);
      ctx.lineTo(80, 180);
      ctx.closePath();
      ctx.stroke();
      
      // Neck
      ctx.beginPath();
      ctx.moveTo(100, 140);
      ctx.lineTo(100, 160);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      
      // Calculate how many particles should be in bottom
      const targetBottom = Math.floor(maxParticles * progress);
      
      // Particle physics
      particles.forEach(p => {
        if (!p.inBottomChamber) {
          // Top chamber physics - fall towards neck
          const neckX = 100;
          const neckY = 140;
          const dx = neckX - p.x;
          const dy = neckY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 5) {
            // Near neck - start falling through
            p.inBottomChamber = true;
            p.y = 160;
            p.vy = 2 + Math.random() * 2;
            p.vx = (Math.random() - 0.5) * 2;
          } else {
            // Gravity pull towards neck
            const gravity = 0.05;
            p.vx += (dx / dist) * gravity;
            p.vy += (dy / dist) * gravity;
            
            // Apply velocity
            p.x += p.vx;
            p.y += p.vy;
            
            // Damping
            p.vx *= 0.95;
            p.vy *= 0.95;
            
            // Keep in top chamber bounds
            if (p.x < 65) { p.x = 65; p.vx *= -0.5; }
            if (p.x > 135) { p.x = 135; p.vx *= -0.5; }
            if (p.y < 35) { p.y = 35; p.vy *= -0.5; }
            if (p.y > 120) { p.y = 120; p.vy = 0; }
          }
        } else {
          // Bottom chamber - pile up
          p.vy += 0.2; // gravity
          p.y += p.vy;
          p.x += p.vx;
          
          // Floor collision
          const floor = 265;
          if (p.y > floor) {
            p.y = floor;
            p.vy = 0;
            p.vx *= 0.8;
          }
          
          // Side walls
          if (p.x < 65) { p.x = 65; p.vx *= -0.5; }
          if (p.x > 135) { p.x = 135; p.vx *= -0.5; }
          
          // Simple stacking
          particles.forEach(other => {
            if (other === p || !other.inBottomChamber) return;
            const dx = other.x - p.x;
            const dy = other.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < p.radius + other.radius) {
              const overlap = p.radius + other.radius - dist;
              const nx = dx / dist;
              const ny = dy / dist;
              p.x -= nx * overlap * 0.5;
              p.y -= ny * overlap * 0.5;
            }
          });
        }
        
        // Draw particle
        ctx.fillStyle = p.inBottomChamber 
          ? `rgba(0, 255, 140, ${0.7 + Math.random() * 0.3})`
          : `rgba(0, 224, 255, ${0.6 + Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      
      rafRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [progress, duration, remaining]);
  
  return (
    <div className="hourglass-timer">
      <canvas ref={canvasRef} className="hourglass-canvas" />
      <div className="hourglass-time">
        {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
      </div>
    </div>
  );
}
