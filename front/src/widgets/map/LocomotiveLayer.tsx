import { useEffect, useRef } from 'react';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FleetMapItem } from '@/types/railwayMap';

interface LocomotiveLayerProps {
  fleet: FleetMapItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function getStatusClass(item: FleetMapItem): string {
  if (item.communication_status === 'offline') return 'offline';
  return item.health_status;
}

const STATUS_COLORS: Record<string, string> = {
  normal: '#22c55e',
  warning: '#eab308',
  critical: '#ef4444',
  offline: '#6b7280',
};

function createLocoIcon(item: FleetMapItem, isSelected: boolean): L.DivIcon {
  const status = getStatusClass(item);
  const selectedClass = isSelected ? 'loco-marker--selected' : '';
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.offline;

  return L.divIcon({
    className: '',
    html: `
      <div class="loco-marker loco-marker--${status} ${selectedClass}">
        <div class="loco-marker__icon-wrap">
          <img
            src="/BSicon_exTRAIN3.svg"
            class="loco-marker__train-svg"
            style="filter: drop-shadow(0 0 4px ${color});"
            alt=""
          />
          <div class="loco-marker__status-dot" style="background:${color};box-shadow:0 0 6px ${color};"></div>
        </div>
        <div class="loco-marker__id">${item.locomotive_id}</div>
        <div class="loco-marker__model">${item.locomotive_model}</div>
      </div>
    `,
    iconSize: [64, 56],
    iconAnchor: [32, 28],
  });
}

function AnimatedLocoMarker({
  item,
  isSelected,
  onSelect,
}: {
  item: FleetMapItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const prevPos = useRef<[number, number]>([item.latitude, item.longitude]);
  const animFrame = useRef(0);

  // Animate marker movement smoothly
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const from = prevPos.current;
    const to: [number, number] = [item.latitude, item.longitude];
    prevPos.current = to;

    // Skip animation if jump is too large (teleport)
    const dLat = Math.abs(to[0] - from[0]);
    const dLng = Math.abs(to[1] - from[1]);
    if (dLat > 2 || dLng > 2) {
      marker.setLatLng(to);
      return;
    }

    const duration = 2500; // match route_context_update interval
    const start = performance.now();

    cancelAnimationFrame(animFrame.current);

    function step(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const e = t * (2 - t); // ease-out
      const lat = from[0] + (to[0] - from[0]) * e;
      const lng = from[1] + (to[1] - from[1]) * e;
      marker!.setLatLng([lat, lng]);
      if (t < 1) animFrame.current = requestAnimationFrame(step);
    }

    animFrame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame.current);
  }, [item.latitude, item.longitude]);

  // Update icon when status/selection changes
  const icon = createLocoIcon(item, isSelected);

  return (
    <Marker
      ref={markerRef}
      position={[item.latitude, item.longitude]}
      icon={icon}
      zIndexOffset={isSelected ? 1000 : item.health_status === 'critical' ? 500 : 0}
      eventHandlers={{
        click: () => onSelect(item.locomotive_id),
      }}
    >
      <Tooltip direction="top" offset={[0, -24]}>
        <div className="min-w-[160px] space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold">{item.locomotive_id}</span>
            <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px]">
              {item.locomotive_model}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Health</span>
            <span
              className="font-semibold"
              style={{ color: getHealthColor(item.health_status) }}
            >
              {item.health_index}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Speed</span>
            <span>{item.speed_kmh.toFixed(0)} km/h</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Route</span>
            <span>
              {item.from_station} → {item.to_station}
            </span>
          </div>
          <div className="h-1 rounded-full bg-gray-700">
            <div
              className="h-full rounded-full"
              style={{
                width: `${item.progress * 100}%`,
                backgroundColor: getHealthColor(item.health_status),
              }}
            />
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
}

function getHealthColor(status: string): string {
  if (status === 'normal') return '#22c55e';
  if (status === 'warning') return '#eab308';
  return '#ef4444';
}

export function LocomotiveLayer({ fleet, selectedId, onSelect }: LocomotiveLayerProps) {
  return (
    <>
      {fleet.map((item) => (
        <AnimatedLocoMarker
          key={item.locomotive_id}
          item={item}
          isSelected={item.locomotive_id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
