import React from 'react';
import { Music, MapPin, Users } from 'lucide-react';

export const KeyMetrics = ({ data }) => {
  const { concerts, artists, venues } = data;

  const metrics = [
    {
      title: 'Total Concerts',
      value: concerts.filter(c => c.ConcertID).length || 0,
      icon: <Music size={24} color="var(--text-secondary)" />
    },
    {
      title: 'Total Artists',
      value: artists.filter(a => a.ArtistID).length || 0,
      icon: <Users size={24} color="var(--text-secondary)" />
    },
    {
      title: 'Total Venues',
      value: venues.filter(v => v.VenueID).length || 0,
      icon: <MapPin size={24} color="var(--text-secondary)" />
    }
  ];

  return (
    <div className="responsive-grid" style={styles.container}>
      {metrics.map((metric, idx) => (
        <div key={idx} style={styles.card}>
          <div style={styles.iconContainer}>{metric.icon}</div>
          <div style={styles.textContainer}>
            <h3 style={styles.title}>{metric.title}</h3>
            <p style={styles.value}>{metric.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem'
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  },
  iconContainer: {
    padding: '1rem',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column'
  },
  title: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  value: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    margin: 0
  }
};
