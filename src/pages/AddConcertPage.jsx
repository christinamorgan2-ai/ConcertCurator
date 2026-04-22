import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { X } from 'lucide-react';

const ObjectSort = (arr, key) => [...arr].sort((a,b) => (a[key] || '').localeCompare(b[key] || ''));

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const COMMON_COUNTRIES = [
  "USA", "Canada", "UK", "Australia", "New Zealand", "Ireland",
  "Germany", "France", "Spain", "Italy", "Netherlands", "Belgium",
  "Sweden", "Norway", "Denmark", "Finland", "Japan", "South Korea", 
  "Mexico", "Brazil", "Argentina", "Chile", "South Africa"
];

export const AddConcertPage = ({ data, refreshData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Venue States
  const [isNewVenue, setIsNewVenue] = useState(false);
  const userDefaultCountry = data.userSettings?.default_country || 'USA';
  const [newVenueData, setNewVenueData] = useState({ 
    name: '', country: userDefaultCountry, region: '', city: '', lat: '', long: '' 
  });

  // Artist Tags State
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [artistInput, setArtistInput] = useState('');

  // Attendee Tags State
  const defaultAttendeeName = data.userSettings?.default_attendee_name || 'Me';
  const [selectedAttendees, setSelectedAttendees] = useState([defaultAttendeeName]);
  const [attendeeInput, setAttendeeInput] = useState('');

  // Primary Concert Form State
  const [formData, setFormData] = useState({
    name: '',
    tour_name: '',
    date: '',
    venue_id: '',
    festival: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleArtistKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = artistInput.trim();
      if (val && !selectedArtists.includes(val)) {
        setSelectedArtists([...selectedArtists, val]);
      }
      setArtistInput('');
    }
  };

  const removeArtist = (nameToRemove) => {
    setSelectedArtists(selectedArtists.filter(a => a !== nameToRemove));
  };

  const handleAttendeeKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = attendeeInput.trim();
      if (val && !selectedAttendees.includes(val)) {
        setSelectedAttendees([...selectedAttendees, val]);
      }
      setAttendeeInput('');
    }
  };

  const removeAttendee = (nameToRemove) => {
    setSelectedAttendees(selectedAttendees.filter(a => a !== nameToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (selectedArtists.length === 0) {
        throw new Error("Please add at least one artist to the lineup.");
      }
      if (selectedAttendees.length === 0) {
        throw new Error("Please add at least one attendee.");
      }

      let finalVenueId = formData.venue_id;

      // Handle transparent venue creation
      if (isNewVenue) {
        if (!newVenueData.name.trim()) throw new Error("Please provide a name for the new venue.");
        const newVenueId = crypto.randomUUID();
        const { error: venueError } = await supabase.from('venues').insert([{ 
          id: newVenueId, 
          name: newVenueData.name.trim(),
          country: newVenueData.country || null,
          region: newVenueData.region || null,
          city: newVenueData.city || null,
          lat: newVenueData.lat ? parseFloat(newVenueData.lat) : null,
          long: newVenueData.long ? parseFloat(newVenueData.long) : null
        }]);
        if (venueError) throw venueError;
        finalVenueId = newVenueId;
      }

      if (!formData.name || !formData.date || !finalVenueId) {
        throw new Error("Please fill in required event fields: Name, Date, and Venue");
      }

      const newConcert = {
        id: crypto.randomUUID(),
        name: formData.name,
        tour_name: formData.tour_name,
        date: formData.date,
        venue_id: finalVenueId,
        festival: formData.festival
      };

      // 1. Insert Core Concert
      const { error: insertError } = await supabase.from('concerts').insert([newConcert]);
      if (insertError) throw insertError;

      // 2. Process all tagging relationships (Dynamically insert unknown artists)
      const bridgeInserts = [];
      for (const artistName of selectedArtists) {
        let artistId;
        // Attempt to find existing artist in active cache (case insensitive)
        const match = data.artists.find(a => a.name.toLowerCase() === artistName.toLowerCase());
        
        if (match) {
          artistId = match.id;
        } else {
          // Fire creation of brand new artist
          artistId = crypto.randomUUID();
          const { error: aErr } = await supabase.from('artists').insert([{ id: artistId, name: artistName }]);
          if (aErr) throw new Error("Failed to insert new artist " + artistName);
        }

        bridgeInserts.push({ concert_id: newConcert.id, artist_id: artistId });
      }

      // 3. Process all attendee tagging relationships
      const attendeeInserts = [];
      for (const attName of selectedAttendees) {
        let attId;
        const match = data.attendees.find(a => a.name.toLowerCase() === attName.toLowerCase());
        
        if (match) {
          attId = match.id;
        } else {
          attId = crypto.randomUUID();
          const { error: aErr } = await supabase.from('attendees').insert([{ id: attId, name: attName }]);
          if (aErr) throw new Error("Failed to insert new attendee " + attName);
        }

        attendeeInserts.push({ concert_id: newConcert.id, attendee_id: attId });
      }

      // 4. Complete binding link blocks
      const { error: bridgeError } = await supabase.from('concert_artist_bridge').insert(bridgeInserts);
      if (bridgeError) throw bridgeError;

      const { error: attBridgeError } = await supabase.from('concert_attendee_bridge').insert(attendeeInserts);
      if (attBridgeError) throw attBridgeError;

      await refreshData();
      navigate('/concerts');
    } catch (err) {
      setError(err.message || "Failed to save concert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.pageTitle}>Log New Concert</h1>
        <p style={styles.pageSubtitle}>Immortalize a live memory into the dashboard</p>
      </header>

      <main style={styles.main}>
        <form onSubmit={handleSubmit} style={styles.formContainer}>
          {error && <div style={styles.errorBanner}>{error}</div>}
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Event Title (Festival/Headliner) <span style={styles.required}>*</span></label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              style={styles.input} 
              placeholder="e.g. My Chemical Romance or Riot Fest 2024"
            />
          </div>

          {/* ARIST TAGGER COMPONENT */}
          <div style={{...styles.formGroup, padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
            <label style={{...styles.label, display: 'flex', justifyContent: 'space-between'}}>
              <span>Artist Lineup <span style={styles.required}>*</span></span>
              <span style={{ fontSize: '0.75rem', fontWeight: '400' }}>Hit Enter to add multiple acts</span>
            </label>
            <div style={tagStyles.tagContainer}>
              {selectedArtists.map(artist => (
                <div key={artist} style={tagStyles.tag}>
                  <span>{artist}</span>
                  <button type="button" onClick={() => removeArtist(artist)} style={tagStyles.tagRemove} title="Remove Act">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <input 
                list="artist-suggestions"
                type="text" 
                value={artistInput} 
                onChange={e => setArtistInput(e.target.value)} 
                onKeyDown={handleArtistKeyDown}
                style={tagStyles.tagInput}
                placeholder={selectedArtists.length === 0 ? "Type an artist name and press Enter..." : "Add another act & press Enter..."}
              />
              <datalist id="artist-suggestions">
                {ObjectSort(data.artists, 'name').map(a => (
                  <option key={a.id} value={a.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div style={{...styles.formGroup, padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
            <label style={{...styles.label, display: 'flex', justifyContent: 'space-between'}}>
              <span>Attendees <span style={styles.required}>*</span></span>
              <span style={{ fontSize: '0.75rem', fontWeight: '400' }}>Hit Enter to add friends</span>
            </label>
            <div style={{...tagStyles.tagContainer, borderColor: '#cbd5e1'}}>
              {selectedAttendees.map(att => (
                <div key={att} style={{...tagStyles.tag, backgroundColor: '#64748b'}}>
                  <span>{att}</span>
                  <button type="button" onClick={() => removeAttendee(att)} style={tagStyles.tagRemove} title="Remove Attendee">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <input 
                list="attendee-suggestions"
                type="text" 
                value={attendeeInput} 
                onChange={e => setAttendeeInput(e.target.value)} 
                onKeyDown={handleAttendeeKeyDown}
                style={tagStyles.tagInput}
                placeholder="Who went with you? (press Enter)"
              />
              <datalist id="attendee-suggestions">
                {ObjectSort(data.attendees, 'name').map(a => (
                  <option key={a.id} value={a.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Tour Name</label>
            <input 
              type="text" 
              name="tour_name" 
              value={formData.tour_name} 
              onChange={handleChange} 
              style={styles.input} 
              placeholder="e.g. The Black Parade Tour"
            />
          </div>

          <div style={styles.rowGroup}>
            <div style={{...styles.formGroup, flex: 1}}>
              <label style={styles.label}>Date <span style={styles.required}>*</span></label>
              <input 
                type="date" 
                name="date" 
                value={formData.date} 
                onChange={handleChange} 
                style={styles.input} 
              />
            </div>

            <div style={{...styles.formGroup, flex: 2}}>
              <label style={styles.label}>Venue <span style={styles.required}>*</span></label>
              <select 
                name="venue_id" 
                value={isNewVenue ? 'NEW' : formData.venue_id} 
                onChange={(e) => {
                  if (e.target.value === 'NEW') {
                    setIsNewVenue(true);
                    setFormData(prev => ({ ...prev, venue_id: '' }));
                    setNewVenueData({ name: '', country: userDefaultCountry, region: '', city: '', lat: '', long: '' });
                  } else {
                    setIsNewVenue(false);
                    handleChange(e);
                  }
                }} 
                style={styles.input}
              >
                <option value="">Select a venue...</option>
                <option value="NEW">+ Add New Venue...</option>
                {ObjectSort(data.venues, 'name').map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>

              {isNewVenue && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', padding: '1rem', backgroundColor: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>New Venue Details</span>
                  <input 
                    type="text" 
                    placeholder="Venue Name *" 
                    value={newVenueData.name}
                    onChange={(e) => setNewVenueData({...newVenueData, name: e.target.value})}
                    style={styles.input}
                    required
                  />
                  
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <select 
                      style={{...styles.input, flex: 1, minWidth: '80px', backgroundColor: '#fff'}}
                      value={newVenueData.country} onChange={e => setNewVenueData({...newVenueData, country: e.target.value})}
                    >
                      <option value="">Country...</option>
                      {COMMON_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {newVenueData.country && newVenueData.country.toUpperCase() === 'USA' ? (
                      <select 
                        style={{...styles.input, flex: 1, minWidth: '80px', backgroundColor: '#fff'}}
                        value={newVenueData.region} onChange={e => setNewVenueData({...newVenueData, region: e.target.value})}
                      >
                        <option value="">State...</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        placeholder="Region / State" 
                        value={newVenueData.region}
                        onChange={(e) => setNewVenueData({...newVenueData, region: e.target.value})}
                        style={{...styles.input, flex: 1, minWidth: '80px'}}
                      />
                    )}

                    <input 
                      type="text" 
                      placeholder="City" 
                      value={newVenueData.city}
                      onChange={(e) => setNewVenueData({...newVenueData, city: e.target.value})}
                      style={{...styles.input, flex: 1, minWidth: '80px'}}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="number" step="any"
                      placeholder="Latitude (Optional)" 
                      value={newVenueData.lat}
                      onChange={(e) => setNewVenueData({...newVenueData, lat: e.target.value})}
                      style={{...styles.input, flex: 1}}
                    />
                    <input 
                      type="number" step="any"
                      placeholder="Longitude (Optional)" 
                      value={newVenueData.long}
                      onChange={(e) => setNewVenueData({...newVenueData, long: e.target.value})}
                      style={{...styles.input, flex: 1}}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={styles.checkboxGroup}>
            <input 
              type="checkbox" 
              id="festival" 
              name="festival" 
              checked={formData.festival} 
              onChange={handleChange} 
              style={styles.checkbox}
            />
            <label htmlFor="festival" style={styles.checkboxLabel}>This event was a multi-day/multi-stage festival</label>
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Adding...' : 'Save Concert'}
          </button>
        </form>
      </main>
    </div>
  );
};

const tagStyles = {
  tagContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    backgroundColor: '#fff',
    minHeight: '45px',
    alignItems: 'center'
  },
  tag: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.3rem 0.6rem',
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    color: '#eff6ff',
    cursor: 'pointer',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  tagInput: {
    flex: 1,
    minWidth: '150px',
    border: 'none',
    outline: 'none',
    padding: '0.25rem',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    backgroundColor: 'transparent'
  }
};

const styles = {
  page: { padding: '2rem', maxWidth: '800px', width: '100%', margin: '0 auto' },
  header: { marginBottom: '2rem' },
  pageTitle: { fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' },
  pageSubtitle: { margin: 0, color: 'var(--text-muted)' },
  formContainer: { backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  errorBanner: { padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '6px', border: '1px solid #c62828', fontSize: '0.875rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  rowGroup: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap' },
  label: { fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' },
  required: { color: '#d32f2f' },
  input: { padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '1rem', fontFamily: 'inherit', backgroundColor: '#fafafa', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' },
  checkboxGroup: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' },
  checkbox: { width: '18px', height: '18px', accentColor: 'var(--accent-color)' },
  checkboxLabel: { fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' },
  submitBtn: { backgroundColor: 'var(--text-primary)', color: '#ffffff', border: 'none', padding: '0.875rem', borderRadius: '6px', fontSize: '1rem', fontWeight: '500', cursor: 'pointer', marginTop: '1rem', transition: 'opacity 0.2s' }
};
