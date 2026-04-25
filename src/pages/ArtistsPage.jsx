import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { sharedTableStyles as styles } from './ConcertsPage';
import { Edit2, Save, X, Trash2 } from 'lucide-react';

const formatNum = (num) => {
  if (!num) return '-';
  return parseInt(num).toLocaleString('en-US');
};

const ObjectSort = (arr, key) => [...arr].sort((a, b) => (a[key] || '').localeCompare(b[key] || ''));

export const ArtistsPage = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '' });
  const [error, setError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [editError, setEditError] = useState(null);
  const [genreInput, setGenreInput] = useState('');
  const genreInputRef = useRef(null);
  const quickArtistInputRef = useRef(null);
  const [deletingId, setDeletingId] = useState(null);

  // Focus management triggers
  const prevArtistTotalCount = useRef(data.artists?.length || 0);
  useEffect(() => {
    const current = data.artists?.length || 0;
    if (current > prevArtistTotalCount.current) {
      setTimeout(() => {
        quickArtistInputRef.current?.focus();
      }, 50);
    }
    prevArtistTotalCount.current = current;
  }, [data.artists]);

  const prevGenreCount = useRef(editData.selectedGenres?.length || 0);
  useEffect(() => {
    const current = editData.selectedGenres?.length || 0;
    if (current > prevGenreCount.current) {
      genreInputRef.current?.focus();
    }
    prevGenreCount.current = current;
  }, [editData.selectedGenres]);

  const userSettings = data.userSettings || {};
  const TIERS = ["Mega", "Large", "Mid", "Cult"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    setError(null);

    // Strict Duplicate Check
    const cleanName = formData.name.trim();
    const isDuplicate = data.artists.some(a => a.name.toLowerCase() === cleanName.toLowerCase());

    if (isDuplicate) {
      setError(`An artist named "${cleanName}" is already in your database!`);
      return;
    }

    setLoading(true);
    try {
      const { error: insertErr } = await supabase.from('artists').insert([{ id: crypto.randomUUID(), name: cleanName }]);
      if (insertErr) throw insertErr;

      setFormData({ name: '' });
      await refreshData();
    } catch (err) {
      setError("Error adding artist: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (artist) => {
    setEditingId(artist.id);
    setEditError(null);

    // Filter bridge records to find all genres linked to this artist
    const genreLinks = data.artistGenreBridge.filter(b => b.ArtistID === artist.id);
    const initialTags = genreLinks.map(link => {
      const g = data.genres.find(gen => gen.id === link.GenreID);
      return g ? g.name : null;
    }).filter(Boolean);

    setEditData({
      id: artist.id,
      name: artist.name || '',
      primary_genre_id: artist.primary_genre_id || '',
      is_cover_band: artist.is_cover_band || false,
      first_album_year: artist.first_album_year || '',
      tier: artist.tier || '',
      artist_type: artist.artist_type || '',
      ecosystem: artist.ecosystem || '',
      spotify_listeners: artist.spotify_listeners || '',
      selectedGenres: initialTags
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setEditError(null);
    setGenreInput('');
  };

  // Genre Tag Input Handlers
  const handleGenreKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = genreInput.trim();
      if (val && !editData.selectedGenres.includes(val)) {
        setEditData({ ...editData, selectedGenres: [...editData.selectedGenres, val] });
      }
      setGenreInput('');
    }
  };

  const removeGenre = (nameToRemove) => {
    setEditData({ ...editData, selectedGenres: editData.selectedGenres.filter(g => g !== nameToRemove) });
  };

  const saveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setEditError(null);

    const cleanName = (editData.name || '').trim();
    if (!cleanName) {
      setEditError("Artist name is required.");
      return;
    }

    const nameCollision = data.artists.find(a => a.name.toLowerCase() === cleanName.toLowerCase() && a.id !== editData.id);
    if (nameCollision) {
      setEditError(`Cannot rename: an artist named "${cleanName}" already exists.`);
      return;
    }

    setLoading(true);
    try {
      // 1. Update Core Metadata
      let albumYr = parseInt(editData.first_album_year);
      let spotList = parseInt(editData.spotify_listeners);

      const payload = {
        name: cleanName,
        primary_genre_id: editData.primary_genre_id || null,
        is_cover_band: editData.is_cover_band,
        first_album_year: isNaN(albumYr) ? null : albumYr,
        tier: editData.tier || null,
        artist_type: editData.artist_type || null,
        ecosystem: editData.ecosystem || null,
        spotify_listeners: isNaN(spotList) ? null : spotList
      };

      const { data: updatedRows, error: upErr } = await supabase.from('artists')
        .update(payload)
        .eq('id', editData.id)
        .select();

      if (upErr) throw upErr;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error("Update blocked by SQL permissions.");
      }

      // 2. Wipe Bridge
      const { error: delErr } = await supabase.from('artist_genre_bridge').delete().eq('artist_id', editData.id);
      if (delErr) throw delErr;

      // 3. Rebuild Tags
      const bridgeInserts = [];
      for (const genreName of editData.selectedGenres) {
        let genreId;
        const match = data.genres.find(g => g.name.toLowerCase() === genreName.toLowerCase());

        if (match) {
          genreId = match.id;
        } else {
          genreId = crypto.randomUUID();
          const { error: gErr } = await supabase.from('genres').insert([{ id: genreId, name: genreName }]);
          if (gErr) throw new Error("Failed to insert new genre " + genreName);
        }

        bridgeInserts.push({ artist_id: editData.id, genre_id: genreId });
      }

      if (bridgeInserts.length > 0) {
        const { error: bridgeError } = await supabase.from('artist_genre_bridge').insert(bridgeInserts);
        if (bridgeError) throw bridgeError;
      }

      setEditingId(null);
      await refreshData();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteArtist = async (artistId) => {
    setLoading(true);
    setError(null);
    try {
      await supabase.from('concert_artist_bridge').delete().eq('artist_id', artistId);
      await supabase.from('artist_genre_bridge').delete().eq('artist_id', artistId);

      const { data: deletedRows, error: delErr } = await supabase.from('artists').delete().eq('id', artistId).select();
      if (delErr) throw delErr;
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error("Unable to delete. You likely don't have Delete permissions on the Artists table.");
      }

      await refreshData();
    } catch (err) {
      console.error("Delete Error:", err);
      setError("Error deleting artist: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Artists</h1>
          <p style={styles.pageSubtitle}>Deep musical mapping and categorization</p>
        </div>
      </header>

      {error && <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '6px', border: '1px solid #c62828', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.inlineForm}>
        <input
          ref={quickArtistInputRef}
          style={{ ...styles.inlineInput, flex: 1, maxWidth: '400px' }} placeholder="Add quick artist..." required
          value={formData.name} onChange={e => setFormData({ name: e.target.value })}
          autoFocus={true}
        />
        <button type="submit" disabled={loading} style={styles.addBtn}>
          {loading ? 'Adding...' : 'Add Artist'}
        </button>
      </form>

      <div style={styles.tableContainer}>
        <div style={{ overflowX: 'auto' }}>
          <table className="responsive-table" style={{ ...styles.table, minWidth: '1100px' }}>
            <thead>
              <tr>
                <th style={styles.th}>Artist</th>
                <th style={styles.th}>Primary Genre</th>
                <th style={styles.th}>All Genres</th>
                <th style={styles.th}>Demographics</th>
                <th style={styles.th}>Listeners</th>
                <th style={styles.th}>Concerts Logged</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.artists.length === 0 ? (
                <tr><td colSpan="7" style={styles.emptyCell}>No artists found.</td></tr>
              ) : (
                [...data.artists].sort((a, b) => a.name.localeCompare(b.name)).map(artist => {
                  const isEditing = editingId === artist.id;
                  const isDeleting = deletingId === artist.id;

                  if (isEditing) {
                    return (
                      <React.Fragment key={artist.id}>
                        {editError && (
                          <tr>
                            <td colSpan="7" style={{ padding: '0.75rem', backgroundColor: '#ffebee', color: '#c62828', fontSize: '0.875rem', textAlign: 'center', border: '1px solid #c62828' }}>
                              ⚠️ {editError}
                            </td>
                          </tr>
                        )}
                        <tr style={{ ...styles.tr, backgroundColor: '#f5f8ff' }}>
                          <td data-label="Artist" style={{ ...styles.td, padding: '0.75rem', width: '20%' }}>
                            <input
                              style={{ ...styles.inlineInput, width: '100%', minWidth: '120px', padding: '0.4rem', marginBottom: '0.4rem' }}
                              placeholder="Artist Name"
                              value={editData.name}
                              onChange={e => setEditData({ ...editData, name: e.target.value })}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                              <input type="checkbox" checked={editData.is_cover_band} onChange={e => setEditData({ ...editData, is_cover_band: e.target.checked })} style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
                              <span>Cover Band?</span>
                            </div>
                            <input
                              style={{ ...styles.inlineInput, width: '100%', minWidth: '80px', padding: '0.4rem', marginTop: '0.4rem' }}
                              placeholder="First Album Yr" type="number"
                              value={editData.first_album_year}
                              onChange={e => setEditData({ ...editData, first_album_year: e.target.value })}
                            />
                          </td>
                          <td data-label="Primary Genre" style={{ ...styles.td, padding: '0.75rem', width: '15%' }}>
                            <select
                              style={{ ...styles.inlineInput, width: '100%', backgroundColor: '#fff', padding: '0.4rem' }}
                              value={editData.primary_genre_id}
                              onChange={e => {
                                const newId = e.target.value;
                                const matchedGenre = data.genres.find(g => g.id === newId);
                                setEditData(prev => {
                                  const tags = [...prev.selectedGenres];
                                  if (matchedGenre && !tags.includes(matchedGenre.name)) {
                                    tags.push(matchedGenre.name);
                                  }
                                  return { ...prev, primary_genre_id: newId, selectedGenres: tags };
                                });
                              }}
                            >
                              <option value="">None</option>
                              {ObjectSort(data.genres, 'name').map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                          </td>
                          <td data-label="All Genres" style={{ ...styles.td, padding: '0.75rem', width: '20%' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', padding: '0.3rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: '#fff', minHeight: '35px' }}>
                              {editData.selectedGenres.map(g => (
                                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.2rem 0.4rem', backgroundColor: '#8b5cf6', color: '#fff', borderRadius: '4px', fontSize: '0.7rem' }}>
                                  <span>{g}</span>
                                  <button type="button" onClick={() => removeGenre(g)} style={{ background: 'none', border: 'none', color: '#ddd6fe', cursor: 'pointer', padding: '0', display: 'flex' }}><X size={10} /></button>
                                </div>
                              ))}
                              <input
                                ref={genreInputRef}
                                list="edit-genre-suggestions"
                                type="text"
                                value={genreInput}
                                onChange={e => setGenreInput(e.target.value)}
                                onKeyDown={handleGenreKeyDown}
                                style={{ flex: 1, minWidth: '160px', border: 'none', outline: 'none', fontSize: '0.8rem', backgroundColor: 'transparent' }}
                                placeholder="Add genre & press Enter..."
                              />
                              <button type="button" onClick={(e) => handleGenreKeyDown({ key: 'Enter', preventDefault: () => e.preventDefault() })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: 'var(--text-secondary)' }}>+</button>
                              <datalist id="edit-genre-suggestions">
                                {ObjectSort(data.genres, 'name').map(g => <option key={g.id} value={g.name} />)}
                              </datalist>
                            </div>
                          </td>
                          <td data-label="Demographics" style={{ ...styles.td, padding: '0.75rem', width: '15%' }}>
                            <select style={{ ...styles.inlineInput, width: '100%', padding: '0.3rem', marginBottom: '0.3rem' }} value={editData.tier} onChange={e => setEditData({ ...editData, tier: e.target.value })}>
                              <option value="">Select Tier</option>
                              {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <select style={{ ...styles.inlineInput, width: '100%', padding: '0.3rem', marginBottom: '0.3rem' }} value={editData.artist_type} onChange={e => setEditData({ ...editData, artist_type: e.target.value })}>
                              <option value="">Select Type</option>
                              {(userSettings.artist_types || []).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <select style={{ ...styles.inlineInput, width: '100%', padding: '0.3rem' }} value={editData.ecosystem} onChange={e => setEditData({ ...editData, ecosystem: e.target.value })}>
                              <option value="">Select Ecosystem</option>
                              {(userSettings.ecosystems || []).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          <td data-label="Listeners" style={{ ...styles.td, padding: '0.75rem', width: '15%' }}>
                            <input
                              style={{ ...styles.inlineInput, width: '100%', minWidth: '90px', padding: '0.4rem' }}
                              placeholder="Monthly Listeners" type="number"
                              value={editData.spotify_listeners}
                              onChange={e => setEditData({ ...editData, spotify_listeners: e.target.value })}
                            />
                          </td>
                          <td data-label="Concerts Logged" style={{ ...styles.td, width: '5%' }}>
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>Readonly</span>
                          </td>
                          <td data-label="Actions" style={{ ...styles.td, padding: '0.75rem', width: '10%', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button onClick={saveEdit} disabled={loading} style={{ ...styles.actionBtn, color: '#2e7d32', marginRight: '4px' }} title="Save">
                              <Save size={18} />
                            </button>
                            <button onClick={cancelEdit} disabled={loading} style={{ ...styles.actionBtn, color: '#d32f2f' }} title="Cancel">
                              <X size={18} />
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    )
                  }

                  // Read Only View
                  const concertCount = data.concertArtistBridge.filter(b => b.ArtistID === artist.id).length;
                  const primaryGenreObj = data.genres.find(g => g.id === artist.primary_genre_id);
                  const genreTags = data.artistGenreBridge.filter(b => b.ArtistID === artist.id).map(link => {
                    const g = data.genres.find(gen => gen.id === link.GenreID);
                    return g ? g.name : null;
                  }).filter(Boolean);

                  return (
                    <tr key={artist.id} style={{ ...styles.tr, backgroundColor: isDeleting ? '#fee2e2' : undefined }}>
                      <td data-label="Artist" style={{ ...styles.td, fontWeight: '500' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '1rem' }}>{artist.name} {artist.is_cover_band && <span style={{ fontSize: '0.65rem', backgroundColor: '#fef3c7', color: '#d97706', padding: '0.1rem 0.3rem', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '0.3rem' }}>COVER</span>}</span>
                          {artist.first_album_year && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>First Album {artist.first_album_year}</span>}
                        </div>
                      </td>
                      <td data-label="Primary Genre" style={styles.td}>
                        {primaryGenreObj ? <span style={{ fontWeight: 'bold', color: '#6d28d9' }}>{primaryGenreObj.name}</span> : <span style={{ color: '#94a3b8' }}>-</span>}
                      </td>
                      <td data-label="All Genres" style={styles.td}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {genreTags.map(g => <span key={g} style={{ fontSize: '0.7rem', backgroundColor: '#ede9fe', color: '#6d28d9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{g}</span>)}
                          {genreTags.length === 0 && <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>No tags</span>}
                        </div>
                      </td>
                      <td data-label="Demographics" style={styles.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', gap: '0.2rem' }}>
                          {artist.tier && <div><strong style={{ color: '#475569' }}>Tier:</strong> {artist.tier}</div>}
                          {artist.artist_type && <div><strong style={{ color: '#475569' }}>Type:</strong> {artist.artist_type}</div>}
                          {artist.ecosystem && <div><strong style={{ color: '#475569' }}>Eco:</strong> {artist.ecosystem}</div>}
                          {!artist.tier && !artist.artist_type && !artist.ecosystem && <span style={{ color: '#94a3b8' }}>-</span>}
                        </div>
                      </td>
                      <td data-label="Listeners" style={styles.td}>
                        {artist.spotify_listeners ? <span style={{ color: '#1db954', fontWeight: '500' }}>{formatNum(artist.spotify_listeners)} mo</span> : <span style={{ color: '#94a3b8' }}>-</span>}
                      </td>
                      <td data-label="Concerts Logged" style={styles.td}>
                        {concertCount > 0 ? (
                          <span style={{ backgroundColor: '#e2e8f0', color: '#0f172a', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            {concertCount}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>0</span>
                        )}
                      </td>
                      <td data-label="Actions" style={{ ...styles.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isDeleting ? (
                          <>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#c62828', marginRight: '8px' }}>Confirm?</span>
                            <button onClick={() => deleteArtist(artist.id)} disabled={loading} style={{ ...styles.actionBtn, color: '#2e7d32', marginRight: '4px', border: '1px solid #2e7d32' }} title="Yes, Delete">
                              ✓
                            </button>
                            <button onClick={() => setDeletingId(null)} disabled={loading} style={{ ...styles.actionBtn, color: '#d32f2f', border: '1px solid #d32f2f' }} title="Cancel">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(artist)} style={{ ...styles.actionBtn, color: 'var(--text-secondary)' }} title="Full Edit">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => setDeletingId(artist.id)} disabled={loading} style={{ ...styles.actionBtn, color: '#d32f2f', marginLeft: '4px' }} title="Delete Artist">
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
