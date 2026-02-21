import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  originalPosition: THREE.Vector3;
}

export function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameIdRef = useRef<number>(0);
  const grainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const grainCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 30;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: 'low-power'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create bokeh particles
    const particleCount = 40;
    const particles: Particle[] = [];

    // Gold and cyan colors with low opacity
    const colors = [
      new THREE.Color('#E8C547'),
      new THREE.Color('#b89d35'),
      new THREE.Color('#00C8FF'),
      new THREE.Color('#0088aa'),
    ];

    for (let i = 0; i < particleCount; i++) {
      const size = Math.random() * 3 + 1;
      const geometry = new THREE.SphereGeometry(size, 16, 16);
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: Math.random() * 0.04 + 0.02,
      });

      const mesh = new THREE.Mesh(geometry, material);
      
      // Random position
      const x = (Math.random() - 0.5) * 60;
      const y = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 20;
      
      mesh.position.set(x, y, z);
      scene.add(mesh);

      particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.005
        ),
        originalPosition: new THREE.Vector3(x, y, z),
      });
    }

    particlesRef.current = particles;

    // Film grain setup
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 256;
    grainCanvas.height = 256;
    grainCanvasRef.current = grainCanvas;
    const grainCtx = grainCanvas.getContext('2d');
    if (grainCtx) {
      grainCtxRef.current = grainCtx;
    }

    // Create grain texture
    const grainTexture = new THREE.CanvasTexture(grainCanvas);
    const grainGeometry = new THREE.PlaneGeometry(100, 100);
    const grainMaterial = new THREE.MeshBasicMaterial({
      map: grainTexture,
      transparent: true,
      opacity: 0.03,
      blending: THREE.AdditiveBlending,
    });
    const grainMesh = new THREE.Mesh(grainGeometry, grainMaterial);
    grainMesh.position.z = 10;
    scene.add(grainMesh);

    // Animation loop
    let frameCount = 0;
    const animate = () => {
      frameCount++;
      
      // Update particles (every frame for smooth movement)
      particles.forEach((particle) => {
        particle.mesh.position.add(particle.velocity);
        
        // Gentle floating motion
        const time = Date.now() * 0.0005;
        particle.mesh.position.y += Math.sin(time + particle.mesh.position.x) * 0.002;
        
        // Boundary check - wrap around
        if (particle.mesh.position.x > 30) particle.mesh.position.x = -30;
        if (particle.mesh.position.x < -30) particle.mesh.position.x = 30;
        if (particle.mesh.position.y > 20) particle.mesh.position.y = -20;
        if (particle.mesh.position.y < -20) particle.mesh.position.y = 20;
      });

      // Update film grain (every 3rd frame for performance ~24fps effect)
      if (frameCount % 3 === 0 && grainCtx) {
        const imageData = grainCtx.createImageData(256, 256);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const value = Math.random() * 255;
          data[i] = value;
          data[i + 1] = value;
          data[i + 2] = value;
          data[i + 3] = 30;
        }
        grainCtx.putImageData(imageData, 0, 0);
        grainTexture.needsUpdate = true;
      }

      renderer.render(scene, camera);
      frameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);
      
      // Cleanup
      particles.forEach((particle) => {
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
      });
      grainGeometry.dispose();
      grainMaterial.dispose();
      grainTexture.dispose();
      renderer.dispose();
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: 'linear-gradient(180deg, #0a0a0b 0%, #111113 100%)' }}
    />
  );
}

export default AnimatedBackground;
