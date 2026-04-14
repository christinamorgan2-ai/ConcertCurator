import React, { useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

export const GenreTreemap = ({ data }) => {
  const { concerts, concertArtistBridge, artistGenreBridge, genres } = data;

  const treemapData = useMemo(() => {
    // We want genre frequency based on concerts.
    // Concert -> Artists -> Genres
    const genreCounts = {};

    // 1. Get genre mappings for each artist
    const artistToGenres = {};
    if (artistGenreBridge && artistGenreBridge.length > 0) {
      artistGenreBridge.forEach(bridge => {
        if (!artistToGenres[bridge.ArtistID]) artistToGenres[bridge.ArtistID] = [];
        artistToGenres[bridge.ArtistID].push(bridge.GenreID);
      });
    }

    // 2. Count genres per concert
    if (concertArtistBridge && concertArtistBridge.length > 0) {
      concertArtistBridge.forEach(bridge => {
        const artistGenres = artistToGenres[bridge.ArtistID] || [];
        artistGenres.forEach(genreId => {
          if (!genreCounts[genreId]) genreCounts[genreId] = 0;
          genreCounts[genreId] += 1;
        });
      });
    }

    // 3. Format for Recharts
    if (genres && genres.length > 0) {
      return genres.map(g => ({
        name: g.Name || g.GenreName || g.Genre || 'Unknown',
        size: genreCounts[g.GenreID] || 0
      })).filter(g => g.size > 0).sort((a, b) => b.size - a.size);
    }
    
    return [];
  }, [concerts, concertArtistBridge, artistGenreBridge, genres]);

  const COLORS = ['#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999'];

  const CustomContent = (props) => {
    const { root, depth, x, y, width, height, index, name, size } = props;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: COLORS[index % COLORS.length],
            stroke: '#fff',
            strokeWidth: 2,
            strokeOpacity: 1,
          }}
        />
        {width > 50 && height > 30 ? (
          <text x={x + 8} y={y + 18} fill="#fff" fontSize={12} fontWeight={500}>
            {name}
          </text>
        ) : null}
      </g>
    );
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Genre Distribution</h2>
      <div style={styles.chartContainer}>
        {treemapData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              fill="#333"
              content={<CustomContent />}
            >
              <Tooltip formatter={(value) => [value, 'Concerts']} />
            </Treemap>
          </ResponsiveContainer>
        ) : (
          <div style={styles.empty}>No data available</div>
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
    height: '100%'
  },
  title: {
    fontSize: '1.25rem',
    margin: '0 0 1rem 0',
    color: 'var(--text-primary)'
  },
  chartContainer: {
    width: '100%',
    height: '300px'
  },
  empty: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    color: 'var(--text-muted)'
  }
};
