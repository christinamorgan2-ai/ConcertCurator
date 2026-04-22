import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePublicDashboardData } from '../hooks/usePublicDashboardData';
import { KeyMetrics } from '../components/KeyMetrics';
import { VenueGeoMap } from '../components/VenueGeoMap';
import { GenreTreemap } from '../components/GenreTreemap';
import { TopVenuesChart } from '../components/TopVenuesChart';
import { RecentConcertsList } from '../components/RecentConcertsList';
import { ArrowLeft, Filter } from 'lucide-react';

// Custom lightweight MultiSelect Dropdown component
const MultiSelectDropdown = ({ options, selected, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(item => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectedText = selected.length === 0 
    ? placeholder 
    : `${selected.length} Selected`;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '250px' }}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{...styles.filterInput, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left'}}
      >
        <span style={{ color: selected.length === 0 ? '#94a3b8' : '#0f172a' }}>{selectedText}</span>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>▼</span>
      </button>

      {isOpen && (
        <div style={styles.dropdownPopup}>
          <div style={styles.dropdownList}>
            {options.map(opt => (
              <label key={opt.id} style={styles.dropdownItem}>
                <input 
                  type="checkbox" 
                  checked={selected.includes(opt.id)}
                  onChange={() => toggleOption(opt.id)}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.name}</span>
              </label>
            ))}
            {options.length === 0 && <div style={{padding: '0.5rem', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center'}}>No options found.</div>}
          </div>
          {selected.length > 0 && (
            <div style={{ padding: '0.5rem', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
              <button 
                onClick={() => { onChange([]); setIsOpen(false); }}
                style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: '0.8rem', width: '100%', fontWeight: 'bold' }}
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const PublicDashboardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = usePublicDashboardData(id);

  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedArtists, setSelectedArtists] = useState([]);

  // Sort artists alphabetically for the dropdown selection mapping
  const sortedArtists = useMemo(() => {
    if (!data || !data.artists) return [];
    return [...data.artists].sort((a,b) => (a.name||'').localeCompare(b.name||''));
  }, [data]);

  // Compute a subset of data dynamically based on the active filters
  const filteredData = useMemo(() => {
    if (!data || !data.concerts) return data;

    let validConcerts = [...data.concerts];

    // Filter by Artist Bridge subsetting logic
    if (selectedArtists.length > 0 && data.concertArtistBridge) {
      validConcerts = validConcerts.filter(c => 
        data.concertArtistBridge.some(bridge => bridge.ConcertID === c.ConcertID && selectedArtists.includes(bridge.ArtistID))
      );
    }
    
    // Filter by Absolute Date
    if (dateStart) {
      validConcerts = validConcerts.filter(c => new Date(c.date) >= new Date(dateStart + 'T00:00:00'));
    }
    if (dateEnd) {
      validConcerts = validConcerts.filter(c => new Date(c.date) <= new Date(dateEnd + 'T23:59:59'));
    }

    // Extract corresponding valid nodes from the subsetted valid concerts
    const validConcertIds = validConcerts.map(c => c.ConcertID);
    
    const validConcertArtistBridge = (data.concertArtistBridge || [])
      .filter(b => validConcertIds.includes(b.ConcertID));
      
    const validArtistIds = validConcertArtistBridge.map(b => b.ArtistID);
      
    const validArtists = (data.artists || []).filter(a => validArtistIds.includes(a.ArtistID));
    
    const validVenueIds = validConcerts.map(c => c.VenueID);
    const validVenues = (data.venues || []).filter(v => validVenueIds.includes(v.VenueID));

    return {
      ...data,
      concerts: validConcerts,
      artists: validArtists,
      venues: validVenues,
      concertArtistBridge: validConcertArtistBridge
    };
  }, [data, selectedArtists, dateStart, dateEnd]);

  const clearFilters = () => {
    setDateStart('');
    setDateEnd('');
    setSelectedArtists([]);
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>Loading public profile...</div>;
  
  if (error || !data) return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '6px', display: 'inline-block' }}>{error || "Profile not found"}</div>
      <br /><br />
      <button onClick={() => navigate('/community')} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Back to Directory</button>
    </div>
  );

  const isFiltered = dateStart !== '' || dateEnd !== '' || selectedArtists.length > 0;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Community
        </button>
        <h1 style={styles.pageTitle}>{data.profile_name}'s Dashboard</h1>
        <p style={styles.pageSubtitle}>A visual overview of their lived music scene</p>
      </header>
      
      {/* Dynamic Filter Strip component container */}
      <div style={styles.filterStrip}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: 'bold', fontSize: '0.9rem', marginRight: '1rem' }}>
          <Filter size={18} /> Filters:
        </div>
        
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Start Date</label>
          <input 
            type="date" 
            value={dateStart} 
            onChange={(e) => setDateStart(e.target.value)} 
            style={styles.filterInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>End Date</label>
          <input 
            type="date" 
            value={dateEnd} 
            onChange={(e) => setDateEnd(e.target.value)} 
            style={styles.filterInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Artists</label>
          <MultiSelectDropdown 
            options={sortedArtists} 
            selected={selectedArtists} 
            onChange={setSelectedArtists} 
            placeholder="All Artists"
          />
        </div>

        {isFiltered && (
          <button onClick={clearFilters} style={styles.clearBtn} title="Reset all views">
            Clear All
          </button>
        )}
      </div>

      <main>
        <KeyMetrics data={filteredData} />
        
        <div style={styles.gridContainer}>
          <div style={styles.fullWidthLayout}>
            <VenueGeoMap data={filteredData} />
          </div>
          
          <div style={styles.twoColumnLayout}>
            <GenreTreemap data={filteredData} />
            <TopVenuesChart data={filteredData} />
          </div>
          
          <div style={styles.fullWidthLayout}>
            <RecentConcertsList data={filteredData} />
          </div>
        </div>
      </main>
    </div>
  );
};

const styles = {
  page: { padding: '2rem', maxWidth: '1800px', margin: '0 auto', width: '100%' },
  header: { marginBottom: '1.5rem' },
  pageTitle: { fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' },
  pageSubtitle: { margin: 0, color: 'var(--text-muted)' },
  filterStrip: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#ffffff', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  filterLabel: { fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  filterInput: { padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box', color: '#1e293b', fontFamily: 'inherit', height: '42px' },
  clearBtn: { marginTop: '1.4rem', padding: '0.6rem 1rem', border: 'none', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', height: '42px', display: 'flex', alignItems: 'center', transition: 'background-color 0.2s' },
  dropdownPopup: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', zIndex: 50, display: 'flex', flexDirection: 'column' },
  dropdownList: { maxHeight: '200px', overflowY: 'auto', padding: '0.25rem 0' },
  dropdownItem: { display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.9rem', color: '#334155', transition: 'background-color 0.15s' },
  gridContainer: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  fullWidthLayout: { width: '100%' },
  twoColumnLayout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }
};
