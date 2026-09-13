import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, useTexture, AdaptiveDpr, Preload } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";

import logoUrl from "../../assets/images/byahebulacan.png";

/**
 * HeroScene — a deliberately lightweight Three.js scene for the hero's
 * right column:
 *   • the transparent BiyaheBulacan logo on a gently floating plane
 *   • four floating geometric accents (icosahedron, torus, dodecahedron, octahedron)
 *   • soft ambient + directional + two coloured point lights
 *
 * Performance / accessibility notes:
 *   • dpr is capped at 1.75 and AdaptiveDpr lowers it on weak GPUs
 *   • the <canvas> has pointerEvents: none, so it never blocks scroll/clicks
 *   • when the user prefers reduced motion the render loop is frozen
 *     ("demand") and per-frame rotation is skipped
 *   • no HDR Environment is loaded (avoids a CDN fetch + GPU cost); the
 *     logo uses an unlit basic material so it always reads regardless of lights
 */

function LogoPlane() {
  const texture = useTexture(logoUrl);
  // Size the plane to the logo's real aspect ratio so it is never stretched,
  // whatever the source image dimensions happen to be.
  const img = texture.image || {};
  const aspect = img.width && img.height ? img.width / img.height : 2.2;
  const height = 1.7;
  const width = height * aspect;

  return (
    <Float speed={1.4} rotationIntensity={0.35} floatIntensity={0.9}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.05}
          toneMapped={false}
        />
      </mesh>
    </Float>
  );
}

function FloatingShape({
  position,
  scale = 1,
  color,
  emissive,
  speed = 0.3,
  floatSpeed = 1.2,
  frozen,
  children,
}) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (frozen || !ref.current) return;
    ref.current.rotation.x += delta * speed * 0.5;
    ref.current.rotation.y += delta * speed;
  });

  return (
    <Float speed={floatSpeed} rotationIntensity={0.6} floatIntensity={1.1}>
      <mesh ref={ref} position={position} scale={scale}>
        {children}
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.45}
          roughness={0.35}
          metalness={0.1}
        />
      </mesh>
    </Float>
  );
}

export default function HeroScene() {
  const reduceMotion = useReducedMotion();

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      frameloop={reduceMotion ? "demand" : "always"}
      style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.85} />
      {/* NOTE: pointLight intensity units changed across three.js versions.
          If the shapes look too dim/bright on your installed version, tweak
          these two numbers. The logo is unaffected (it uses a basic material). */}
      <pointLight position={[3, 2, 4]} intensity={18} distance={20} color="#f4a124" />
      <pointLight position={[-4, -2, 3]} intensity={14} distance={20} color="#2e8b57" />

      <Suspense fallback={null}>
        <LogoPlane />

        <FloatingShape position={[2.6, 1.5, -1]} color="#f4a124" emissive="#b8760a" speed={0.35} floatSpeed={1.3} frozen={reduceMotion}>
          <icosahedronGeometry args={[0.55, 0]} />
        </FloatingShape>

        <FloatingShape position={[-2.7, 1.1, -1.5]} color="#2e8b57" emissive="#1a5c3c" speed={0.45} floatSpeed={1.6} frozen={reduceMotion}>
          <torusGeometry args={[0.4, 0.16, 16, 40]} />
        </FloatingShape>

        <FloatingShape position={[-2.4, -1.6, -1]} color="#ffd27a" emissive="#f4a124" speed={0.3} floatSpeed={1.1} frozen={reduceMotion}>
          <dodecahedronGeometry args={[0.45, 0]} />
        </FloatingShape>

        <FloatingShape position={[2.5, -1.4, -1.2]} color="#7fd1a8" emissive="#2e8b57" speed={0.4} floatSpeed={1.4} frozen={reduceMotion}>
          <octahedronGeometry args={[0.5, 0]} />
        </FloatingShape>

        <Preload all />
      </Suspense>

      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
