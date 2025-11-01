import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './ThreeBackground.css';

export default function ThreeBackground({ perfLow = false }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  
  useEffect(() => {
    if (perfLow) return; // Skip Three.js in low performance mode
    
    const container = containerRef.current;
    if (!container) return;
    
    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 50;
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    
    // Particle system
    const particleCount = 500;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200;
      positions[i + 1] = (Math.random() - 0.5) * 200;
      positions[i + 2] = (Math.random() - 0.5) * 100;
      
      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02
      });
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00FF8C,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
    
    // Glowing orbits
    const createOrbit = (radius, color, speed) => {
      const geometry = new THREE.RingGeometry(radius - 0.1, radius + 0.1, 64);
      const material = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      });
      const orbit = new THREE.Mesh(geometry, material);
      orbit.rotation.x = Math.PI / 2;
      orbit.userData.speed = speed;
      return orbit;
    };
    
    const orbits = [
      createOrbit(15, 0x00FF8C, 0.001),
      createOrbit(25, 0x00FFB2, 0.0015),
      createOrbit(35, 0x00E0FF, 0.002)
    ];
    
    orbits.forEach(orbit => scene.add(orbit));
    
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x00FF8C, 0.3);
    scene.add(ambientLight);
    
    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    
    const onMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    
    window.addEventListener('mousemove', onMouseMove);
    
    // Handle resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', onResize);
    
    // Animation loop
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      
      // Animate particles
      const positionsArray = particles.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        positionsArray[i3] += velocities[i].x;
        positionsArray[i3 + 1] += velocities[i].y;
        positionsArray[i3 + 2] += velocities[i].z;
        
        // Wrap around boundaries
        if (Math.abs(positionsArray[i3]) > 100) velocities[i].x *= -1;
        if (Math.abs(positionsArray[i3 + 1]) > 100) velocities[i].y *= -1;
        if (Math.abs(positionsArray[i3 + 2]) > 50) velocities[i].z *= -1;
      }
      particles.attributes.position.needsUpdate = true;
      
      // Rotate particle system
      particleSystem.rotation.y += 0.0005;
      
      // Animate orbits
      orbits.forEach(orbit => {
        orbit.rotation.z += orbit.userData.speed;
      });
      
      // Camera follows mouse subtly
      camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
      camera.position.y += (mouseY * 5 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
      particles.dispose();
      particleMaterial.dispose();
      
      orbits.forEach(orbit => {
        orbit.geometry.dispose();
        orbit.material.dispose();
      });
    };
  }, [perfLow]);
  
  if (perfLow) return null;
  
  return <div ref={containerRef} className="three-background" />;
}
