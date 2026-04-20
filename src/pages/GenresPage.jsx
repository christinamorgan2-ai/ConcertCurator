import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { sharedTableStyles as styles } from './ConcertsPage';
import { Edit2, Save, X, Trash2, AlertTriangle } from 'lucide-react';

export const GenresPage = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '' });

  // CRUD States
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [editError, setEditError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('genres').insert([{ id: crypto.randomUUID(), name: formData.name }]);
      if (error) throw error;
      setFormData({ name: '' });
      await refreshData();
    } catch (err) {
      alert("Error adding genre: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (g) => {
    setEditingId(g.id);
    setEditData({ name: g.name });
    setEditError(null);
    setDeletingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ name: '' });
    setEditError(null);
  };

  const saveEdit = async (id) => {
    if (!editData.name.trim()) {
      setEditError("Name is required.");
      return;
    }
    setLoading(true);
    setEditError(null);
    try {
      const { data: updatedRows, error } = await supabase.from('genres').update({ name: editData.name.trim() }).eq('id', id).select();
      if (error) throw error;
      if (!updatedRows || updatedRows.length === 0) {
         throw new Error("Target row not updated. You likely don't have Update permission.");
      }
      setEditingId(null);
      await refreshData();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteGenre = async (id) => {
    setLoading(true);
    setEditError(null);
    try {
      // Wipe bridge records before attempting to sever constraint
      await supabase.from('artist_genre_bridge').delete().eq('genre_id', id);
      
      const { data: deletedRows, error } = await supabase.from('genres').delete().eq('id', id).select();
      if (error) throw error;
      if (!deletedRows || deletedRows.length === 0) {
         throw new Error("Target row not deleted. You likely don't have Delete permission.");
      }
      
      setDeletingId(null);
      await refreshData();
    } catch (err) {
      console.error("Delete Error Trace:", err);
      setEditError("Delete failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Genres</h1>
          <p style={styles.pageSubtitle}>Musical categories</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} style={styles.inlineForm}>
        <input 
          style={styles.inlineInput} placeholder="Genre Name" required
          value={formData.name} onChange={e => setFormData({name: e.target.value})} 
        />
        <button type="submit" disabled={loading} style={styles.addBtn}>
          {loading ? 'Adding...' : 'Add Genre'}
        </button>
      </form>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={{...styles.th, textAlign: 'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.genres.length === 0 ? (
              <tr><td colSpan="2" style={styles.emptyCell}>No genres found.</td></tr>
            ) : (
              data.genres.sort((a,b) => a.name.localeCompare(b.name)).map(g => {
                const isEditing = editingId === g.id;
                const isDeleting = deletingId === g.id;

                return (
                  <React.Fragment key={g.id}>
                    {(isEditing || isDeleting) && editError && (
                      <tr>
                        <td colSpan="2" style={{ padding: '0.75rem', backgroundColor: '#ffebee', color: '#c62828', fontSize: '0.875rem', textAlign: 'center', border: '1px solid #c62828' }}>
                          ⚠️ {editError}
                        </td>
                      </tr>
                    )}
                    <tr style={{...styles.tr, backgroundColor: isDeleting ? '#fee2e2' : (isEditing ? '#f5f8ff' : undefined)}}>
                      {isEditing ? (
                        <>
                          <td style={{...styles.td, padding: '0.5rem'}}>
                            <input 
                              style={{...styles.inlineInput, width: '100%', padding: '0.4rem'}} 
                              value={editData.name} 
                              onChange={e => setEditData({ name: e.target.value })} 
                              autoFocus
                            />
                          </td>
                          <td style={{...styles.td, padding: '0.5rem', width: '7%', textAlign: 'right', whiteSpace: 'nowrap'}}>
                            <button onClick={() => saveEdit(g.id)} disabled={loading} style={{...styles.actionBtn, color: '#2e7d32', marginRight: '4px'}} title="Save">
                              <Save size={18} />
                            </button>
                            <button onClick={cancelEdit} disabled={loading} style={{...styles.actionBtn, color: '#d32f2f'}} title="Cancel">
                              <X size={18} />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{...styles.td, fontWeight: '500'}}>
                            {g.name}
                            {isDeleting && (
                              <div style={{ marginTop: '0.5rem', color: '#c62828', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#ffffff', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ffcdd2', width: 'fit-content' }}>
                                <AlertTriangle size={14} /> 
                                Warning: Deleting this genre will instantly remove it as a tag from all associated artists.
                              </div>
                            )}
                          </td>
                          <td style={{...styles.td, textAlign: 'right', whiteSpace: 'nowrap', width: '15%'}}>
                            {isDeleting ? (
                              <>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#c62828', marginRight: '8px'}}>Confirm?</span>
                                <button onClick={() => deleteGenre(g.id)} disabled={loading} style={{...styles.actionBtn, color: '#2e7d32', marginRight: '4px', border: '1px solid #2e7d32'}} title="Yes, Delete">
                                  ✓
                                </button>
                                <button onClick={() => setDeletingId(null)} disabled={loading} style={{...styles.actionBtn, color: '#d32f2f', border: '1px solid #d32f2f'}} title="Cancel">
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(g)} style={{...styles.actionBtn, color: 'var(--text-secondary)'}} title="Edit Genre">
                                  <Edit2 size={18} />
                                </button>
                                <button onClick={() => setDeletingId(g.id)} disabled={loading} style={{...styles.actionBtn, color: '#d32f2f', marginLeft: '4px'}} title="Delete Genre">
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
