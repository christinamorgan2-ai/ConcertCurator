import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Edit2, Save, X, Trash2 } from 'lucide-react';

const ObjectSort = (arr, key) => [...arr].sort((a,b) => (a[key] || '').localeCompare(b[key] || ''));

export const ConcertsPage = ({ data, refreshData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editError, setEditError] = useState(null);
  
  // Custom Edit State for Concerts
  const [editData, setEditData] = useState({});
  const [artistInput, setArtistInput] = useState('');
  const artistInputRef = useRef(null);
  const [attendeeInput, setAttendeeInput] = useState('');
  const attendeeInputRef = useRef(null);

  // Auto-focus effects bonded to array growth
  const prevArtistCount = useRef(editData.selectedArtists?.length || 0);
  useEffect(() => {
    const current = editData.selectedArtists?.length || 0;
    if (current > prevArtistCount.current) {
      artistInputRef.current?.focus();
    }
    prevArtistCount.current = current;
  }, [editData.selectedArtists]);

  const prevAttendeeCount = useRef(editData.selectedAttendees?.length || 0);
  useEffect(() => {
    const current = editData.selectedAttendees?.length || 0;
    if (current > prevAttendeeCount.current) {
      attendeeInputRef.current?.focus();
    }
    prevAttendeeCount.current = current;
  }, [editData.selectedAttendees]);

  // Deletion State
  const [deletingId, setDeletingId] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditError(null);
    setGlobalError(null);
    setDeletingId(null);
    
    // Reverse map the artist bridge
    const concertLinks = data.concertArtistBridge.filter(b => b.ConcertID === c.id);
    const initialArtists = concertLinks.map(link => {
      const a = data.artists.find(art => art.id === link.ArtistID);
      return a ? a.name : null;
    }).filter(Boolean);

    // Reverse map the attendee bridge
    const attendeeLinks = data.concertAttendeeBridge.filter(b => b.ConcertID === c.id);
    const initialAttendees = attendeeLinks.map(link => {
      const a = data.attendees.find(att => att.id === link.AttendeeID);
      return a ? a.name : null;
    }).filter(Boolean);

    setEditData({ 
      id: c.id, 
      name: c.name || '',
      tour_name: c.tour_name || '',
      date: c.date || '',
      venue_id: c.venue_id || '',
      festival: c.festival || false,
      selectedArtists: initialArtists,
      selectedAttendees: initialAttendees
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setEditError(null);
    setArtistInput('');
  };

  // Artist Tag Input Handlers for Edit Mode
  const handleArtistKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = artistInput.trim();
      if (val && !editData.selectedArtists.includes(val)) {
        setEditData({ ...editData, selectedArtists: [...editData.selectedArtists, val] });
      }
      setArtistInput('');
    }
  };

  const removeArtist = (nameToRemove) => {
    setEditData({ ...editData, selectedArtists: editData.selectedArtists.filter(a => a !== nameToRemove) });
  };

  const handleAttendeeKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = attendeeInput.trim();
      if (val && !editData.selectedAttendees.includes(val)) {
        setEditData({ ...editData, selectedAttendees: [...editData.selectedAttendees, val] });
      }
      setAttendeeInput('');
    }
  };

  const removeAttendee = (nameToRemove) => {
    setEditData({ ...editData, selectedAttendees: editData.selectedAttendees.filter(a => a !== nameToRemove) });
  };

  const deleteConcert = async (concertId) => {
    setLoading(true);
    setGlobalError(null);
    try {
      // 1. Wipe bridge records first to prevent foreign key cascade errors
      await supabase.from('concert_artist_bridge').delete().eq('concert_id', concertId);
      await supabase.from('concert_attendee_bridge').delete().eq('concert_id', concertId);
      
      // 2. Delete the actual concert
      const { error } = await supabase.from('concerts').delete().eq('id', concertId);
      if (error) throw error;
      
      setDeletingId(null);
      await refreshData();
    } catch (err) {
      setGlobalError("Failed to delete concert: " + err.message + ". Check your Row Level Security delete permissions!");
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setEditError(null);

    if (!editData.name || !editData.date || !editData.venue_id) {
      setEditError("Name, Date, and Venue are required fields.");
      return;
    }
    if (editData.selectedArtists.length === 0) {
      setEditError("Please add at least one artist to the lineup.");
      return;
    }
    if (editData.selectedAttendees.length === 0) {
      setEditError("Please add at least one attendee.");
      return;
    }

    setLoading(true);
    try {
      // 1. Update Core Concert
      const { data: updatedRows, error } = await supabase.from('concerts').update({
        name: editData.name,
        tour_name: editData.tour_name || null,
        date: editData.date,
        venue_id: editData.venue_id,
        festival: editData.festival
      }).eq('id', editData.id).select();
      
      if (error) throw error;
      if (!updatedRows || updatedRows.length === 0) {
         throw new Error("Database update ignored. This is usually caused by Row Level Security (RLS) policies blocking the UPDATE operation.");
      }

      // 2. Wipe the existing artist bridge slate clean for this concert
      const { error: delErr } = await supabase.from('concert_artist_bridge').delete().eq('concert_id', editData.id);
      if (delErr) throw delErr;

      // 3. Rebuild the artist bridge completely
      const bridgeInserts = [];
      for (const artistName of editData.selectedArtists) {
        let artistId;
        const match = data.artists.find(a => a.name.toLowerCase() === artistName.toLowerCase());
        
        if (match) {
          artistId = match.id;
        } else {
          artistId = crypto.randomUUID();
          const { error: aErr } = await supabase.from('artists').insert([{ id: artistId, name: artistName }]);
          if (aErr) throw new Error("Failed to insert new artist " + artistName);
        }

        bridgeInserts.push({ concert_id: editData.id, artist_id: artistId });
      }

      const { error: bridgeError } = await supabase.from('concert_artist_bridge').insert(bridgeInserts);
      if (bridgeError) throw bridgeError;

      // 4. Wipe attendee bridge and rebuild
      const { error: attDelErr } = await supabase.from('concert_attendee_bridge').delete().eq('concert_id', editData.id);
      if (attDelErr) throw attDelErr;

      const attendeeInserts = [];
      for (const attName of editData.selectedAttendees) {
        let attId;
        const match = data.attendees.find(a => a.name.toLowerCase() === attName.toLowerCase());
        
        if (match) {
          attId = match.id;
        } else {
          attId = crypto.randomUUID();
          const { error: aErr } = await supabase.from('attendees').insert([{ id: attId, name: attName }]);
          if (aErr) throw new Error("Failed to insert new attendee " + attName);
        }

        attendeeInserts.push({ concert_id: editData.id, attendee_id: attId });
      }

      const { error: attBridgeError } = await supabase.from('concert_attendee_bridge').insert(attendeeInserts);
      if (attBridgeError) throw attBridgeError;

      setEditingId(null);
      await refreshData();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={sharedTableStyles.page}>
      <header style={sharedTableStyles.header}>
        <div>
          <h1 style={sharedTableStyles.pageTitle}>Concerts</h1>
          <p style={sharedTableStyles.pageSubtitle}>All your attended events</p>
        </div>
        <button onClick={() => navigate('/add')} style={sharedTableStyles.addBtn}>
          + Add Concert
        </button>
      </header>

      {globalError && (
        <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '6px', border: '1px solid #c62828', fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: '500' }}>
          ⚠️ {globalError}
        </div>
      )}

      <div style={sharedTableStyles.tableContainer}>
        <div style={{ overflowX: 'auto' }}>
          <table className="responsive-table" style={{...sharedTableStyles.table, minWidth: '950px'}}>
            <thead>
              <tr>
                <th style={sharedTableStyles.th}>Date</th>
                <th style={sharedTableStyles.th}>Event Title</th>
                <th style={sharedTableStyles.th}>Lineup</th>
                <th style={sharedTableStyles.th}>Attendees</th>
                <th style={sharedTableStyles.th}>Tour Name</th>
                <th style={sharedTableStyles.th}>Venue</th>
                <th style={sharedTableStyles.th}>Festival</th>
                <th style={{...sharedTableStyles.th, textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.concerts.length === 0 ? (
                <tr><td colSpan="8" style={sharedTableStyles.emptyCell}>No concerts found. Start adding!</td></tr>
              ) : (
                [...data.concerts].sort((a,b) => new Date(b.date) - new Date(a.date)).map(c => {
                  const isEditing = editingId === c.id;
                  const isDeleting = deletingId === c.id;

                  if (isEditing) {
                    return (
                      <React.Fragment key={c.id}>
                        {editError && (
                          <tr>
                            <td colSpan="8" style={{ padding: '0.75rem', backgroundColor: '#ffebee', color: '#c62828', fontSize: '0.875rem', textAlign: 'center', border: '1px solid #c62828' }}>
                              ⚠️ {editError}
                            </td>
                          </tr>
                        )}
                        <tr style={{ ...sharedTableStyles.tr, backgroundColor: '#f5f8ff' }}>
                          <td data-label="Date" style={{...sharedTableStyles.td, padding: '0.5rem', width: '12%'}}>
                            <input type="date" style={{...sharedTableStyles.inlineInput, width: '100%', minWidth: '110px', padding: '0.4rem'}} value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} />
                          </td>
                          <td data-label="Event Title" style={{...sharedTableStyles.td, padding: '0.5rem', width: '15%'}}>
                            <input style={{...sharedTableStyles.inlineInput, width: '100%', minWidth: '100px', padding: '0.4rem'}} placeholder="e.g. Riot Fest" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                          </td>
                          <td data-label="Lineup" style={{...sharedTableStyles.td, padding: '0.5rem', width: '25%'}}>
                            <div style={{...tagStyles.tagContainer, minHeight: '30px', padding: '0.2rem'}}>
                              {editData.selectedArtists.map(artist => (
                                <div key={artist} style={tagStyles.tag}>
                                  <span>{artist}</span>
                                  <button type="button" onClick={() => removeArtist(artist)} style={tagStyles.tagRemove} title="Remove Act"><X size={12} /></button>
                                </div>
                              ))}
                              <input 
                                ref={artistInputRef}
                                list="edit-artist-suggestions"
                                type="text" 
                                value={artistInput} 
                                onChange={e => setArtistInput(e.target.value)} 
                                onKeyDown={handleArtistKeyDown}
                                style={{...tagStyles.tagInput, minWidth: '150px'}}
                                placeholder="Add act & press Enter..."
                              />
                              <datalist id="edit-artist-suggestions">
                                {ObjectSort(data.artists, 'name').map(a => <option key={a.id} value={a.name} />)}
                              </datalist>
                            </div>
                          </td>
                          <td data-label="Attendees" style={{...sharedTableStyles.td, padding: '0.5rem', width: '15%'}}>
                            <div style={{...tagStyles.tagContainer, borderColor: '#cbd5e1', minHeight: '30px', padding: '0.2rem'}}>
                              {editData.selectedAttendees.map(att => (
                                <div key={att} style={{...tagStyles.tag, backgroundColor: '#64748b'}}>
                                  <span>{att}</span>
                                  <button type="button" onClick={() => removeAttendee(att)} style={tagStyles.tagRemove} title="Remove Attendee"><X size={12} /></button>
                                </div>
                              ))}
                              <input 
                                ref={attendeeInputRef}
                                list="edit-attendee-suggestions"
                                type="text" 
                                value={attendeeInput} 
                                onChange={e => setAttendeeInput(e.target.value)} 
                                onKeyDown={handleAttendeeKeyDown}
                                style={{...tagStyles.tagInput, minWidth: '160px'}}
                                placeholder="Add friend & press Enter..."
                              />
                              <datalist id="edit-attendee-suggestions">
                                {ObjectSort(data.attendees, 'name').map(a => <option key={a.id} value={a.name} />)}
                              </datalist>
                            </div>
                          </td>
                          <td data-label="Tour Name" style={{...sharedTableStyles.td, padding: '0.5rem', width: '10%'}}>
                            <input style={{...sharedTableStyles.inlineInput, width: '100%', minWidth: '70px', padding: '0.4rem'}} placeholder="Tour..." value={editData.tour_name} onChange={e => setEditData({...editData, tour_name: e.target.value})} />
                          </td>
                          <td data-label="Venue" style={{...sharedTableStyles.td, padding: '0.5rem', width: '15%'}}>
                            <select style={{...sharedTableStyles.inlineInput, width: '100%', minWidth: '90px', backgroundColor: '#fff', padding: '0.4rem'}} value={editData.venue_id} onChange={e => setEditData({...editData, venue_id: e.target.value})}>
                              <option value="">Select venue...</option>
                              {ObjectSort(data.venues, 'name').map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                          </td>
                          <td data-label="Festival" style={{...sharedTableStyles.td, padding: '0.5rem', width: '6%', textAlign: 'center'}}>
                            <input type="checkbox" checked={editData.festival} onChange={e => setEditData({...editData, festival: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)', cursor: 'pointer' }} />
                          </td>
                          <td data-label="Actions" style={{...sharedTableStyles.td, padding: '0.5rem', width: '7%', textAlign: 'right', whiteSpace: 'nowrap'}}>
                            <button onClick={saveEdit} disabled={loading} style={{...sharedTableStyles.actionBtn, color: '#2e7d32', marginRight: '4px'}} title="Save">
                              <Save size={18} />
                            </button>
                            <button onClick={cancelEdit} disabled={loading} style={{...sharedTableStyles.actionBtn, color: '#d32f2f'}} title="Cancel">
                              <X size={18} />
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    )
                  }

                  // Read Only Standard Render
                  const venue = data.venues.find(v => v.id === c.venue_id);
                  const concertLinks = data.concertArtistBridge.filter(b => b.ConcertID === c.id);
                  const lineup = concertLinks.map(link => {
                     const a = data.artists.find(art => art.id === link.ArtistID);
                     return a ? a.name : 'Unknown';
                  }).join(', ');
                  
                  const attendeeLinks = data.concertAttendeeBridge.filter(b => b.ConcertID === c.id);
                  const attendeeList = attendeeLinks.map(link => {
                     const a = data.attendees.find(att => att.id === link.AttendeeID);
                     return a ? a.name : 'Unknown';
                  }).join(', ');

                  return (
                    <tr key={c.id} style={{...sharedTableStyles.tr, backgroundColor: isDeleting ? '#fee2e2' : undefined}}>
                      <td data-label="Date" style={sharedTableStyles.td}>{c.date}</td>
                      <td data-label="Event Title" style={{...sharedTableStyles.td, fontWeight: '500'}}>{c.name}</td>
                      <td data-label="Lineup" style={sharedTableStyles.td}>
                        {lineup ? <span style={{ color: '#3b82f6', fontWeight: '500'}}>{lineup}</span> : <span style={{color: '#94a3b8', fontStyle: 'italic'}}>No artists</span>}
                      </td>
                      <td data-label="Attendees" style={sharedTableStyles.td}>
                        {attendeeList ? <span style={{ color: '#64748b', fontWeight: '500'}}>{attendeeList}</span> : <span style={{color: '#94a3b8', fontStyle: 'italic'}}>No attendees</span>}
                      </td>
                      <td data-label="Tour Name" style={sharedTableStyles.td}>{c.tour_name || '-'}</td>
                      <td data-label="Venue" style={sharedTableStyles.td}>{venue ? venue.name : 'Unknown'}</td>
                      <td data-label="Festival" style={sharedTableStyles.td}>{c.festival ? 'Yes' : 'No'}</td>
                      <td data-label="Actions" style={{...sharedTableStyles.td, textAlign: 'right', whiteSpace: 'nowrap'}}>
                        {isDeleting ? (
                          <>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#c62828', marginRight: '8px'}}>Confirm?</span>
                            <button onClick={() => deleteConcert(c.id)} disabled={loading} style={{...sharedTableStyles.actionBtn, color: '#2e7d32', marginRight: '4px', border: '1px solid #2e7d32'}} title="Yes, Delete">
                              ✓
                            </button>
                            <button onClick={() => setDeletingId(null)} disabled={loading} style={{...sharedTableStyles.actionBtn, color: '#d32f2f', border: '1px solid #d32f2f'}} title="Cancel">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(c)} style={{...sharedTableStyles.actionBtn, color: 'var(--text-secondary)'}} title="Edit Concert">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => setDeletingId(c.id)} disabled={loading} style={{...sharedTableStyles.actionBtn, color: '#d32f2f', marginLeft: '4px'}} title="Delete Concert">
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const sharedTableStyles = {
  page: { padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' },
  pageTitle: { fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' },
  pageSubtitle: { margin: 0, color: 'var(--text-muted)' },
  addBtn: {
    backgroundColor: 'var(--text-primary)', color: '#ffffff',
    border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px',
    fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', transition: 'opacity 0.2s'
  },
  tableContainer: {
    backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--border-color)',
    overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#fafafa', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.875rem' },
  td: { padding: '1rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.875rem' },
  tr: { transition: 'background-color 0.1s', ':hover': { backgroundColor: '#fafafa' } },
  emptyCell: { padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' },
  inlineForm: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' },
  inlineInput: { padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.875rem', outline: 'none' },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', transition: 'background-color 0.2s' }
};

const tagStyles = {
  tagContainer: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: '#fff', minHeight: '35px', alignItems: 'center', width: '100%' },
  tag: { display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.2rem 0.4rem', backgroundColor: '#3b82f6', color: '#fff', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' },
  tagRemove: { background: 'none', border: 'none', color: '#eff6ff', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  tagInput: { flex: 1, minWidth: '90px', border: 'none', outline: 'none', fontSize: '0.875rem', backgroundColor: 'transparent' }
};
