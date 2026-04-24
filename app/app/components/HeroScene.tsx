'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PURPLE = '#7C3AED';
const PURPLE_BRIGHT = '#9B59FF';
const GREEN = '#00FF87';

const SCENE_CENTER: [number, number, number] = [1.8, 0, -1];

// ── Magnetic field core: two icosahedra + glow halo ──────────────
function MagneticField() {
  const ico1Ref = useRef<THREE.Mesh>(null);
  const ico2Ref = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (ico1Ref.current) {
      ico1Ref.current.rotation.y += 0.004;
      ico1Ref.current.rotation.x += 0.001;
    }
    if (ico2Ref.current) {
      ico2Ref.current.rotation.y -= 0.003;
      ico2Ref.current.rotation.z += 0.0015;
    }
    if (haloRef.current) {
      haloRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <group position={SCENE_CENTER}>
      {/* Soft glow halo — additive sphere around the whole structure */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[2.1, 16, 16]} />
        <meshBasicMaterial
          color={PURPLE}
          transparent
          opacity={0.03}
        />
      </mesh>

      {/* Inner icosahedron — angular, fast */}
      <mesh ref={ico1Ref}>
        <icosahedronGeometry args={[1.7, 2]} />
        <meshPhongMaterial
          color="#1a0030"
          emissive={PURPLE}
          emissiveIntensity={0.3}
          specular="#ffffff"
          shininess={100}
          wireframe
        />
      </mesh>

      {/* Outer icosahedron — looser, counter-rotation */}
      <mesh ref={ico2Ref}>
        <icosahedronGeometry args={[2.05, 2]} />
        <meshPhongMaterial
          color="#1a0030"
          emissive={PURPLE_BRIGHT}
          emissiveIntensity={0.2}
          specular="#ffffff"
          shininess={60}
          wireframe
        />
      </mesh>
    </group>
  );
}

// ── Three orbital rings at 0°, 60°, 120° tilt ───────────────────
function OrbitalRings() {
  const r1Ref = useRef<THREE.Mesh>(null);
  const r2Ref = useRef<THREE.Mesh>(null);
  const r3Ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (r1Ref.current) r1Ref.current.rotation.y += 0.0015;
    if (r2Ref.current) r2Ref.current.rotation.y += 0.001;
    if (r3Ref.current) r3Ref.current.rotation.y -= 0.002;
  });

  return (
    <group position={SCENE_CENTER}>
      <mesh ref={r1Ref} rotation={[0, 0, 0]}>
        <torusGeometry args={[2.8, 0.006, 3, 128]} />
        <meshBasicMaterial color={PURPLE} transparent opacity={0.3} />
      </mesh>
      <mesh ref={r2Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.8, 0.006, 3, 128]} />
        <meshBasicMaterial color={PURPLE} transparent opacity={0.22} />
      </mesh>
      <mesh ref={r3Ref} rotation={[(2 * Math.PI) / 3, 0, 0]}>
        <torusGeometry args={[2.8, 0.006, 3, 128]} />
        <meshBasicMaterial color={PURPLE_BRIGHT} transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

// ── Instanced particles with per-particle size variation ─────────
type ParticleGroupProps = {
  count: number;
  center: [number, number, number];
  radius: number;
  opacity: number;
  speed?: number;
  amplitude?: number;
  minScale?: number;
  maxScale?: number;
  asymmetric?: boolean;
};

function ParticleGroup({
  count,
  center,
  radius,
  opacity,
  speed = 0.03,
  amplitude = 0.3,
  minScale = 0.03,
  maxScale = 0.03,
  asymmetric = false,
}: ParticleGroupProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  // Reused matrix — never reallocated in the frame loop
  const mat = useMemo(() => new THREE.Matrix4(), []);

  const { pos, ph, scales } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const ph = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.cbrt(Math.random());
      if (asymmetric) {
        // Ellipsoidal: stretched in X, compressed in Y — creates organic cluster
        pos[i * 3 + 0] = center[0] + r * 1.4 * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = center[1] + r * 0.65 * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = center[2] + r * 0.9 * Math.cos(phi);
      } else {
        pos[i * 3 + 0] = center[0] + r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = center[1] + r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = center[2] + r * Math.cos(phi);
      }
      ph[i * 3 + 0] = Math.random() * Math.PI * 2;
      ph[i * 3 + 1] = Math.random() * Math.PI * 2;
      ph[i * 3 + 2] = Math.random() * Math.PI * 2;
      scales[i] = minScale + Math.random() * (maxScale - minScale);
    }
    return { pos, ph, scales };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, radius, center[0], center[1], center[2], minScale, maxScale, asymmetric]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed;
    for (let i = 0; i < count; i++) {
      const s = scales[i];
      const x = pos[i * 3] + Math.sin(t + ph[i * 3]) * amplitude;
      const y = pos[i * 3 + 1] + Math.cos(t + ph[i * 3 + 1]) * amplitude * 0.7;
      const z = pos[i * 3 + 2] + Math.sin(t + ph[i * 3 + 2]) * amplitude * 0.85;
      // Scale × translate — no rotation needed for round particles
      mat.makeScale(s, s, s);
      mat.elements[12] = x;
      mat.elements[13] = y;
      mat.elements[14] = z;
      ref.current.setMatrixAt(i, mat);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    // Geometry radius 1 — actual size controlled by per-instance scale
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color={PURPLE_BRIGHT} transparent opacity={opacity} />
    </instancedMesh>
  );
}

// ── Scene root ───────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[5, 5, 5]} intensity={2.5} color={PURPLE_BRIGHT} />
      <pointLight position={[-5, -3, 2]} intensity={1} color={GREEN} />

      <MagneticField />
      <OrbitalRings />

      {/* Dense bright cluster — asymmetric ellipsoid, small particles */}
      <ParticleGroup
        count={50}
        center={SCENE_CENTER}
        radius={3.5}
        opacity={0.65}
        speed={0.025}
        amplitude={0.28}
        minScale={0.018}
        maxScale={0.038}
        asymmetric
      />

      {/* Sparse dim halo — larger particles, spherical */}
      <ParticleGroup
        count={25}
        center={SCENE_CENTER}
        radius={5}
        opacity={0.25}
        speed={0.015}
        amplitude={0.5}
        minScale={0.04}
        maxScale={0.07}
        asymmetric={false}
      />

      {/* Ambient background depth */}
      <ParticleGroup
        count={28}
        center={[0, 0, 0]}
        radius={8}
        opacity={0.12}
        speed={0.012}
        amplitude={0.6}
        minScale={0.025}
        maxScale={0.05}
        asymmetric={false}
      />
    </>
  );
}

// ── Exported wrapper ─────────────────────────────────────────────
export function HeroScene() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    >
      <Canvas
        camera={{ position: [0, 0.5, 9], fov: 60 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
