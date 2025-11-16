import { useEffect, useRef } from 'react';
import './CalmBackground.css';

export default function CalmBackground({ disabled = false }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (disabled || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class
    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = Math.random() * 0.2 + 0.1;
        this.opacity = Math.random() * 0.3 + 0.1;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around edges
        if (this.y > canvas.height) {
          this.y = 0;
          this.x = Math.random() * canvas.width;
        }
        if (this.x < 0 || this.x > canvas.width) {
          this.x = Math.random() * canvas.width;
        }
      }

      draw() {
        ctx.fillStyle = `rgba(0, 224, 138, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create particles (keep count low for performance)
    const particleCount = 80;
    particlesRef.current = Array.from({ length: particleCount }, () => new Particle());

    // Animation loop
    let lastTime = 0;
    const fps = 30; // Limit FPS for better performance
    const fpsInterval = 1000 / fps;

    const animate = (currentTime) => {
      rafRef.current = requestAnimationFrame(animate);

      const elapsed = currentTime - lastTime;
      if (elapsed < fpsInterval) return;
      
      lastTime = currentTime - (elapsed % fpsInterval);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach(particle => {
        particle.update();
        particle.draw();
      });
    };

    rafRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [disabled]);

  return (
    <canvas
      ref={canvasRef}
      className="calm-background-canvas"
      aria-hidden="true"
    />
  );
}
