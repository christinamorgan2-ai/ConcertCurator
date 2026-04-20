import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const TopVenuesChart = ({ data }) => {
  const { concerts, venues } = data;

  const chartData = useMemo(() => {
    const venueCounts = {};

    if (concerts && concerts.length > 0) {
      concerts.forEach(c => {
        if (c.VenueID) {
          if (!venueCounts[c.VenueID]) venueCounts[c.VenueID] = 0;
          venueCounts[c.VenueID] += 1;
        }
      });
    }

    if (venues && venues.length > 0) {
      return venues
        .map(v => ({
          name: v.Name || v.VenueName || v.Venue || 'Unknown Venue',
          concerts: venueCounts[v.VenueID] || 0
        }))
        .filter(v => v.concerts > 0)
        .sort((a, b) => b.concerts - a.concerts)
        .slice(0, 10); // Top 10
    }
    return [];
  }, [concerts, venues]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Top 10 Venues</h2>
      <div style={styles.chartContainer}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E5E5" />
              <XAxis type="number" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={150} 
                tick={{ fill: 'var(--text-primary)', fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip 
                cursor={{ fill: '#f5f5f5' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E5E5', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
              />
              <Bar dataKey="concerts" fill="#333333" radius={[0, 4, 4, 0]} />
            </BarChart>
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
