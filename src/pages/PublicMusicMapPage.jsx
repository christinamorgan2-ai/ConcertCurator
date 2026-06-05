import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePublicDashboardData } from '../hooks/usePublicDashboardData';
import { GenreNetworkGraph } from '../components/GenreNetworkGraph';
import { buildGenreNetworkData } from '../utils/buildGenreNetworkData';
import { ArrowLeft } from 'lucide-react';

export const PublicMusicMapPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = usePublicDashboardData(id);

  const [nodeThreshold, setNodeThreshold] = useState(1);
  const [edgeThreshold, setEdgeThreshold] = useState(1);

  const graphData = useMemo(() => {
    if (!data || !data.concerts) return { nodes: [], links: [] };
    return buildGenreNetworkData(data, nodeThreshold, edgeThreshold);
  }, [data, nodeThreshold, edgeThreshold]);

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.spinner}></div>
        <p>Loading Music Map...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.errorBox}>
          <h3>Error loading data</h3>
          <p>{error || "Profile not found"}</p>
        </div>
        <br />
        <button onClick={() => navigate('/community')} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Back to Directory</button>
      </div>
    );
  }

  if (data.concerts.length === 0) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, marginBottom: '1rem' }}>
            <ArrowLeft size={16} /> Back to Community
          </button>
          <h1 style={styles.pageTitle}>{data.profile_name}'s Music Map</h1>
          <p style={styles.pageSubtitle}>A constellation of their musical tastes</p>
        </header>
        <div style={styles.emptyContainer}>
          <p>No concerts logged yet. Check back later to see their music map!</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Community
        </button>
        <h1 style={styles.pageTitle}>{data.profile_name}'s Music Map</h1>
        <p style={styles.pageSubtitle}>A constellation of their musical tastes</p>
      </header>

      <div style={styles.blurbBox}>
        <p style={{ margin: 0 }}>
          💡 <strong>Tip for exploring:</strong> If the map feels too crowded, use the sliders below to clean it up!
          Increasing the <strong>Node Threshold</strong> hides rare genres so you only see their most frequent favorites.
          Increasing the <strong>Edge Threshold</strong> hides weak associations, connecting only the genres that consistently show up together.
        </p>
      </div>

      <div className="controls-card" style={styles.controlsCard}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>
            Node Threshold (Min frequency: {nodeThreshold})
          </label>
          <input
            type="range"
            min="1"
            max="15"
            value={nodeThreshold}
            onChange={(e) => setNodeThreshold(Number(e.target.value))}
            style={styles.slider}
          />
        </div>
        <div style={styles.controlGroup}>
          <label style={styles.label}>
            Edge Threshold (Min weight: {edgeThreshold})
          </label>
          <input
            type="range"
            min="1"
            max="15"
            value={edgeThreshold}
            onChange={(e) => setEdgeThreshold(Number(e.target.value))}
            style={styles.slider}
          />
        </div>
        <div className="legend-container" style={styles.legend}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendCircle, width: '12px', height: '12px' }}></div>
            <span>Node Size = Genre Frequency</span>
          </div>
          <div style={styles.legendItem}>
            <div style={styles.legendLine}></div>
            <span>Edge Thickness = Coexistence</span>
          </div>
        </div>
      </div>

      <div style={styles.graphContainer}>
        {graphData.nodes.length === 0 ? (
          <div style={styles.emptyContainer}>
            <p>No genres meet the current threshold criteria. Try lowering the thresholds.</p>
          </div>
        ) : (
          <GenreNetworkGraph data={graphData} />
        )}
      </div>
    </div>
  );
};

const styles = {
  page: { padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', height: '100%' },
  header: { marginBottom: '1.5rem' },
  pageTitle: { fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' },
  pageSubtitle: { margin: 0, color: 'var(--text-muted)' },
  centerContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', width: '100%' },
  errorBox: { padding: '2rem', border: '1px solid #ffcdd2', backgroundColor: '#ffebee', borderRadius: '8px', color: '#c62828' },
  spinner: { border: '4px solid rgba(0,0,0,0.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: 'var(--accent-color)', animation: 'spin 1s linear infinite', marginBottom: '1rem' },
  emptyContainer: { textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' },
  blurbBox: { backgroundColor: '#f0f9ff', borderLeft: '4px solid #3b82f6', color: '#0369a1', padding: '1rem 1.5rem', borderRadius: '0 8px 8px 0', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: '1.5' },
  controlsCard: { display: 'flex', flexWrap: 'wrap', gap: '2rem', backgroundColor: '#fff', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  controlGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px', flex: 1 },
  label: { fontSize: '0.85rem', fontWeight: '600', color: '#334155' },
  slider: { width: '100%', cursor: 'pointer', accentColor: '#0f172a' },
  legend: { display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 1rem', borderLeft: '2px solid #e2e8f0', minWidth: '200px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '500' },
  legendCircle: { backgroundColor: '#0f172a', borderRadius: '50%' },
  legendLine: { width: '20px', height: '3px', backgroundColor: 'rgba(148, 163, 184, 0.6)', borderRadius: '2px' },
  graphContainer: { flex: 1, minHeight: '600px', display: 'flex', flexDirection: 'column' }
};
