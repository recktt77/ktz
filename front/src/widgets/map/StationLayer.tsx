import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { MapStationNode } from '@/types/railwayMap';

interface StationLayerProps {
  stations: MapStationNode[];
  compact?: boolean;
}

function createStationIcon(station: MapStationNode, compact: boolean): L.DivIcon {
  const showLabel = !compact || station.type === 'hub';
  const size = station.type === 'hub' ? 10 : station.type === 'junction' ? 7 : 6;

  return L.divIcon({
    className: '',
    html: `
      <div class="station-marker station-marker--${station.type}">
        <div class="station-marker__dot"></div>
        ${showLabel ? `<div class="station-marker__label">${station.name}</div>` : ''}
      </div>
    `,
    iconSize: [size + 20, size + 20],
    iconAnchor: [(size + 20) / 2, (size + 20) / 2],
  });
}

export function StationLayer({ stations, compact = false }: StationLayerProps) {
  return (
    <>
      {stations.map((station) => (
        <Marker
          key={station.id}
          position={[station.latitude, station.longitude]}
          icon={createStationIcon(station, compact)}
          interactive={true}
        >
          <Tooltip direction="top" offset={[0, -10]}>
            <div className="text-center">
              <div className="font-semibold">{station.name}</div>
              <div className="text-[10px] text-gray-400">{station.nameKz}</div>
              <div className="mt-0.5 text-[10px] capitalize text-gray-500">{station.type}</div>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
