import { Polyline, Tooltip } from 'react-leaflet';
import type { MapRouteDefinition } from '@/types/railwayMap';

interface RouteLayerProps {
  routes: MapRouteDefinition[];
  highlightedRouteId: string | null;
}

export function RouteLayer({ routes, highlightedRouteId }: RouteLayerProps) {
  return (
    <>
      {routes.map((route) => {
        const isHighlighted = route.id === highlightedRouteId;

        return (
          <Polyline
            key={route.id}
            positions={route.waypoints.map(([lat, lng]) => [lat, lng])}
            pathOptions={{
              color: isHighlighted ? '#3b82f6' : '#334155',
              weight: isHighlighted ? 3.5 : 1.8,
              opacity: isHighlighted ? 0.9 : 0.5,
              dashArray: isHighlighted ? undefined : '6 4',
              lineCap: 'round',
              lineJoin: 'round',
            }}
          >
            <Tooltip sticky>
              <div className="text-xs">
                <div className="font-semibold">{route.name}</div>
                <div className="text-gray-400">{route.distance_km} km</div>
              </div>
            </Tooltip>
          </Polyline>
        );
      })}
    </>
  );
}
