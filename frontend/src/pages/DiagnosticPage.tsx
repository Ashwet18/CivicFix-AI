/**
 * Diagnostic Page - Captures and displays console errors
 */
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function DiagnosticPage() {
  const [errors, setErrors] = useState<string[]>([]);
  const [mapStatus, setMapStatus] = useState('Not tested');

  useEffect(() => {
    // Capture console errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      setErrors(prev => [...prev, args.map(a => String(a)).join(' ')]);
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const testBasicMap = () => {
    setMapStatus('Testing...');
    try {
      setMapStatus('Map container created');
    } catch (err: any) {
      setMapStatus(`ERROR: ${err.message}`);
      setErrors(prev => [...prev, `Map test error: ${err.message}`]);
    }
  };

  useEffect(() => {
    testBasicMap();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1 style={{ color: 'red', fontSize: '24px', marginBottom: '20px' }}>
        🔧 DIAGNOSTIC PAGE
      </h1>

      <div style={{ backgroundColor: '#f0f0f0', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
        <h2>System Status:</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>✓ React is rendering</li>
          <li>✓ TypeScript compiled</li>
          <li>✓ Page loaded</li>
          <li>Map Status: {mapStatus}</li>
        </ul>
      </div>

      <div style={{ backgroundColor: errors.length > 0 ? '#ffe6e6' : '#e6ffe6', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
        <h2>Console Errors: {errors.length}</h2>
        {errors.length === 0 ? (
          <p style={{ color: 'green' }}>✓ No errors captured</p>
        ) : (
          <div style={{ maxHeight: '200px', overflow: 'auto', backgroundColor: 'white', padding: '10px' }}>
            {errors.map((err, idx) => (
              <div key={idx} style={{ color: 'red', marginBottom: '10px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                {idx + 1}. {err}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ backgroundColor: 'yellow', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
        <h2>TEST 1: Minimal Leaflet Map</h2>
        <p>If you see a map below, Leaflet is working:</p>
        <div style={{ height: '400px', width: '100%', border: '3px solid blue', marginTop: '10px' }}>
          <MapContainer
            center={[21.1458, 79.0882]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </MapContainer>
        </div>
      </div>

      <div style={{ backgroundColor: '#e6f2ff', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
        <h2>Instructions:</h2>
        <ol>
          <li>Check if the map above renders</li>
          <li>Open browser DevTools (F12)</li>
          <li>Check Console tab for red errors</li>
          <li>Copy/paste any errors you see</li>
          <li>Report back what you see on this page</li>
        </ol>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '15px', border: '2px solid #000', borderRadius: '5px' }}>
        <h2>What to Report:</h2>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
{`1. Can you see the map above? YES / NO

2. Browser console errors (from DevTools F12):
   [Paste any red errors here]

3. Network tab - any failed requests?
   [Check DevTools → Network, list any red/failed requests]

4. What browser are you using?
   [Chrome / Firefox / Edge / Safari]`}
        </pre>
      </div>
    </div>
  );
}
