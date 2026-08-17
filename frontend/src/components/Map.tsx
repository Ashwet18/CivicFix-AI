import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '../types';

// Fix for default markers in React Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = new Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom marker for user's location
const UserLocationIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3B82F6" width="24" height="24">
      <circle cx="12" cy="12" r="10" stroke="#1E40AF" stroke-width="2" fill="#3B82F6"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

// Custom marker for issues
const IssueIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#DC2626" width="24" height="24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24]
});

interface MapProps {
  center?: Location;
  zoom?: number;
  className?: string;
  height?: string;
  selectedLocation?: Location | null;
  onLocationSelect?: (location: Location) => void;
  markers?: Array<{
    id: string;
    position: Location;
    title: string;
    description?: string;
    type?: 'user' | 'issue' | 'default' | 'hotspot';
    color?: string;
    size?: 'normal' | 'large';
    priority?: string;
    onClick?: () => void;
  }>;
  interactive?: boolean;
}

// Component to handle map click events
function MapClickHandler({ onLocationSelect }: { onLocationSelect?: (location: Location) => void }) {
  useMapEvents({
    click: (e) => {
      if (onLocationSelect) {
        const { lat, lng } = e.latlng;
        onLocationSelect({ lat, lng });
      }
    },
  });
  return null;
}

// Component to handle draggable marker
function DraggableMarker({ 
  position, 
  onPositionChange 
}: { 
  position: Location; 
  onPositionChange: (location: Location) => void; 
}) {
  const [markerPosition, setMarkerPosition] = useState<Location>(position);

  useEffect(() => {
    setMarkerPosition(position);
  }, [position]);

  const eventHandlers = {
    dragend: (e: any) => {
      const marker = e.target;
      const newPosition = marker.getLatLng();
      const location = { lat: newPosition.lat, lng: newPosition.lng };
      setMarkerPosition(location);
      onPositionChange(location);
    },
  };

  return (
    <Marker
      position={[markerPosition.lat, markerPosition.lng]}
      draggable={true}
      eventHandlers={eventHandlers}
      icon={UserLocationIcon}
    >
      <Popup>
        <div className="text-sm">
          <strong>Selected Location</strong>
          <br />
          Lat: {markerPosition.lat.toFixed(6)}
          <br />
          Lng: {markerPosition.lng.toFixed(6)}
          <br />
          <em>Drag to adjust position</em>
        </div>
      </Popup>
    </Marker>
  );
}

export default function Map({
  center = { lat: 40.7128, lng: -74.0060 }, // Default to NYC
  zoom = 13,
  className = '',
  height = '400px',
  selectedLocation,
  onLocationSelect,
  markers = [],
  interactive = true
}: MapProps) {
  const [mapCenter, setMapCenter] = useState<Location>(center);

  // Update center when prop changes
  useEffect(() => {
    setMapCenter(center);
  }, [center]);

  const handleLocationSelect = useCallback((location: Location) => {
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  }, [onLocationSelect]);

  const getMarkerIcon = (type: string = 'default', color?: string, size: 'normal' | 'large' = 'normal') => {
    const isLarge = size === 'large';
    const iconSize = isLarge ? 48 : 32;
    const iconAnchor = isLarge ? 24 : 16;
    const popupAnchor = isLarge ? -48 : -32;
    
    // Special styling for hotspot markers
    if (type === 'hotspot') {
      return new Icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
            <defs>
              <radialGradient id="hotspotGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#FFA500;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#FF4500;stop-opacity:1" />
              </radialGradient>
            </defs>
            <circle cx="24" cy="24" r="20" fill="url(#hotspotGradient)" stroke="#8B4000" stroke-width="3" opacity="0.9"/>
            <path d="M24 8 L28 16 L36 18 L30 24 L32 32 L24 28 L16 32 L18 24 L12 18 L20 16 Z" fill="white" opacity="0.9"/>
            <circle cx="24" cy="24" r="6" fill="#FFD700" stroke="#FF4500" stroke-width="2"/>
          </svg>
        `),
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24]
      });
    }
    
    if (color) {
      // Create custom colored marker
      return new Icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="${iconSize}" height="${iconSize}">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        `),
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconAnchor, iconSize],
        popupAnchor: [0, popupAnchor]
      });
    }
    
    switch (type) {
      case 'user':
        return UserLocationIcon;
      case 'issue':
        return IssueIcon;
      default:
        return DefaultIcon;
    }
  };

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={zoom}
        className="w-full h-full rounded-lg"
        scrollWheelZoom={interactive}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Map click handler for location selection */}
        {interactive && onLocationSelect && (
          <MapClickHandler onLocationSelect={handleLocationSelect} />
        )}
        
        {/* Draggable marker for selected location */}
        {interactive && selectedLocation && onLocationSelect && (
          <DraggableMarker
            position={selectedLocation}
            onPositionChange={handleLocationSelect}
          />
        )}
        
        {/* Static markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.position.lat, marker.position.lng]}
            icon={getMarkerIcon(marker.type, marker.color, marker.size)}
            eventHandlers={marker.onClick ? { click: marker.onClick } : undefined}
          >
            <Popup>
              <div className="text-sm">
                <strong className="block">{marker.title}</strong>
                {marker.description && (
                  <p className="mt-1 text-gray-600">{marker.description}</p>
                )}
                {marker.priority && (
                  <p className="mt-1 text-xs font-medium uppercase text-gray-700">
                    Priority: {marker.priority}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Instructions overlay */}
      {interactive && onLocationSelect && (
        <div className="absolute top-2 left-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs text-gray-700 shadow">
          Click on map or drag marker to select location
        </div>
      )}
    </div>
  );
}

// Helper component for loading state
export function MapSkeleton({ height = '400px', className = '' }: { height?: string; className?: string }) {
  return (
    <div 
      className={`bg-gray-200 animate-pulse rounded-lg flex items-center justify-center ${className}`}
      style={{ height }}
    >
      <div className="text-gray-500">Loading map...</div>
    </div>
  );
}

// Hook for getting user's current location
export function useCurrentLocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLoading(false);
      },
      (err) => {
        let errorMessage = 'Failed to get location. ';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage += 'Please allow location access.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case err.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }, []);

  return { location, loading, error, getCurrentLocation };
}