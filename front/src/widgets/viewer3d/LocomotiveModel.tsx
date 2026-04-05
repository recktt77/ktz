/**
 * Procedural 3D locomotive built from Three.js primitives.
 * Two variants: KZ8A (electric) and TE33A (diesel).
 * Components glow / change color based on live telemetry.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { LocomotiveTelemetry, LocomotiveProcessed, KZ8ATelemetry, TE33ATelemetry } from '@/types';
import { isKZ8ATelemetry } from '@/types';

// color helpers
function statusColor(s: string): string {
  switch (s) {
    case 'ok': return '#22c55e';
    case 'degraded': return '#f59e0b';
    case 'fault': return '#ef4444';
    default: return '#6b7280';
  }
}

function healthColor(hi: number): string {
  if (hi >= 80) return '#22c55e';
  if (hi >= 50) return '#f59e0b';
  return '#ef4444';
}

function lerpScalar(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// shared materials
const BODY_MAT = new THREE.MeshStandardMaterial({ color: '#1a365d', metalness: 0.6, roughness: 0.35 });
const CHASSIS_MAT = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.7, roughness: 0.3 });
const WINDOW_MAT = new THREE.MeshStandardMaterial({ color: '#0ea5e9', metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.6 });
const WHEEL_MAT = new THREE.MeshStandardMaterial({ color: '#374151', metalness: 0.8, roughness: 0.25 });

interface Props {
  telemetry: LocomotiveTelemetry;
  processed: LocomotiveProcessed | null;
}

export function LocomotiveModel({ telemetry, processed }: Props) {
  const isKZ8A = isKZ8ATelemetry(telemetry);
  return isKZ8A
    ? <KZ8AModel telemetry={telemetry as KZ8ATelemetry} processed={processed} />
    : <TE33AModel telemetry={telemetry as TE33ATelemetry} processed={processed} />;
}

// KZ8A Electric locomotive
function KZ8AModel({ telemetry: t, processed: p }: { telemetry: KZ8ATelemetry; processed: LocomotiveProcessed | null }) {
  const groupRef = useRef<THREE.Group>(null!);
  const pantographRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (pantographRef.current) {
      const target = t.pantograph_status === 'ok' ? 1.8 : 0.5;
      const current = pantographRef.current.position.y;
      pantographRef.current.position.y = lerpScalar(current, target, 0.05);
    }
  });

  const hi = p?.health_index ?? 100;
  const hiCol = healthColor(hi);

  return (
    <group ref={groupRef}>
      {/* Chassis */}
      <mesh position={[0, -0.35, 0]} material={CHASSIS_MAT}>
        <boxGeometry args={[8, 0.3, 2.2]} />
      </mesh>

      {/* Main body */}
      <mesh position={[0, 0.55, 0]} material={BODY_MAT}>
        <boxGeometry args={[7.6, 1.5, 2]} />
      </mesh>

      {/* Health glow strip */}
      <mesh position={[0, 1.32, 0]}>
        <boxGeometry args={[7.6, 0.04, 2]} />
        <meshStandardMaterial color={hiCol} emissive={hiCol} emissiveIntensity={0.5} />
      </mesh>

      {/* Cab front */}
      <mesh position={[3.2, 1.1, 0]} material={BODY_MAT}>
        <boxGeometry args={[1.2, 0.8, 2]} />
      </mesh>
      <mesh position={[3.81, 1.15, 0]} material={WINDOW_MAT}>
        <boxGeometry args={[0.02, 0.45, 1.4]} />
      </mesh>
      {[-0.7, 0.7].map((z) => (
        <mesh key={z} position={[3.2, 1.15, z]} material={WINDOW_MAT}>
          <boxGeometry args={[0.9, 0.4, 0.02]} />
        </mesh>
      ))}

      {/* Cab rear */}
      <mesh position={[-3.2, 1.1, 0]} material={BODY_MAT}>
        <boxGeometry args={[1.2, 0.8, 2]} />
      </mesh>
      <mesh position={[-3.81, 1.15, 0]} material={WINDOW_MAT}>
        <boxGeometry args={[0.02, 0.45, 1.4]} />
      </mesh>

      {/* Pantograph */}
      <group ref={pantographRef} position={[1.5, 1.35, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.1, 0.6]} />
          <meshStandardMaterial color={statusColor(t.pantograph_status)} emissive={statusColor(t.pantograph_status)} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, 0.4, 0]} rotation={[0, 0, 0.15]}>
          <boxGeometry args={[0.08, 0.8, 0.08]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.05, 0.4, 0]} rotation={[0, 0, -0.15]}>
          <boxGeometry args={[0.08, 0.8, 0.08]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[1.2, 0.05, 0.06]} />
          <meshStandardMaterial color="#e5e7eb" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Transformer */}
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[2, 0.15, 1.6]} />
        <meshStandardMaterial
          color={t.main_transformer_temp_c > 85 ? '#ef4444' : statusColor(t.main_transformer_status)}
          emissive={t.main_transformer_temp_c > 85 ? '#ef4444' : statusColor(t.main_transformer_status)}
          emissiveIntensity={t.main_transformer_temp_c > 85 ? 0.6 : 0.2}
        />
      </mesh>

      {/* Traction converters */}
      {[1.8, -1.8].map((x) => (
        <mesh key={x} position={[x, -0.05, 0.85]}>
          <boxGeometry args={[1, 0.5, 0.3]} />
          <meshStandardMaterial
            color={statusColor(t.traction_converter_status)}
            emissive={statusColor(t.traction_converter_status)}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* Wheels */}
      <Wheels positions={[-2.8, 0, 2.8]} />

      {/* KTZ stripes */}
      <mesh position={[0, -0.05, 1.01]}>
        <boxGeometry args={[7.6, 0.12, 0.01]} />
        <meshStandardMaterial color="#f5b946" emissive="#f5b946" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, -0.05, -1.01]}>
        <boxGeometry args={[7.6, 0.12, 0.01]} />
        <meshStandardMaterial color="#f5b946" emissive="#f5b946" emissiveIntensity={0.15} />
      </mesh>

      {/* Headlights */}
      <pointLight position={[4.1, 0.8, 0]} intensity={t.communication_status === 'online' ? 2 : 0.3} color="#ffe4b5" distance={8} />
      <mesh position={[4, 0.8, 0.3]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={t.communication_status === 'online' ? 1 : 0.1} />
      </mesh>
      <mesh position={[4, 0.8, -0.3]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={t.communication_status === 'online' ? 1 : 0.1} />
      </mesh>
    </group>
  );
}

