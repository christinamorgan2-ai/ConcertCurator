import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { sharedTableStyles as styles } from './ConcertsPage';
import { Edit2, Save, X, Trash2, RefreshCw } from 'lucide-react';
import { SpotifyArtistAutocomplete } from '../components/SpotifyArtistAutocomplete';
import { fetchArtistMetadata } from '../utils/musicBrainz';

const formatNum = (num) => {
  if (!num) return '-';
  return parseInt(num).toLocaleString('en-US');
};

const ObjectSort = (arr, key) => [...arr].sort((a, b) => (a[key] || '').localeCompare(b[key] || ''));

export const ArtistsPage = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [editError, setEditError] = useState(null);
  const [genreInput, setGenreInput] = useState('');
  const genreInputRef = useRef(null);
  const [deletingId, setDeletingId] = useState(null);
  
  const [syncingArtist, setSyncingArtist] = useState(null);
  const [proposedGenres, setProposedGenres] = useState([]);
  const [proposedFirstAlbumYear, setProposedFirstAlbumYear] = useState(null);
  const [keepCustomGenres, setKeepCustomGenres] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Focus management triggers

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

  const addSpotifyArtist = async (artistObj) => {
    const cleanName = artistObj.name.trim();
    if (!cleanName) return;
    setError(null);
    setSuccess(null);

    const isDuplicate = data.artists.some(a => a.name.toLowerCase() === cleanName.toLowerCase());
    if (isDuplicate) {
      setError(`An artist named "${cleanName}" is already in your database!`);
      return;
    }

    setLoading(true);
    try {
      const artistId = crypto.randomUUID();
      const { tags: mbGenres, firstAlbumYear: mbFirstAlbumYear } = await fetchArtistMetadata(cleanName);
      const artistGenres = mbGenres.length > 0 ? mbGenres : (artistObj.genres || []);
      let primaryGenreId = null;
      const newGenresToInsert = [];
      const genreBridgeInserts = [];

      // Primary genre logic
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

      // Secondary genres (bridge)
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

      if (newGenresToInsert.length > 0) {
         const uniqueGenres = Array.from(new Set(newGenresToInsert.map(g => g.name)))
           .map(name => newGenresToInsert.find(g => g.name === name));
         const { error: gErr } = await supabase.from('genres').insert(uniqueGenres);
         if (gErr) throw new Error("Failed to insert genres");
      }

      const { error: insertErr } = await supabase.from('artists').insert([{ 
        id: artistId, 
        name: cleanName,
        primary_genre_id: primaryGenreId,
        first_album_year: mbFirstAlbumYear,
        spotify_listeners: artistObj.followers || null
      }]);
      if (insertErr) throw insertErr;

      if (genreBridgeInserts.length > 0) {
         const { error: gbErr } = await supabase.from('artist_genre_bridge').insert(genreBridgeInserts);
         if (gbErr) throw new Error("Failed to insert artist genres");
      }

      await refreshData(true);
      setSuccess(`Successfully added ${cleanName} to your database!`);
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
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
      // 1. Resolve Primary Genre
      let finalPrimaryGenreId = editData.primary_genre_id;

      if (finalPrimaryGenreId === 'ADD_NEW' && editData.new_primary_genre_name) {
        const cleanNewGenre = editData.new_primary_genre_name.trim();
        if (cleanNewGenre) {
          let existingMatch = data.genres.find(g => g.name.toLowerCase() === cleanNewGenre.toLowerCase());
          if (existingMatch) {
            finalPrimaryGenreId = existingMatch.id;
          } else {
            finalPrimaryGenreId = crypto.randomUUID();
            const { error: newGenErr } = await supabase.from('genres').insert([{ id: finalPrimaryGenreId, name: cleanNewGenre }]);
            if (newGenErr) throw new Error("Failed to insert new primary genre.");
          }
          // Ensure it gets bridged to the All Genres tag list automatically
          if (!editData.selectedGenres.includes(cleanNewGenre)) {
            editData.selectedGenres.push(cleanNewGenre);
          }
        } else {
          finalPrimaryGenreId = null;
        }
      } else if (finalPrimaryGenreId === 'ADD_NEW') {
        finalPrimaryGenreId = null;
      }

      // 2. Update Core Metadata
      let albumYr = parseInt(editData.first_album_year);
      let spotList = parseInt(editData.spotify_listeners);

      const payload = {
        name: cleanName,
        primary_genre_id: finalPrimaryGenreId || null,
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
      await refreshData(true);
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

  const handleSyncClick = async (artist) => {
    setSyncingArtist(artist);
    setIsSyncing(true);
    try {
      const { tags, firstAlbumYear } = await fetchArtistMetadata(artist.name);
      setProposedGenres(tags);
      setProposedFirstAlbumYear(firstAlbumYear);
    } catch (err) {
      console.error("Sync fetch error:", err);
      setProposedGenres([]);
      setProposedFirstAlbumYear(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const confirmSync = async () => {
    if (!syncingArtist) return;
    setLoading(true);
    try {
      if (proposedGenres.length === 0 && proposedFirstAlbumYear === null) {
        setSyncingArtist(null);
        return;
      }
      
      const newGenresToInsert = [];
      const genreBridgeInserts = [];
      const genresToUpdate = [];
      let primaryGenreId = null;

      // 1. Process proposed genres into database genres
      for (let i = 0; i < proposedGenres.length; i++) {
        const pGenre = proposedGenres[i];
        let genreMatch = data.genres.find(g => g.name.toLowerCase() === pGenre.toLowerCase());
        let genreId;
        if (!genreMatch) {
          genreId = crypto.randomUUID();
          newGenresToInsert.push({ id: genreId, name: pGenre });
          data.genres.push({ id: genreId, name: pGenre });
        } else {
          genreId = genreMatch.id;
          if (genreMatch.name !== pGenre) {
            genresToUpdate.push({ id: genreId, name: pGenre });
            genreMatch.name = pGenre;
          }
        }

        if (i === 0) {
          primaryGenreId = genreId;
        }
        
        genreBridgeInserts.push({ artist_id: syncingArtist.id, genre_id: genreId });
      }

      // If keep custom genres is true, append existing genres to the bridge list (skip duplicates)
      if (keepCustomGenres) {
        const existingBridge = data.artistGenreBridge.filter(b => b.ArtistID === syncingArtist.id);
        for (const bridge of existingBridge) {
           if (!genreBridgeInserts.some(gb => gb.genre_id === bridge.GenreID)) {
             genreBridgeInserts.push({ artist_id: syncingArtist.id, genre_id: bridge.GenreID });
           }
        }
      }

      // 2. Insert new genres to satisfy foreign keys
      if (newGenresToInsert.length > 0) {
         const uniqueGenres = Array.from(new Set(newGenresToInsert.map(g => g.name)))
           .map(name => newGenresToInsert.find(g => g.name === name));
         const { error: gErr } = await supabase.from('genres').insert(uniqueGenres);
         if (gErr) throw new Error("Failed to insert genres: " + gErr.message);
      }

      // 2.5 Update existing genres to new case
      if (genresToUpdate.length > 0) {
         for (const gu of genresToUpdate) {
            const { error: guErr } = await supabase.from('genres').update({ name: gu.name }).eq('id', gu.id);
            if (guErr) console.error("Failed to update genre casing:", guErr);
         }
      }

      // 3. Update primary genre and first album year on artist
      const updatePayload = {};
      if (primaryGenreId) {
        updatePayload.primary_genre_id = primaryGenreId;
      }
      if (proposedFirstAlbumYear !== null) {
        updatePayload.first_album_year = proposedFirstAlbumYear;
      }

      if (Object.keys(updatePayload).length > 0) {
        const { error: upErr } = await supabase.from('artists')
           .update(updatePayload)
           .eq('id', syncingArtist.id);
        if (upErr) throw upErr;
      }

      // 4. Wipe existing bridge and replace only if we have new genres
      if (proposedGenres.length > 0) {
        await supabase.from('artist_genre_bridge').delete().eq('artist_id', syncingArtist.id);
        
        if (genreBridgeInserts.length > 0) {
           const { error: gbErr } = await supabase.from('artist_genre_bridge').insert(genreBridgeInserts);
           if (gbErr) throw new Error("Failed to insert artist genres: " + gbErr.message);
        }
      }

      setSyncingArtist(null);
      await refreshData(true);
    } catch (err) {
      console.error(err);
      setError("Error syncing artist: " + err.message);
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
      
      {success && <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{success}</div>}

      <div style={{...styles.inlineForm, maxWidth: '500px', display: 'flex'}}>
        <SpotifyArtistAutocomplete 
          onSelectArtist={addSpotifyArtist} 
          style={{ ...styles.inlineInput, width: '100%' }}
          placeholder="Search Spotify to add a new artist..."
        />
      </div>

      <div style={styles.tableContainer}>
        <div style={{ overflowX: 'auto' }}>
          <table className="responsive-table" style={{ ...styles.table, minWidth: '1100px' }}>
            <thead>
              <tr>
                <th style={styles.th}>Artist</th>
                <th style={styles.th}>Primary Genre</th>
                <th style={styles.th}>All Genres</th>

                <th style={styles.th}>Concerts Logged</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.artists.length === 0 ? (
                <tr><td colSpan="5" style={styles.emptyCell}>No artists found.</td></tr>
              ) : (
                [...data.artists].sort((a, b) => a.name.localeCompare(b.name)).map(artist => {
                  const isEditing = editingId === artist.id;
                  const isDeleting = deletingId === artist.id;

                  if (isEditing) {
                    return (
                      <React.Fragment key={artist.id}>
                        {editError && (
                          <tr>
                            <td colSpan="5" style={{ padding: '0.75rem', backgroundColor: '#ffebee', color: '#c62828', fontSize: '0.875rem', textAlign: 'center', border: '1px solid #c62828' }}>
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
                            {editData.primary_genre_id === 'ADD_NEW' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <input
                                  autoFocus
                                  style={{ ...styles.inlineInput, width: '100%', padding: '0.4rem' }}
                                  placeholder="New Genre Name"
                                  value={editData.new_primary_genre_name || ''}
                                  onChange={e => setEditData({ ...editData, new_primary_genre_name: e.target.value })}
                                />
                                <button type="button" onClick={() => setEditData({ ...editData, primary_genre_id: '' })} style={{ fontSize: '0.7rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <select
                                style={{ ...styles.inlineInput, width: '100%', backgroundColor: '#fff', padding: '0.4rem' }}
                                value={editData.primary_genre_id || ''}
                                onChange={e => {
                                  const newId = e.target.value;
                                  if (newId === 'ADD_NEW') {
                                    setEditData(prev => ({ ...prev, primary_genre_id: 'ADD_NEW', new_primary_genre_name: '' }));
                                    return;
                                  }
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
                                <option value="ADD_NEW" style={{ fontWeight: 'bold', color: '#2563eb' }}>+ Add New Genre</option>
                              </select>
                            )}
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
                  const concertLinks = data.concertArtistBridge.filter(b => b.ArtistID === artist.id);
                  const concertCount = concertLinks.length;
                  
                  const hoverTitle = concertLinks.length > 0 ? concertLinks.map(link => {
                    const c = data.concerts.find(con => con.id === link.ConcertID);
                    if (!c) return null;
                    const v = data.venues.find(ven => ven.id === (c.venue_id || c.VenueID));
                    const vName = v ? (v.name || v.Name) : 'Unknown Venue';
                    let dStr = c.date;
                    try {
                      if (c.date) {
                        // Append time to prevent timezone day shifting
                        dStr = new Date(c.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                      }
                    } catch(e) {}
                    return `${dStr} @ ${vName}`;
                  }).filter(Boolean).join('\n') : "No concerts logged";

                  const primaryGenreObj = data.genres.find(g => g.id === artist.primary_genre_id);
                  const genreTags = data.artistGenreBridge.filter(b => b.ArtistID === artist.id).map(link => {
                    const g = data.genres.find(gen => gen.id === link.GenreID);
                    return g ? g.name : null;
                  }).filter(Boolean);

                  return (
                    <tr key={artist.id} style={{ ...styles.tr, backgroundColor: isDeleting ? '#fee2e2' : undefined }}>
                      <td data-label="Artist" style={{ ...styles.td, fontWeight: '500' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span title={hoverTitle} style={{ fontSize: '1rem', cursor: 'help', borderBottom: '1px dotted #94a3b8', width: 'fit-content' }}>
                            {artist.name} {artist.is_cover_band && <span style={{ fontSize: '0.65rem', backgroundColor: '#fef3c7', color: '#d97706', padding: '0.1rem 0.3rem', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '0.3rem', borderBottom: 'none', cursor: 'default' }}>COVER</span>}
                          </span>
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
                            <button onClick={() => handleSyncClick(artist)} style={{ ...styles.actionBtn, color: '#2563eb', marginRight: '4px' }} title="Sync with MusicBrainz">
                              <RefreshCw size={18} className={isSyncing && syncingArtist?.id === artist.id ? "spin-animation" : ""} />
                            </button>
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

      {syncingArtist && (
        <div style={modalStyles.modalOverlay}>
          <div style={modalStyles.modalContent}>
            <div style={modalStyles.modalHeader}>
              <h2 style={modalStyles.modalTitle}>Sync Artist Genres</h2>
              <button onClick={() => setSyncingArtist(null)} style={modalStyles.closeBtn}><X size={24} /></button>
            </div>
            
            <div style={{ padding: '1rem' }}>
              {isSyncing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '1rem' }}>
                  <RefreshCw size={36} className="spin-animation" style={{ color: '#2563eb' }} />
                  <p style={{ color: '#475569', fontSize: '1rem', fontWeight: '500', margin: 0 }}>Magic Happening...</p>
                </div>
              ) : (
                <>
                  <p style={{ marginBottom: '1rem', color: '#475569', fontSize: '0.95rem' }}>
                    Found <strong>{proposedGenres.length}</strong> tags from MusicBrainz for <strong>{syncingArtist.name}</strong>.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>PROPOSED PRIMARY GENRE</strong>
                      {proposedGenres.length > 0 ? (
                        <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{proposedGenres[0]}</span>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>None found</span>
                      )}
                    </div>
                    
                    {proposedGenres.length > 1 && (
                      <div>
                        <strong style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>PROPOSED SECONDARY TAGS</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {proposedGenres.slice(1).map(g => (
                            <span key={g} style={{ fontSize: '0.75rem', backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{g}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {proposedFirstAlbumYear && (
                      <div>
                        <strong style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>PROPOSED FIRST ALBUM YEAR</strong>
                        <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{proposedFirstAlbumYear}</span>
                      </div>
                    )}
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1rem' }}>
                    <input 
                      type="checkbox" 
                      checked={keepCustomGenres} 
                      onChange={(e) => setKeepCustomGenres(e.target.checked)} 
                    />
                    <span style={{ fontSize: '0.9rem', color: '#334155' }}>
                      Keep my previously entered custom genres as secondary tags
                    </span>
                  </label>
                </>
              )}

              {error && <div style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button 
                  onClick={() => setSyncingArtist(null)} 
                  disabled={loading}
                  style={{ ...modalStyles.submitBtn, backgroundColor: 'transparent', color: '#64748b', border: '1px solid #cbd5e1' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmSync} 
                  disabled={loading || (proposedGenres.length === 0 && proposedFirstAlbumYear === null)}
                  style={{ ...modalStyles.submitBtn, backgroundColor: '#2563eb' }}
                >
                  {loading ? 'Saving...' : 'Accept & Overwrite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const modalStyles = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' },
  modalContent: { backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' },
  modalTitle: { margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' },
  closeBtn: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#e2e8f0' } },
  submitBtn: { backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', transition: 'background-color 0.2s' }
};
