import React, { useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

export const GenreTreemap = ({ data }) => {
  const { concerts, concertArtistBridge, artistGenreBridge, genres, artists } = data;

  const treemapData = useMemo(() => {
    // We want genre frequency based on concerts.
    // Concert -> Artists -> Genres
    const genreCounts = {};
    const genreArtists = {};

    // 1. Get genre mappings for each artist
    const artistToGenres = {};
    if (artistGenreBridge && artistGenreBridge.length > 0) {
      artistGenreBridge.forEach(bridge => {
        if (!artistToGenres[bridge.ArtistID]) artistToGenres[bridge.ArtistID] = [];
        artistToGenres[bridge.ArtistID].push(bridge.GenreID);
      });
    }

    // 2. Count genres per concert and identify associated artists
    if (concertArtistBridge && concertArtistBridge.length > 0) {
      concertArtistBridge.forEach(bridge => {
        const artist = artists?.find(a => a.id === bridge.ArtistID);
        const artistName = artist ? artist.name : 'Unknown Artist';

        const artistGenres = artistToGenres[bridge.ArtistID] || [];
        artistGenres.forEach(genreId => {
          if (!genreCounts[genreId]) {
            genreCounts[genreId] = 0;
            genreArtists[genreId] = new Set();
          }
          genreCounts[genreId] += 1;
          genreArtists[genreId].add(artistName);
        });
      });
    }

    // 3. Format for Recharts
    if (genres && genres.length > 0) {
      return genres.map(g => {
        // Fallback checks for UUID vs mapped keys
        const id = g.GenreID || g.id;
        return {
          name: g.Name || g.GenreName || g.name || 'Unknown',
          size: genreCounts[id] || 0,
          artistsList: Array.from(genreArtists[id] || [])
        };
      }).filter(g => g.size > 0).sort((a, b) => b.size - a.size);
    }
    
    return [];
  }, [concerts, concertArtistBridge, artistGenreBridge, genres, artists]);

  const COLORS = ['#2A4B7C', '#5D3A9B', '#1D6660', '#8E3B46', '#A35C2B', '#6C5B7B', '#355C7D', '#4A7C59', '#9B6A6C', '#B47E3E'];

  const GenreTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataNode = payload[0].payload;
      const artistsArr = dataNode.artistsList || [];
      const displayArtists = artistsArr.slice(0, 10);
      const remaining = artistsArr.length - displayArtists.length;

      return (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 100 }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>{dataNode.name}</p>
          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#1e293b' }}><strong>{dataNode.size}</strong> Concert{dataNode.size !== 1 ? 's' : ''}</p>
          <div style={{ fontSize: '0.8rem', color: '#475569', minWidth: '150px', maxWidth: '250px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.35rem', color: '#334155' }}>Artists:</div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.4' }}>
              {displayArtists.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
            {remaining > 0 && <div style={{ marginTop: '0.4rem', fontStyle: 'italic', fontWeight: 'bold', color: '#64748b' }}>+ {remaining} more</div>}
          </div>
        </div>
      );
    }
    return null;
  };

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
        {width > 60 && height > 40 ? (
          <foreignObject x={x} y={y} width={width} height={height}>
            <div style={{
              width: '100%',
              height: '100%',
              padding: '8px',
              boxSizing: 'border-box',
              color: '#fff',
              overflow: 'hidden',
              WebkitFontSmoothing: 'antialiased',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start'
            }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: 600, 
                whiteSpace: 'nowrap', 
                textOverflow: 'ellipsis', 
                overflow: 'hidden',
                lineHeight: '1.2'
              }}>
                {name}
              </div>
              <div style={{ 
                fontSize: '11px', 
                opacity: 0.9, 
                marginTop: '2px',
                lineHeight: '1.2'
              }}>
                {size}
              </div>
            </div>
          </foreignObject>
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
              <Tooltip content={<GenreTooltip />} />
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
