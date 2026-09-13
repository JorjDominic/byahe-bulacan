import { Canvas } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function LogoObject() {
  return (
    <Float
      speed={2}
      rotationIntensity={0.8}
      floatIntensity={1.5}
    >
      <mesh>
        <boxGeometry args={[3.5, 2.2, 0.15]} />
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>
    </Float>
  );
}

export default function FloatingLogo3D() {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={2} />
      <directionalLight position={[3, 3, 3]} />
      <LogoObject />
    </Canvas>
  );
}