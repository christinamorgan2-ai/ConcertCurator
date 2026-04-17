import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup
} from 'react-simple-maps';

const geoUrlWorld = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const geoUrlStates = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// Helper function to calculate the bounding box, center, and zoom
const computeMapViewport = (venues) => {
  if (!venues || venues.length === 0) {
    return { center: [0, 20], zoom: 1 }; // Default global fallback
  }

  const lats = venues.map(v => parseFloat(v.Lat));
  const lngs = venues.map(v => parseFloat(v.Long));

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Center is the midpoint of the bounds
  const center = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];

  // If all points are practically the same (or just 1 point)
  // we default to a zoom level roughly representing a country/state width.
  if (minLat === maxLat && minLng === maxLng) {
    return { center, zoom: 6 };
  }

  // Delta spans
  // Add padding/buffer so points aren't hugging edges
  const dx = Math.max(1, maxLng - minLng);
  const dy = Math.max(1, maxLat - minLat);

  // Heuristic zoom calculations (Max limits ~ 360 Lng, 180 Lat)
  // Using 1.5 as visual padding
  const zoomX = 360 / (dx * 1.5);
  const zoomY = 180 / (dy * 1.5);

  let zoom = Math.min(zoomX, zoomY);

  // Keep constraints healthy (Max zoom 15 to avoid microscopic street zooms)
  // Min zoom 1 to prevent scrolling beyond normal world view
  zoom = Math.max(1, Math.min(zoom, 15));

  return { center, zoom };
};

export const VenueGeoMap = ({ data }) => {
  const venues = data?.venues || [];
  const concerts = data?.concerts || [];

  // 1. Maintain performance by memoizing parsed valid venues
  const validVenues = useMemo(() => {
    if (!venues) return [];
    return venues.filter(v => {
      const hasCoords = v.Lat && v.Long && !isNaN(parseFloat(v.Lat)) && !isNaN(parseFloat(v.Long));
      if (!hasCoords) return false;
      
      // Only include venues that actually have an associated concert in this subset of data
      return concerts.some(c => c.venue_id === v.id);
    });
  }, [venues, concerts]);

  // 2. Control ZoomableGroup State
  const [position, setPosition] = useState({ center: [0, 20], zoom: 1 });
  const [tooltip, setTooltip] = useState(null);

  // 3. React to upstream data changes to auto-fit
  useEffect(() => {
    setPosition(computeMapViewport(validVenues));
  }, [validVenues]);

  const handleReset = () => {
    setPosition(computeMapViewport(validVenues));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Venue Map</h2>
        <button onClick={handleReset} style={styles.resetBtn}>Reset Map</button>
      </div>
      
      <div style={styles.mapContainer}>
        {/* We use geoMercator to properly scale global points natively rather than geoAlbersUsa */}
        <ComposableMap projection="geoMercator">
          <ZoomableGroup 
            zoom={position.zoom} 
            center={position.center} 
            onMoveEnd={setPosition}
          >
            <Geographies geography={geoUrlWorld}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#f5f5f5"
                    stroke="#e5e5e5"
                    /* Remove default outlines that happen on click/hover for some versions */
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#ececec" },
                      pressed: { outline: "none" }
                    }}
                  />
                ))
              }
            </Geographies>
            {/* Overlay US State Lines on top of the world map */}
            <Geographies geography={geoUrlStates}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="transparent"
                    stroke="#e5e5e5"
                    /* Remove default outlines that happen on click/hover for some versions */
                    style={{
                      default: { outline: "none", pointerEvents: "none" },
                      hover: { outline: "none", pointerEvents: "none" },
                      pressed: { outline: "none", pointerEvents: "none" }
                    }}
                  />
                ))
              }
            </Geographies>
            {validVenues.map((venue, idx) => {
              const lat = parseFloat(venue.Lat);
              const lng = parseFloat(venue.Long);
              return (
                <Marker key={idx} coordinates={[lng, lat]}>
                  {/* Keep visual circle size identical regardless of zoom depth */}
                  <circle 
                    r={4 / position.zoom} 
                    fill="var(--accent-color)" 
                    stroke="#fff" 
                    strokeWidth={1 / position.zoom} 
                    onMouseEnter={(e) => {
                      const matches = concerts.filter(c => c.venue_id === venue.id);
                      setTooltip({
                        venueName: venue.name,
                        concerts: matches,
                        x: e.clientX,
                        y: e.clientY
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {tooltip && (
          <div style={{
            position: 'fixed',
            top: tooltip.y + 10,
            left: tooltip.x + 10,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: '#fff',
            padding: '0.75rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            minWidth: '150px'
          }}>
            <strong style={{ display: 'block', marginBottom: '0.4rem', borderBottom: '1px solid #444', paddingBottom: '0.2rem' }}>
              {tooltip.venueName}
            </strong>
            {tooltip.concerts.length > 0 ? (
               <div>
                 {tooltip.concerts.slice(0, 3).map(c => (
                   <div key={c.id} style={{ color: '#e2e8f0', marginBottom: '0.2rem' }}>
                     <span style={{ color: '#94a3b8' }}>{new Date(c.date).toLocaleDateString()}</span>: {c.name}
                   </div>
                 ))}
                 {tooltip.concerts.length > 3 && (
                   <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '0.2rem' }}>
                     + {tooltip.concerts.length - 3} more
                   </div>
                 )}
               </div>
            ) : (
               <div style={{ color: '#94a3b8' }}>No concerts recorded</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  title: {
    fontSize: '1.25rem',
    margin: 0,
    color: 'var(--text-primary)'
  },
  resetBtn: {
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
    backgroundColor: '#f5f5f5',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  mapContainer: {
    width: '100%',
    aspectRatio: '16/9',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    overflow: 'hidden'
  }
};
