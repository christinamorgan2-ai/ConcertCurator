import React from 'react';
import { KeyMetrics } from '../components/KeyMetrics';
import { VenueGeoMap } from '../components/VenueGeoMap';
import { GenreTreemap } from '../components/GenreTreemap';
import { TopVenuesChart } from '../components/TopVenuesChart';

export const DashboardPage = ({ data }) => {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.pageTitle}>Dashboard Overview</h1>
        <p style={styles.pageSubtitle}>A visual overview of the live music scene</p>
      </header>
      
      <main>
        <KeyMetrics data={data} />
        
        <div style={styles.gridContainer}>
          <div style={styles.fullWidthLayout}>
            <VenueGeoMap data={data} />
          </div>
          
          <div style={styles.twoColumnLayout}>
            <GenreTreemap data={data} />
            <TopVenuesChart data={data} />
          </div>
        </div>
      </main>
    </div>
  );
};

const styles = {
  page: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%'
  },
  header: {
    marginBottom: '2rem'
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    margin: '0 0 0.5rem 0'
  },
  pageSubtitle: {
    margin: 0,
    color: 'var(--text-muted)'
  },
  gridContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  fullWidthLayout: {
    width: '100%'
  },
  twoColumnLayout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '2rem'
  }
};
