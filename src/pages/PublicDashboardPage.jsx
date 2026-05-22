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

  const [dateFilter, setDateFilter] = useState('all_time');
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [selectedVenues, setSelectedVenues] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);

  // Sort artists alphabetically for the dropdown selection mapping
  const sortedArtists = useMemo(() => {
    if (!data || !data.artists) return [];
    return [...data.artists].sort((a,b) => (a.name||'').localeCompare(b.name||''));
  }, [data]);

  const sortedVenues = useMemo(() => {
    if (!data || !data.venues) return [];
    return [...data.venues].sort((a,b) => (a.name||'').localeCompare(b.name||''));
  }, [data]);

  const sortedGenres = useMemo(() => {
    if (!data || !data.genres) return [];
    return [...data.genres].sort((a,b) => (a.name||'').localeCompare(b.name||''));
  }, [data]);

  // Compute a subset of data dynamically based on the active filters
  const filteredData = useMemo(() => {
    if (!data || !data.concerts) return data;

    let validConcerts = [...data.concerts];

    // Filter by Date
    if (dateFilter === 'this_year') {
      const currentYear = new Date().getFullYear();
      validConcerts = validConcerts.filter(c => new Date(c.date).getFullYear() === currentYear);
    } else if (dateFilter === 'last_12_months') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      validConcerts = validConcerts.filter(c => new Date(c.date) >= oneYearAgo);
    }

    // Filter by Artist Bridge subsetting logic
    if (selectedArtists.length > 0 && data.concertArtistBridge) {
      validConcerts = validConcerts.filter(c => 
        data.concertArtistBridge.some(bridge => bridge.ConcertID === c.ConcertID && selectedArtists.includes(bridge.ArtistID))
      );
    }
    
    // Filter by Venue
    if (selectedVenues.length > 0) {
      validConcerts = validConcerts.filter(c => selectedVenues.includes(c.VenueID));
    }

    // Filter by Genre (OR logic)
    if (selectedGenres.length > 0 && data.artistGenreBridge && data.concertArtistBridge) {
      validConcerts = validConcerts.filter(c => {
        const concertArtists = data.concertArtistBridge
          .filter(b => b.ConcertID === c.ConcertID)
          .map(b => b.ArtistID);
          
        const concertGenres = data.artistGenreBridge
          .filter(b => concertArtists.includes(b.ArtistID))
          .map(b => b.GenreID);
          
        return concertGenres.some(g => selectedGenres.includes(g));
      });
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
  }, [data, dateFilter, selectedArtists, selectedVenues, selectedGenres]);

  const clearFilters = () => {
    setDateFilter('all_time');
    setSelectedArtists([]);
    setSelectedVenues([]);
    setSelectedGenres([]);
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>Loading public profile...</div>;
  
  if (error || !data) return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '6px', display: 'inline-block' }}>{error || "Profile not found"}</div>
      <br /><br />
      <button onClick={() => navigate('/community')} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Back to Directory</button>
    </div>
  );

  const isFiltered = dateFilter !== 'all_time' || selectedArtists.length > 0 || selectedVenues.length > 0 || selectedGenres.length > 0;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: 'bold', fontSize: '0.9rem', width: '100%' }}>
          <Filter size={18} /> Filters
        </div>
        
        {/* Row 1: Date Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', flexWrap: 'wrap' }}>
          <button 
            style={dateFilter === 'this_year' ? styles.chipActive : styles.chipInactive} 
            onClick={() => setDateFilter('this_year')}
          >
            This Year
          </button>
          <button 
            style={dateFilter === 'last_12_months' ? styles.chipActive : styles.chipInactive} 
            onClick={() => setDateFilter('last_12_months')}
          >
            Last 12 Months
          </button>
          <button 
            style={dateFilter === 'all_time' ? styles.chipActive : styles.chipInactive} 
            onClick={() => setDateFilter('all_time')}
          >
            All Time
          </button>
        </div>

        {/* Row 2: Dropdowns */}
        <div style={{ display: 'flex', gap: '1rem', width: '100%', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Artists</label>
            <MultiSelectDropdown 
              options={sortedArtists} 
              selected={selectedArtists} 
              onChange={setSelectedArtists} 
              placeholder="All Artists"
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Venues</label>
            <MultiSelectDropdown 
              options={sortedVenues} 
              selected={selectedVenues} 
              onChange={setSelectedVenues} 
              placeholder="All Venues"
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Genres</label>
            <MultiSelectDropdown 
              options={sortedGenres} 
              selected={selectedGenres} 
              onChange={setSelectedGenres} 
              placeholder="All Genres"
            />
          </div>

          {isFiltered && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={clearFilters} style={{ ...styles.clearBtn, marginTop: 0 }} title="Reset all filters">
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      <main>
        {data.concerts && data.concerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 2rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)', margin: '2rem 0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>No Concerts Yet!</h2>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
              {data.profile_name} hasn't logged any concerts on their profile yet. Check back later to see their live music journey!
            </p>
          </div>
        ) : (
          <>
            <KeyMetrics data={filteredData} />
            
            <div style={styles.gridContainer}>
              <div style={styles.fullWidthLayout}>
                <VenueGeoMap data={filteredData} />
              </div>
              
              <div className="responsive-grid" style={styles.twoColumnLayout}>
                <GenreTreemap data={filteredData} />
                <TopVenuesChart data={filteredData} />
              </div>
              
              <div style={styles.fullWidthLayout}>
                <RecentConcertsList data={filteredData} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const styles = {
  page: { padding: '2rem', maxWidth: '1800px', margin: '0 auto', width: '100%' },
  header: { marginBottom: '1.5rem' },
  pageTitle: { fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' },
  pageSubtitle: { margin: 0, color: 'var(--text-muted)' },
  filterStrip: { display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' },
  chipActive: { padding: '0.4rem 1rem', borderRadius: '20px', border: 'none', backgroundColor: 'var(--text-primary)', color: '#ffffff', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' },
  chipInactive: { padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s, color 0.2s' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  filterLabel: { fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  filterInput: { padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box', color: '#1e293b', fontFamily: 'inherit', height: '42px' },
  clearBtn: { padding: '0.6rem 1rem', border: 'none', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', height: '42px', display: 'flex', alignItems: 'center', transition: 'background-color 0.2s' },
  dropdownPopup: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', zIndex: 50, display: 'flex', flexDirection: 'column' },
  dropdownList: { maxHeight: '200px', overflowY: 'auto', padding: '0.25rem 0' },
  dropdownItem: { display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.9rem', color: '#334155', transition: 'background-color 0.15s' },
  gridContainer: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  fullWidthLayout: { width: '100%' },
  twoColumnLayout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }
};
