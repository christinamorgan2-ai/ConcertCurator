import React, { useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Component to handle auto-fitting the map view dynamically upon venue changes
const MapAutoFit = ({ venues }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!venues || venues.length === 0) return;
    
    const bounds = L.latLngBounds();
    
    venues.forEach(venue => {
      bounds.extend([parseFloat(venue.Lat), parseFloat(venue.Long)]);
    });
    
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [venues, map]);
  
  return null;
};

export const VenueGeoMap = ({ data }) => {
  const venues = data?.venues || [];
  const concerts = data?.concerts || [];
  const mapRef = useRef(null);

  // Maintain performance by memoizing parsed valid venues
  const validVenues = useMemo(() => {
    if (!venues) return [];
    return venues.filter(v => {
      const hasCoords = v.Lat && v.Long && !isNaN(parseFloat(v.Lat)) && !isNaN(parseFloat(v.Long));
      if (!hasCoords) return false;
      
      // Only include venues that actually have an associated concert in this subset of data
      return concerts.some(c => c.venue_id === v.id);
    });
  }, [venues, concerts]);

  const maxConcerts = useMemo(() => {
    if (concerts.length === 0 || validVenues.length === 0) return 1;
    let max = 1;
    validVenues.forEach(v => {
      const count = concerts.filter(c => c.venue_id === v.id).length;
      if (count > max) max = count;
    });
    return max;
  }, [concerts, validVenues]);

  const handleReset = () => {
    if (!mapRef.current || validVenues.length === 0) return;
    
    const bounds = L.latLngBounds();
    validVenues.forEach(venue => {
      bounds.extend([parseFloat(venue.Lat), parseFloat(venue.Long)]);
    });
    
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Venue Map</h2>
        <button onClick={handleReset} style={styles.resetBtn}>Reset Map</button>
      </div>
      
      <div style={styles.mapContainer}>
        {/* We rely on leaflet CSS being loaded. We must keep mapContainer relative with rigid height */}
        <MapContainer 
          center={[39.8283, -98.5795]} 
          zoom={4} 
          scrollWheelZoom={true} 
          style={{ width: '100%', height: '100%', zIndex: 0 }}
          ref={mapRef}
        >
          {/* CartoDB Positron provides beautiful minimal map tiles that fit minimal dashboards */}
          {/* OpenStreetMap handles the massive localized rendering natively */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          
          <MapAutoFit venues={validVenues} />

          {validVenues.map((venue, idx) => {
            const lat = parseFloat(venue.Lat);
            const lng = parseFloat(venue.Long);
            const matches = concerts.filter(c => c.venue_id === venue.id);
            const count = matches.length;
            
            // Calculate ratio between 0 (least concerts) and 1 (most concerts)
            const ratio = maxConcerts > 1 ? (count - 1) / (maxConcerts - 1) : 0;
            
            // Use uniform coral color
            const markerColor = '#E76F51';
            
            // Dynamically scale radius between 6px and 16px
            const markerRadius = 6 + (ratio * 10);
            
            return (
              <CircleMarker 
                key={idx} 
                center={[lat, lng]} 
                radius={markerRadius}
                fillColor={markerColor}
                color="#ffffff"
                weight={1.5}
                fillOpacity={0.85}
              >
                <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                  <div style={{ textAlign: 'left', minWidth: '120px' }}>
                    <strong style={{ display: 'block', marginBottom: '4px', borderBottom: '1px solid #ddd', paddingBottom: '2px', color: '#1a1a1a' }}>
                      {venue.name}
                    </strong>
                    {matches.length > 0 ? (
                      <div>
                        {matches.slice(0, 3).map(c => (
                          <div key={c.id} style={{ color: '#333', marginBottom: '2px', fontSize: '11px' }}>
                            <span style={{ color: '#64748b' }}>{new Date(c.date).toLocaleDateString()}</span>: {c.name}
                          </div>
                        ))}
                        {matches.length > 3 && (
                          <div style={{ color: '#64748b', fontStyle: 'italic', marginTop: '2px', fontSize: '11px' }}>
                            + {matches.length - 3} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: '#64748b', fontSize: '11px' }}>No concerts recorded</div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
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
    cursor: 'pointer',
    zIndex: 2
  },
  mapContainer: {
    width: '100%',
    aspectRatio: '21/9',
    minHeight: '350px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative'
  }
};
