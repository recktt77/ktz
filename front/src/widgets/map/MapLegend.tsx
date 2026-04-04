import type { MapStatusFilter } from '@/types/railwayMap';

interface MapLegendProps {
  statusFilter: MapStatusFilter;
  onFilterChange: (f: MapStatusFilter) => void;
  fleetCount: number;
  compact?: boolean;
}

const FILTERS: { value: MapStatusFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: '#94a3b8' },
  { value: 'normal', label: 'Normal', color: '#22c55e' },
  { value: 'warning', label: 'Warning', color: '#eab308' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
];

export function MapLegend({ statusFilter, onFilterChange, compact }: MapLegendProps) {
  return (
    <div className="absolute bottom-3 right-3 z-[1000] rounded-lg bg-gray-900/90 p-2 backdrop-blur-sm">
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
        Filter
      </div>
      <div className="flex flex-col gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`flex items-center gap-2 rounded px-2 py-0.5 text-left text-xs transition-colors ${
              statusFilter === f.value
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: f.color }}
            />
            {f.label}
          </button>
        ))}
      </div>

      {!compact && (
        <div className="mt-2 border-t border-gray-700 pt-2">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
            Legend
          </div>
          <div className="space-y-0.5 text-[10px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-gray-500 bg-gray-600" />
              Hub station
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-4 rounded bg-gray-600" />
              Railway route
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-4 rounded bg-blue-500" />
              Active route
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
