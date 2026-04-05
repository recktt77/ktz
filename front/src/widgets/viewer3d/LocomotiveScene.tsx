/**
 * Full 3D scene: locomotive + environment + floating telemetry labels.
 */
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html, ContactShadows, Grid } from '@react-three/drei';
import { LocomotiveModel } from './LocomotiveModel';
import type { LocomotiveTelemetry, LocomotiveProcessed, KZ8ATelemetry, TE33ATelemetry } from '@/types';
import { isKZ8ATelemetry } from '@/types';

interface Props {
  telemetry: LocomotiveTelemetry;
  processed: LocomotiveProcessed | null;
}

export function LocomotiveScene({ telemetry, processed }: Props) {
  return (
    <Canvas
      camera={{ position: [8, 5, 8], fov: 45 }}
      shadows
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <SceneContent telemetry={telemetry} processed={processed} />
      </Suspense>
    </Canvas>
  );
}

function SceneContent({ telemetry, processed }: Props) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[10, 12, 8]} intensity={1.2} castShadow shadow-mapSize={1024} />
      <directionalLight position={[-5, 8, -4]} intensity={0.4} color="#60a5fa" />

      <Environment preset="night" />

      <Grid
        position={[0, -0.92, 0]}
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e293b"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#334155"
        fadeDistance={20}
        infiniteGrid
      />
      <ContactShadows position={[0, -0.9, 0]} opacity={0.4} width={14} height={6} blur={2} far={4} />

      <Rail zOffset={0.95} />
      <Rail zOffset={-0.95} />

      <group>
        <LocomotiveModel telemetry={telemetry} processed={processed} />
        <TelemetryLabels telemetry={telemetry} processed={processed} />
      </group>

      <OrbitControls
        makeDefault
        minDistance={4}
        maxDistance={25}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.05}
        enableDamping
        dampingFactor={0.08}
        target={[0, 0.5, 0]}
      />
    </>
  );
}

function Rail({ zOffset }: { zOffset: number }) {
  return (
    <group position={[0, -0.88, zOffset]}>
      <mesh>
        <boxGeometry args={[30, 0.06, 0.06]} />
        <meshStandardMaterial color="#6b7280" metalness={0.9} roughness={0.2} />
      </mesh>
      {Array.from({ length: 20 }, (_, i) => (
        <mesh key={i} position={[-10 + i, -0.04, 0]}>
          <boxGeometry args={[0.15, 0.04, 0.5]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
      ))}
    </group>
  );
}

function TelemetryLabels({ telemetry, processed }: Props) {
  const isKZ = isKZ8ATelemetry(telemetry);
  const hi = processed?.health_index ?? 0;
  const hiCol = hi >= 80 ? '#22c55e' : hi >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <>
      <Html position={[0, 2.5, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="viewer3d-label viewer3d-label--health">
          <span className="viewer3d-label__title">Здоровье</span>
          <span className="viewer3d-label__value" style={{ color: hiCol }}>{hi}<small>/100</small></span>
        </div>
      </Html>

      <Html position={[4.5, 1.5, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="viewer3d-label">
          <span className="viewer3d-label__title">Скорость</span>
          <span className="viewer3d-label__value">{telemetry.speed_kmh.toFixed(0)} <small>км/ч</small></span>
        </div>
      </Html>

      <Html position={[-4, -0.2, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="viewer3d-label">
          <span className="viewer3d-label__title">Тормоза</span>
          <span className="viewer3d-label__value" style={{ color: sc(telemetry.brake_system_status) }}>
            {telemetry.brake_system_pressure_bar.toFixed(1)} <small>бар</small>
          </span>
        </div>
      </Html>

      {isKZ ? <KZ8ALabels t={telemetry as KZ8ATelemetry} /> : <TE33ALabels t={telemetry as TE33ATelemetry} />}
    </>
  );
}

function KZ8ALabels({ t }: { t: KZ8ATelemetry }) {
  return (
    <>
      <Html position={[1.5, 3, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="viewer3d-label">
          <span className="viewer3d-label__title">Пантограф</span>
          <span className="viewer3d-label__value" style={{ color: sc(t.pantograph_status) }}>
            {t.catenary_voltage_kv.toFixed(1)} <small>кВ</small> / {t.catenary_current_a.toFixed(0)} <small>А</small>
          </span>
        </div>
      </Html>

      <Html position={[0, 2, 1.5]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="viewer3d-label">
          <span className="viewer3d-label__title">Трансформатор</span>
          <span className="viewer3d-label__value" style={{ color: sc(t.main_transformer_status) }}>
            {t.main_transformer_temp_c.toFixed(0)}°C / {t.main_transformer_load_pct.toFixed(0)}%
          </span>
        </div>
      </Html>

      <Html position={[2, 0.3, -1.5]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="viewer3d-label">
          <span className="viewer3d-label__title">Тяга</span>
          <span className="viewer3d-label__value">{t.tractive_effort_kn.toFixed(0)} <small>кН</small></span>
        </div>
      </Html>

      <Html position={[-2, 2, -1.5]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="viewer3d-label">
          <span className="viewer3d-label__title">Энергия</span>
          <span className="viewer3d-label__value">{t.energy_consumption_kw.toFixed(0)} <small>кВт</small></span>
        </div>
      </Html>
    </>
  );
}

function TE33ALabels({ t }: { t: TE33ATelemetry }) {
  return (
    <>
      <Html position={[-1, 2.2, 1.5]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="viewer3d-label">
          <span className="viewer3d-label__title">Двигатель</span>
          <span className="viewer3d-label__value" style={{ color: sc(t.engine_status) }}>
            {t.engine_rpm.toFixed(0)} <small>об/м</small> / {t.engine_load_pct.toFixed(0)}%
          </span>
        </div>
      </Html>

      <Html position={[-1, -0.2, 1.5]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="viewer3d-label">
          <span className="viewer3d-label__title">Топливо</span>
          <span className="viewer3d-label__value" style={{ color: t.fuel_level_pct > 20 ? '#22c55e' : '#ef4444' }}>
            {t.fuel_level_pct.toFixed(0)}% / {t.fuel_consumption_lph.toFixed(0)} <small>л/ч</small>
          </span>
        </div>
      </Html>

      <Html position={[-3, 2.2, -1.5]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="viewer3d-label">
          <span className="viewer3d-label__title">Дин. тормоз</span>
          <span className="viewer3d-label__value" style={{ color: sc(t.dynamic_brake_status) }}>
            {sl(t.dynamic_brake_status)}
          </span>
        </div>
      </Html>
    </>
  );
}

function sc(s: string) {
  switch (s) {
    case 'ok': return '#22c55e';
    case 'degraded': return '#f59e0b';
    case 'fault': return '#ef4444';
    default: return '#6b7280';
  }
}

function sl(s: string) {
  switch (s) {
    case 'ok': return 'Норма';
    case 'degraded': return 'Деград.';
    case 'fault': return 'Отказ';
    default: return s;
  }
}