// TE33A Diesel locomotive
function TE33AModel({ telemetry: t, processed: p }: { telemetry: TE33ATelemetry; processed: LocomotiveProcessed | null }) {
  const exhaustRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (exhaustRef.current && t.engine_status === 'ok') {
      exhaustRef.current.children.forEach((c, i) => {
        c.position.y = 0.3 + Math.sin(clock.getElapsedTime() * 2 + i) * 0.15;
        (c as THREE.Mesh).scale.setScalar(0.8 + Math.sin(clock.getElapsedTime() * 3 + i * 0.5) * 0.3);
      });
    }
  });

  const hi = p?.health_index ?? 100;
  const hiCol = healthColor(hi);

  return (
    <group>
      {/* Chassis */}
      <mesh position={[0, -0.35, 0]} material={CHASSIS_MAT}>
        <boxGeometry args={[9, 0.3, 2.4]} />
      </mesh>

      {/* Long hood */}
      <mesh position={[-1, 0.7, 0]}>
        <boxGeometry args={[5.5, 1.7, 2.1]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.55} roughness={0.4} />
      </mesh>

      {/* Health glow strip */}
      <mesh position={[-1, 1.57, 0]}>
        <boxGeometry args={[5.5, 0.04, 2.1]} />
        <meshStandardMaterial color={hiCol} emissive={hiCol} emissiveIntensity={0.5} />
      </mesh>

      {/* Short hood */}
      <mesh position={[3.2, 0.5, 0]}>
        <boxGeometry args={[2, 1.2, 2]} />
        <meshStandardMaterial color="#1a365d" metalness={0.6} roughness={0.35} />
      </mesh>

      {/* Cab */}
      <mesh position={[1.8, 1, 0]} material={BODY_MAT}>
        <boxGeometry args={[1.6, 1.1, 2.2]} />
      </mesh>
      <mesh position={[2.61, 1.1, 0]} material={WINDOW_MAT}>
        <boxGeometry args={[0.02, 0.5, 1.6]} />
      </mesh>
      {[-0.9, 0.9].map((z) => (
        <mesh key={z} position={[1.8, 1.1, z * 1.12]} material={WINDOW_MAT}>
          <boxGeometry args={[1.2, 0.45, 0.02]} />
        </mesh>
      ))}

      {/* Engine block */}
      <mesh position={[-1, 0.15, 0]}>
        <boxGeometry args={[4.5, 0.6, 1.6]} />
        <meshStandardMaterial
          color={statusColor(t.engine_status)}
          emissive={statusColor(t.engine_status)}
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Exhaust */}
      <group ref={exhaustRef} position={[-0.5, 1.6, 0]}>
        <mesh position={[0, 0.15, 0.4]}>
          <cylinderGeometry args={[0.12, 0.15, 0.3, 8]} />
          <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.15, -0.4]}>
          <cylinderGeometry args={[0.12, 0.15, 0.3, 8]} />
          <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.3} />
        </mesh>
        {t.engine_status === 'ok' && [0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.3 + i * 0.2, 0]}>
            <sphereGeometry args={[0.06 + i * 0.03, 6, 6]} />
            <meshStandardMaterial color="#9ca3af" transparent opacity={0.3 - i * 0.08} />
          </mesh>
        ))}
      </group>

      {/* Fuel tank */}
      <mesh position={[-1, -0.6, 0]}>
        <boxGeometry args={[3.5, 0.35, 1.8]} />
        <meshStandardMaterial
          color={t.fuel_level_pct > 20 ? '#1e40af' : '#ef4444'}
          emissive={t.fuel_level_pct > 20 ? '#1e40af' : '#ef4444'}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Radiator grilles */}
      {[-0.8, 0.8].map((z) => (
        <group key={z}>
          {[-2, -1, 0].map((x) => (
            <mesh key={x} position={[x, 0.7, z * 1.06]}>
              <boxGeometry args={[0.8, 1, 0.02]} />
              <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Dynamic brake grid */}
      <mesh position={[-2.8, 1.6, 0]}>
        <boxGeometry args={[1.5, 0.15, 1.8]} />
        <meshStandardMaterial
          color={statusColor(t.dynamic_brake_status)}
          emissive={statusColor(t.dynamic_brake_status)}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Wheels */}
      <Wheels positions={[-3.2, 0, 3.2]} />

      {/* KTZ stripes */}
      <mesh position={[0, -0.05, 1.21]}>
        <boxGeometry args={[9, 0.12, 0.01]} />
        <meshStandardMaterial color="#f5b946" emissive="#f5b946" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, -0.05, -1.21]}>
        <boxGeometry args={[9, 0.12, 0.01]} />
        <meshStandardMaterial color="#f5b946" emissive="#f5b946" emissiveIntensity={0.15} />
      </mesh>

      {/* Headlights */}
      <pointLight position={[4.4, 0.5, 0]} intensity={t.communication_status === 'online' ? 2 : 0.3} color="#ffe4b5" distance={8} />
      <mesh position={[4.3, 0.5, 0.35]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={t.communication_status === 'online' ? 1 : 0.1} />
      </mesh>
      <mesh position={[4.3, 0.5, -0.35]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={t.communication_status === 'online' ? 1 : 0.1} />
      </mesh>
    </group>
  );
}

// Shared wheels
function Wheels({ positions }: { positions: number[] }) {
  return (
    <>
      {positions.map((x) =>
        [-1, 1].map((side) => (
          <group key={`${x}-${side}`} position={[x, -0.55, side * 0.95]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={WHEEL_MAT}>
              <cylinderGeometry args={[0.35, 0.35, 0.12, 16]} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.38, 0.38, 0.04, 16]} />
              <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.15} />
            </mesh>
          </group>
        ))
      )}
    </>
  );
}
