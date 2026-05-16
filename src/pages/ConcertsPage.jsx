import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Edit2, Save, X, Trash2, FileText } from 'lucide-react';
import { SpotifyArtistAutocomplete } from '../components/SpotifyArtistAutocomplete';
import { fetchArtistGenres } from '../utils/musicBrainz';

const ObjectSort = (arr, key) => [...arr].sort((a, b) => (a[key] || '').localeCompare(b[key] || ''));

const FestivalTent = ({ size = 16, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 20h20" />
    <path d="M5 20V10a7 7 0 0 1 14 0v10" />
    <path d="M9 20v-4a3 3 0 0 1 6 0v4" />
  </svg>
);

export const ConcertsPage = ({ data, refreshData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editError, setEditError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [viewingNotes, setViewingNotes] = useState(null);

  // Custom Edit State for Concerts
  const [editData, setEditData] = useState({});
  const [attendeeInput, setAttendeeInput] = useState('');
  const attendeeInputRef = useRef(null);

  // Auto-focus effects bonded to array growth
  const prevArtistCount = useRef(editData.selectedArtists?.length || 0);
  useEffect(() => {
    prevArtistCount.current = editData.selectedArtists?.length || 0;
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
      return a ? { name: a.name, genres: [] } : null;
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
      notes: c.notes || '',
      selectedArtists: initialArtists,
      selectedAttendees: initialAttendees
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setEditError(null);
  };

  // Artist Tag Input Handlers for Edit Mode
  const handleSelectArtist = (artistObj) => {
    if (artistObj.name && !editData.selectedArtists.some(a => a.name === artistObj.name)) {
      setEditData({ ...editData, selectedArtists: [...editData.selectedArtists, artistObj] });
    }
  };

  const removeArtist = (nameToRemove) => {
    setEditData({ ...editData, selectedArtists: editData.selectedArtists.filter(a => a.name !== nameToRemove) });
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
        festival: editData.festival,
        notes: editData.notes || null
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
      const genreBridgeInserts = [];
      const newGenresToInsert = [];
      const newArtistsToInsert = [];

      for (const artistObj of editData.selectedArtists) {
        let artistId;
        const artistName = artistObj.name;
        let artistGenres = artistObj.genres || [];

        const match = data.artists.find(a => a.name.toLowerCase() === artistName.toLowerCase());

        if (match) {
          artistId = match.id;
        } else {
          artistId = crypto.randomUUID();

          const mbGenres = await fetchArtistGenres(artistName);
          if (mbGenres.length > 0) {
            artistGenres = mbGenres;
          }

          let primaryGenreId = null;
          if (artistGenres.length > 0) {
            const primaryGenreName = artistGenres[0];
            let genreMatch = data.genres.find(g => g.name.toLowerCase() === primaryGenreName.toLowerCase());
            if (!genreMatch) {
              const newGenreId = crypto.randomUUID();
              newGenresToInsert.push({ id: newGenreId, name: primaryGenreName });
              primaryGenreId = newGenreId;
              data.genres.push({ id: newGenreId, name: primaryGenreName });
            } else {
              primaryGenreId = genreMatch.id;
            }
          }

          newArtistsToInsert.push({
            id: artistId,
            name: artistName,
            primary_genre_id: primaryGenreId,
            spotify_listeners: artistObj.followers || null
          });

          for (let i = 1; i < artistGenres.length; i++) {
            const genreName = artistGenres[i];
            let genreMatch = data.genres.find(g => g.name.toLowerCase() === genreName.toLowerCase());
            let genreId;
            if (!genreMatch) {
              genreId = crypto.randomUUID();
              newGenresToInsert.push({ id: genreId, name: genreName });
              data.genres.push({ id: genreId, name: genreName });
            } else {
              genreId = genreMatch.id;
            }
            genreBridgeInserts.push({ artist_id: artistId, genre_id: genreId });
          }
        }

        bridgeInserts.push({ concert_id: editData.id, artist_id: artistId });
      }

      if (newGenresToInsert.length > 0) {
        const uniqueGenres = Array.from(new Set(newGenresToInsert.map(g => g.name)))
          .map(name => newGenresToInsert.find(g => g.name === name));
        const { error: gErr } = await supabase.from('genres').insert(uniqueGenres);
        if (gErr) throw new Error("Failed to insert genres");
      }

      if (newArtistsToInsert.length > 0) {
        const { error: aErr } = await supabase.from('artists').insert(newArtistsToInsert);
        if (aErr) throw new Error("Failed to insert new artists");
      }

      if (genreBridgeInserts.length > 0) {
        const { error: gbErr } = await supabase.from('artist_genre_bridge').insert(genreBridgeInserts);
        if (gbErr) throw new Error("Failed to insert artist genres");
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

  const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  let pastCount = 0;
  let todayCount = 0;
  let upcomingCount = 0;
  data.concerts.forEach(c => {
    if (c.date < todayStr) pastCount++;
    else if (c.date === todayStr) todayCount++;
    else upcomingCount++;
  });
  const allCount = data.concerts.length;

  const filteredConcerts = data.concerts.filter(c => {
    if (filterStatus === 'Past') return c.date < todayStr;
    if (filterStatus === 'Today') return c.date === todayStr;
    if (filterStatus === 'Upcoming') return c.date > todayStr;
    return true;
  });

  const getChipColors = (label) => {
    switch (label) {
      case 'Today': return { border: '#f59e0b', bg: '#fef3c7', text: '#b45309', badgeBg: '#fde68a', badgeText: '#92400e' };
      case 'Upcoming': return { border: '#22c55e', bg: '#dcfce3', text: '#166534', badgeBg: '#bbf7d0', badgeText: '#14532d' };
      case 'Past': return { border: '#94a3b8', bg: '#f1f5f9', text: '#475569', badgeBg: '#e2e8f0', badgeText: '#334155' };
      default: return { border: '#3b82f6', bg: '#eff6ff', text: '#1e40af', badgeBg: '#bfdbfe', badgeText: '#1e3a8a' };
    }
  };

  const FilterChip = ({ label, count, current, onClick }) => {
    const isCurrent = current === label;
    const colors = getChipColors(label);

    return (
      <button
        onClick={() => onClick(label)}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: '20px',
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.bg,
          color: colors.text,
          fontSize: '0.8rem',
          fontWeight: isCurrent ? '600' : '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          boxShadow: isCurrent ? `0 0 0 2px #ffffff, 0 0 0 4px ${colors.border}` : 'none',
          opacity: isCurrent ? 1 : 0.85
        }}>
        {label} <span style={{ backgroundColor: colors.badgeBg, padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.7rem', color: colors.badgeText }}>{count}</span>
      </button>
    );
  };

  return (
    <div style={sharedTableStyles.page}>
      <header style={sharedTableStyles.header}>
        <div>
          <h1 style={sharedTableStyles.pageTitle}>Concerts</h1>
          <p style={sharedTableStyles.pageSubtitle}>Your concert history and upcoming shows</p>
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

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <FilterChip label="All" count={allCount} current={filterStatus} onClick={setFilterStatus} />
        <FilterChip label="Past" count={pastCount} current={filterStatus} onClick={setFilterStatus} />
        <FilterChip label="Today" count={todayCount} current={filterStatus} onClick={setFilterStatus} />
        <FilterChip label="Upcoming" count={upcomingCount} current={filterStatus} onClick={setFilterStatus} />
      </div>

      <div style={sharedTableStyles.tableContainer}>
        <div style={{ overflowX: 'auto' }}>
          <table className="responsive-table" style={{ ...sharedTableStyles.table, minWidth: '950px' }}>
            <thead>
              <tr>
                <th style={sharedTableStyles.th}>Date</th>
                <th style={sharedTableStyles.th}>Event Title</th>
                <th style={sharedTableStyles.th}>Lineup</th>
                <th style={sharedTableStyles.th}>Attendees</th>
                <th style={sharedTableStyles.th}>Tour Name</th>
                <th style={sharedTableStyles.th}>Venue</th>
                <th style={{ ...sharedTableStyles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredConcerts.length === 0 ? (
                <tr><td colSpan="8" style={sharedTableStyles.emptyCell}>No concerts found in this category.</td></tr>
              ) : (
                [...filteredConcerts].sort((a, b) => new Date(b.date) - new Date(a.date)).map(c => {
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
                          <td data-label="Date" style={{ ...sharedTableStyles.td, padding: '0.5rem', width: '12%' }}>
                            <input type="date" style={{ ...sharedTableStyles.inlineInput, width: '100%', minWidth: '110px', padding: '0.4rem' }} value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })} />
                          </td>
                          <td data-label="Event Title" style={{ ...sharedTableStyles.td, padding: '0.5rem', width: '21%' }}>
                            <input style={{ ...sharedTableStyles.inlineInput, width: '100%', minWidth: '100px', padding: '0.4rem' }} placeholder="e.g. Riot Fest" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', marginTop: '0.4rem', cursor: 'pointer', color: '#64748b' }}>
                              <input type="checkbox" checked={editData.festival} onChange={e => setEditData({ ...editData, festival: e.target.checked })} style={{ width: '14px', height: '14px', accentColor: 'var(--accent-color)', cursor: 'pointer' }} />
                              Festival?
                            </label>
                          </td>
                          <td data-label="Lineup" style={{ ...sharedTableStyles.td, padding: '0.5rem', width: '25%' }}>
                            <div style={{ ...tagStyles.tagContainer, minHeight: '30px', padding: '0.2rem' }}>
                              {editData.selectedArtists.map(artist => (
                                <div key={artist.name} style={tagStyles.tag}>
                                  <span>{artist.name}</span>
                                  <button type="button" onClick={() => removeArtist(artist.name)} style={tagStyles.tagRemove} title="Remove Act"><X size={12} /></button>
                                </div>
                              ))}
                              <div style={{ position: 'relative', minWidth: '150px', flex: 1, zIndex: 10 }}>
                                <SpotifyArtistAutocomplete
                                  onSelectArtist={handleSelectArtist}
                                  style={{ ...tagStyles.tagInput, width: '100%' }}
                                  placeholder="Add act..."
                                />
                              </div>
                            </div>
                          </td>
                          <td data-label="Attendees" style={{ ...sharedTableStyles.td, padding: '0.5rem', width: '15%' }}>
                            <div style={{ ...tagStyles.tagContainer, borderColor: '#cbd5e1', minHeight: '30px', padding: '0.2rem' }}>
                              {editData.selectedAttendees.map(att => (
                                <div key={att} style={{ ...tagStyles.tag, backgroundColor: '#64748b' }}>
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
                                style={{ ...tagStyles.tagInput, minWidth: '160px' }}
                                placeholder="Add friend & press Enter..."
                              />
                              <datalist id="edit-attendee-suggestions">
                                {ObjectSort(data.attendees, 'name').map(a => <option key={a.id} value={a.name} />)}
                              </datalist>
                            </div>
                          </td>
                          <td data-label="Tour Name" style={{ ...sharedTableStyles.td, padding: '0.5rem', width: '10%' }}>
                            <input style={{ ...sharedTableStyles.inlineInput, width: '100%', minWidth: '70px', padding: '0.4rem' }} placeholder="Tour..." value={editData.tour_name} onChange={e => setEditData({ ...editData, tour_name: e.target.value })} />
                          </td>
                          <td data-label="Venue" style={{ ...sharedTableStyles.td, padding: '0.5rem', width: '15%' }}>
                            <select style={{ ...sharedTableStyles.inlineInput, width: '100%', minWidth: '90px', backgroundColor: '#fff', padding: '0.4rem' }} value={editData.venue_id} onChange={e => setEditData({ ...editData, venue_id: e.target.value })}>
                              <option value="">Select venue...</option>
                              {ObjectSort(data.venues, 'name').map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                          </td>
                          <td data-label="Actions" style={{ ...sharedTableStyles.td, padding: '0.5rem', width: '7%', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button onClick={saveEdit} disabled={loading} style={{ ...sharedTableStyles.actionBtn, color: '#2e7d32', marginRight: '4px' }} title="Save">
                              <Save size={18} />
                            </button>
                            <button onClick={cancelEdit} disabled={loading} style={{ ...sharedTableStyles.actionBtn, color: '#d32f2f' }} title="Cancel">
                              <X size={18} />
                            </button>
                          </td>
                        </tr>
                        <tr style={{ ...sharedTableStyles.tr, backgroundColor: '#f5f8ff', borderTop: 'none' }}>
                          <td colSpan="8" style={{ padding: '0 0.5rem 0.5rem 0.5rem', borderTop: 'none' }}>
                            <textarea
                              style={{ ...sharedTableStyles.inlineInput, width: '100%', minHeight: '60px', padding: '0.4rem', resize: 'vertical' }}
                              placeholder="Concert notes, setlist, etc..."
                              value={editData.notes || ''}
                              onChange={e => setEditData({ ...editData, notes: e.target.value })}
                            />
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

                  let statusColor = 'transparent';
                  if (c.date === todayStr) {
                    statusColor = '#f59e0b'; // Today (amber)
                  } else if (c.date > todayStr) {
                    statusColor = '#22c55e'; // Future (green)
                  } else {
                    statusColor = '#94a3b8'; // Past (gray)
                  }

                  const rowBgColor = isDeleting ? '#fee2e2' : '#ffffff';

                  return (
                    <tr key={c.id} style={{ ...sharedTableStyles.tr, backgroundColor: rowBgColor }}>
                      <td data-label="Date" style={{ ...sharedTableStyles.td, borderLeft: `4px solid ${statusColor}` }}>{c.date}</td>
                      <td data-label="Event Title" style={{ ...sharedTableStyles.td, fontWeight: '500' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {c.name}
                          {c.festival && (
                            <span title="Festival" style={{ display: 'inline-flex', alignItems: 'center' }}>
                              <FestivalTent size={16} color="#d97706" />
                            </span>
                          )}
                          {c.notes && (
                            <span onClick={() => setViewingNotes(c)} title="View Notes" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', marginLeft: '0.2rem' }}>
                              <FileText size={16} color="#3b82f6" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Lineup" style={sharedTableStyles.td}>
                        {lineup ? <span style={{ color: '#3b82f6', fontWeight: '500' }}>{lineup}</span> : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No artists</span>}
                      </td>
                      <td data-label="Attendees" style={sharedTableStyles.td}>
                        {attendeeList ? <span style={{ color: '#64748b', fontWeight: '500' }}>{attendeeList}</span> : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No attendees</span>}
                      </td>
                      <td data-label="Tour Name" style={sharedTableStyles.td}>{c.tour_name || '-'}</td>
                      <td data-label="Venue" style={sharedTableStyles.td}>{venue ? venue.name : 'Unknown'}</td>
                      <td data-label="Actions" style={{ ...sharedTableStyles.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isDeleting ? (
                          <>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#c62828', marginRight: '8px' }}>Confirm?</span>
                            <button onClick={() => deleteConcert(c.id)} disabled={loading} style={{ ...sharedTableStyles.actionBtn, color: '#2e7d32', marginRight: '4px', border: '1px solid #2e7d32' }} title="Yes, Delete">
                              ✓
                            </button>
                            <button onClick={() => setDeletingId(null)} disabled={loading} style={{ ...sharedTableStyles.actionBtn, color: '#d32f2f', border: '1px solid #d32f2f' }} title="Cancel">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(c)} style={{ ...sharedTableStyles.actionBtn, color: 'var(--text-secondary)' }} title="Edit Concert">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => setDeletingId(c.id)} disabled={loading} style={{ ...sharedTableStyles.actionBtn, color: '#d32f2f', marginLeft: '4px' }} title="Delete Concert">
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

      {viewingNotes && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setViewingNotes(null)}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingNotes(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={24} />
            </button>
            <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.5rem', color: 'var(--text-primary)' }}>{viewingNotes.name} Notes</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{new Date(viewingNotes.date + 'T12:00:00Z').toLocaleDateString()}</p>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#334155', fontSize: '0.95rem' }}>
              {viewingNotes.notes}
            </div>
          </div>
        </div>
      )}
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
