/**
 * 3D Locomotive Viewer page — full-screen 3D scene with telemetry side panel.
 */
import { useDashboardStore } from '@/store';
import { useTelemetry, useProcessed } from '@/hooks/useTelemetry';
import { LocomotiveScene, ViewerSidePanel } from '@/widgets/viewer3d';
import { Skeleton } from '@/components/Skeleton';

export function LocomotiveViewerPage() {
  const locoId = useDashboardStore((s) => s.selectedLocomotiveId);
  const telemetry = useTelemetry(locoId);
  const processed = useProcessed(locoId);

  if (!locoId || !telemetry) {
    return (
      <div className="viewer3d-page">
        <div className="viewer3d-page__empty">
          <Skeleton className="h-full w-full rounded-2xl" />
          <p className="viewer3d-page__hint">Выберите локомотив для 3D-визуализации</p>
        </div>
      </div>
    );
  }

  return (
    <div className="viewer3d-page animate-fade-in">
      {/* 3D Canvas */}
      <div className="viewer3d-page__canvas">
        <LocomotiveScene telemetry={telemetry} processed={processed} />
        {/* Overlay info */}
        <div className="viewer3d-page__overlay-top">
          <span className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{locoId}</span>
          <span className="viewer3d-page__model-badge">{telemetry.locomotive_model}</span>
        </div>
        <div className="viewer3d-page__overlay-bottom">
          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
            Мышь: вращение · Колёсико: масштаб · ПКМ: перемещение
          </span>
        </div>
      </div>

      {/* Side panel */}
      <ViewerSidePanel telemetry={telemetry} processed={processed} />
    </div>
  );
}
