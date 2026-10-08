import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import type * as THREE from 'three';

function FloatingPolyhedron({
  position,
  rotation,
  color,
  scale = 1,
  type = 'box',
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  scale?: number;
  type?: 'box' | 'octa' | 'torus' | 'tetra';
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.25;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
      <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
        {type === 'box' && <boxGeometry args={[1.2, 1.2, 1.2]} />}
        {type === 'octa' && <octahedronGeometry args={[1, 0]} />}
        {type === 'torus' && <torusGeometry args={[0.9, 0.35, 16, 32]} />}
        {type === 'tetra' && <tetrahedronGeometry args={[1.1, 0]} />}
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.8}
          wireframe={false}
          transparent
          opacity={0.85}
        />
      </mesh>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#818cf8" />
      <pointLight position={[-10, -5, -5]} intensity={2} color="#38bdf8" />
      <pointLight position={[5, -5, 5]} intensity={1} color="#c084fc" />

      {/* Floating geometric icons/nodes */}
      <FloatingPolyhedron
        position={[-1.8, 1.2, -1]}
        rotation={[0.4, 0.2, 0]}
        color="#6366f1"
        scale={0.9}
        type="octa"
      />
      <FloatingPolyhedron
        position={[2, 0.8, -1.5]}
        rotation={[0.2, 0.5, 0.3]}
        color="#38bdf8"
        scale={0.8}
        type="torus"
      />
      <FloatingPolyhedron
        position={[-1.2, -1.5, 0]}
        rotation={[0.5, 0.1, 0.4]}
        color="#a855f7"
        scale={0.7}
        type="box"
      />
      <FloatingPolyhedron
        position={[1.6, -1.4, -0.5]}
        rotation={[0.1, 0.4, 0.2]}
        color="#818cf8"
        scale={0.85}
        type="tetra"
      />
    </>
  );
}

export const GeometricCanvas: React.FC<{ className?: string }> = ({ className }) => {
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const supported = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
      setHasWebGL(supported);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  if (!hasWebGL) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-indigo-950/40 via-slate-900 to-sky-950/40 ${className}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.15),transparent_60%)]" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
      >
        <Scene />
      </Canvas>
    </div>
  );
};
