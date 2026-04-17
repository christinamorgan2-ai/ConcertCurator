import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePublicDashboardData } from '../hooks/usePublicDashboardData';
import { KeyMetrics } from '../components/KeyMetrics';
import { VenueGeoMap } from '../components/VenueGeoMap';
import { GenreTreemap } from '../components/GenreTreemap';
import { TopVenuesChart } from '../components/TopVenuesChart';
import { ArrowLeft } from 'lucide-react';

export const PublicDashboardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = usePublicDashboardData(id);

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>Loading public profile...</div>;
  
  if (error || !data) return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '6px', display: 'inline-block' }}>{error || "Profile not found"}</div>
      <br /><br />
      <button onClick={() => navigate('/community')} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Back to Directory</button>
    </div>
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Community
        </button>
        <h1 style={styles.pageTitle}>{data.profile_name}'s Dashboard</h1>
        <p style={styles.pageSubtitle}>A visual overview of their lived music scene</p>
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
  page: { padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' },
  header: { marginBottom: '2rem' },
  pageTitle: { fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' },
  pageSubtitle: { margin: 0, color: 'var(--text-muted)' },
  gridContainer: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  fullWidthLayout: { width: '100%' },
  twoColumnLayout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }
};
