import React, { useMemo } from 'react';

export const RecentConcertsList = ({ data }) => {
  const { concerts, venues } = data;

  const sortedConcerts = useMemo(() => {
    if (!concerts || concerts.length === 0) return [];
    return [...concerts].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [concerts]);

  // Quick lookup map for venue names
  const venueMap = useMemo(() => {
    const map = {};
    if (venues) {
      venues.forEach(v => {
        map[v.id] = v.name || v.venue_name || 'Unknown Venue';
      });
    }
    return map;
  }, [venues]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>All Filtered Concerts</h2>
      <div style={styles.listWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Concert Name</th>
              <th style={styles.th}>Venue</th>
            </tr>
          </thead>
          <tbody>
            {sortedConcerts.length === 0 ? (
              <tr>
                <td colSpan="3" style={styles.empty}>No concerts match your filters.</td>
              </tr>
            ) : (
              sortedConcerts.map(c => (
                <tr key={c.id} style={styles.tr}>
                  <td style={styles.td}>{c.date}</td>
                  <td style={{ ...styles.td, fontWeight: 'bold', color: '#1e293b' }}>{c.name}</td>
                  <td style={{ ...styles.td, color: '#64748b' }}>{venueMap[c.venue_id] || 'Unknown Venue'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
    width: '100%',
    marginTop: '2rem'
  },
  title: {
    fontSize: '1.25rem',
    margin: '0 0 1rem 0',
    color: 'var(--text-primary)'
  },
  listWrapper: {
    maxHeight: '400px',
    overflowY: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '8px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    position: 'sticky',
    top: 0,
    backgroundColor: '#f8fafc',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e2e8f0',
    color: '#64748b',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    zIndex: 10
  },
  td: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '0.9rem'
  },
  tr: {
    transition: 'background-color 0.15s'
  },
  empty: {
    padding: '2rem',
    textAlign: 'center',
    color: '#94a3b8',
    fontStyle: 'italic'
  }
};
