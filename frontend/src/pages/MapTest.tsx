/**
 * DIAGNOSTIC TEST PAGE for Map Component
 * 
 * This page tests the Map component in isolation to identify the root cause
 * of the blank AdminMapPage issue.
 */
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// TEST A: Bare minimum map with hardcoded Nagpur center
export function TestA_BareMinimumMap() {
  console.log('TestA: Rendering bare minimum map');
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">TEST A: Bare Minimum Map</h1>
      <div style={{ height: '600px', width: '100%' }}>
        <MapContainer
          center={[21.1458, 79.0882]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
      </div>
    </div>
  );
}

// TEST B: Map with one hardcoded marker
export function TestB_WithMarker() {
  console.log('TestB: Rendering map with marker');
  
  const simpleIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#DC2626" width="24" height="24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">TEST B: Map with Marker</h1>
      <div style={{ height: '600px', width: '100%' }}>
        <MapContainer
          center={[21.1458, 79.0882]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[21.1458, 79.0882]} icon={simpleIcon}>
            <Popup>Test Marker at Nagpur Center</Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}

// TEST C: Map using our Map component
import Map from '../components/Map';

export function TestC_OurMapComponent() {
  console.log('TestC: Rendering our Map component');
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">TEST C: Our Map Component</h1>
      <Map
        center={{ lat: 21.1458, lng: 79.0882 }}
        zoom={13}
        height="600px"
        markers={[]}
        interactive={true}
      />
    </div>
  );
}

// TEST D: Map with mock issue data
export function TestD_WithMockData() {
  console.log('TestD: Rendering map with mock data');
  
  const mockMarkers = [
    {
      id: '1',
      position: { lat: 21.1458, lng: 79.0882 },
      title: 'Test Issue #1',
      description: 'Critical pothole',
      type: 'issue' as const,
      color: '#DC2626',
      priority: 'critical'
    },
    {
      id: '2',
      position: { lat: 21.1500, lng: 79.0900 },
      title: 'Test Issue #2',
      description: 'Streetlight broken',
      type: 'issue' as const,
      color: '#EA580C',
      priority: 'high'
    }
  ];
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">TEST D: Map with Mock Data</h1>
      <Map
        center={{ lat: 21.1458, lng: 79.0882 }}
        zoom={13}
        height="600px"
        markers={mockMarkers}
        interactive={true}
      />
    </div>
  );
}

// Main diagnostic page - renders all tests
export default function MapTest() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-4 mb-6">
        <h1 className="text-3xl font-bold">Map Component Diagnostics</h1>
        <p className="mt-2">Testing map rendering in isolation to identify issues</p>
      </div>
      
      <div className="space-y-8">
        <TestA_BareMinimumMap />
        <div className="border-t-4 border-gray-300 my-8"></div>
        
        <TestB_WithMarker />
        <div className="border-t-4 border-gray-300 my-8"></div>
        
        <TestC_OurMapComponent />
        <div className="border-t-4 border-gray-300 my-8"></div>
        
        <TestD_WithMockData />
      </div>
    </div>
  );
}
