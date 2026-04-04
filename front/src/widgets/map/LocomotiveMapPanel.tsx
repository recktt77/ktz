import { X, ArrowRight, Gauge, Heart, Radio, Route } from 'lucide-react';
import type { FleetMapItem } from '@/types/railwayMap';
import { getHealthColor, getHealthBgClass } from '@/lib/mapInterpolation';

interface LocomotiveMapPanelProps {
  loco: FleetMapItem;
  onClose: () => void;
}

export function LocomotiveMapPanel({ loco, onClose }: LocomotiveMapPanelProps) {
  const statusColor = getHealthColor(loco.health_status);

  return (
    <div className="absolute right-0 top-0 z-[1000] h-full w-72 overflow-y-auto border-l border-gray-700 bg-gray-900/95 p-4 backdrop-blur-md">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">{loco.locomotive_id}</h3>
          <span className="mt-0.5 inline-block rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-300">
            {loco.locomotive_model}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* Health index */}
      <div className="mb-4 rounded-xl border border-gray-700 bg-gray-800/50 p-3">
        <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
          <Heart size={12} />
          Health Index
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold" style={{ color: statusColor }}>
            {loco.health_index}
          </span>
          <span className="mb-1 text-xs text-gray-500">/ 100</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-gray-700">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${loco.health_index}%`, backgroundColor: statusColor }}
          />
        </div>
        <div className="mt-1 text-right text-[10px] font-medium capitalize" style={{ color: statusColor }}>
          {loco.health_status}
        </div>
      </div>

      {/* Speed */}
      <div className="mb-3 flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 p-2.5">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Gauge size={12} />
          Speed
        </div>
        <div className="text-sm font-semibold text-white">
          {loco.speed_kmh.toFixed(0)} <span className="text-xs text-gray-500">km/h</span>
        </div>
      </div>

      {/* Route */}
      <div className="mb-3 rounded-lg border border-gray-700 bg-gray-800/50 p-2.5">
        <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
          <Route size={12} />
          Route Progress
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-white">{loco.from_station}</span>
          <ArrowRight size={10} className="text-gray-500" />
          <span className="font-medium text-white">{loco.to_station}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${loco.progress * 100}%` }}
          />
        </div>
        <div className="mt-1 text-right text-[10px] text-gray-500">
          {(loco.progress * 100).toFixed(1)}%
        </div>
      </div>

      {/* Communication */}
      <div className="mb-3 flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 p-2.5">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Radio size={12} />
          Connection
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              loco.communication_status === 'online'
                ? 'bg-green-500'
                : loco.communication_status === 'degraded'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
          />
          <span className="text-xs capitalize text-gray-300">{loco.communication_status}</span>
        </div>
      </div>

      {/* Position details */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-2.5">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          Position
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Latitude</span>
            <span className="font-mono text-gray-300">{loco.latitude.toFixed(4)}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Longitude</span>
            <span className="font-mono text-gray-300">{loco.longitude.toFixed(4)}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Heading</span>
            <span className="font-mono text-gray-300">{loco.heading_deg.toFixed(0)}°</span>
          </div>
        </div>
      </div>
    </div>
  );
}
