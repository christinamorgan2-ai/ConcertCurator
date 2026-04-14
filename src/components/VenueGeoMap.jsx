import React from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker
} from 'react-simple-maps';

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

export const VenueGeoMap = ({ venues }) => {
  // Filter for valid venues with coordinates
  const validVenues = venues.filter(v => {
    return v.Lat && v.Long && !isNaN(parseFloat(v.Lat)) && !isNaN(parseFloat(v.Long));
  });

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Venue Map</h2>
      <div style={styles.mapContainer}>
        <ComposableMap projection="geoAlbersUsa">
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#f5f5f5"
                  stroke="#e5e5e5"
                />
              ))
            }
          </Geographies>
          {validVenues.map((venue, idx) => {
            const lat = parseFloat(venue.Lat);
            const lng = parseFloat(venue.Long);
            return (
              <Marker key={idx} coordinates={[lng, lat]}>
                <circle r={4} fill="var(--accent-color)" stroke="#fff" strokeWidth={1} />
              </Marker>
            );
          })}
        </ComposableMap>
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
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  },
  title: {
    fontSize: '1.25rem',
    margin: '0 0 1rem 0',
    color: 'var(--text-primary)'
  },
  mapContainer: {
    width: '100%',
    aspectRatio: '16/9'
  }
};
