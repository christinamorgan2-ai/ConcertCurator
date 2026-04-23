import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { sharedTableStyles as styles } from './ConcertsPage';
import { Edit2, Save, X, Trash2 } from 'lucide-react';

export const AttendeesPage = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '' });
  const quickAttendeeInputRef = useRef(null);

  // Focus management trigger tied to array expansion
  const prevAttendeeTotalCount = useRef(data.attendees?.length || 0);
  useEffect(() => {
    const current = data.attendees?.length || 0;
    if (current > prevAttendeeTotalCount.current) {
      setTimeout(() => {
        quickAttendeeInputRef.current?.focus();
      }, 50);
    }
    prevAttendeeTotalCount.current = current;
  }, [data.attendees]);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [editError, setEditError] = useState(null);
  const [duplicateEditWarning, setDuplicateEditWarning] = useState(false);
  const [duplicateEditOverride, setDuplicateEditOverride] = useState(false);
  const [duplicateCreateWarning, setDuplicateCreateWarning] = useState(false);
  const [duplicateCreateOverride, setDuplicateCreateOverride] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const startEdit = (attendee) => {
    setEditingId(attendee.id);
    setEditError(null);
    setEditData({ id: attendee.id, name: attendee.name });
    setDuplicateEditWarning(false);
    setDuplicateEditOverride(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setEditError(null);
    setDuplicateEditWarning(false);
    setDuplicateEditOverride(false);
  };

  const saveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setEditError(null);
    const cleanName = (editData.name || '').trim();

    if (!cleanName) {
      setEditError("Attendee name is required.");
      return;
    }

    if (!duplicateEditOverride) {
      const collision = data.attendees.find(a => a.name.toLowerCase() === cleanName.toLowerCase() && a.id !== editData.id);
      if (collision) {
        setDuplicateEditWarning(true);
        return;
      }
    }

    setLoading(true);
    try {
      const { data: updatedRows, error } = await supabase.from('attendees')
        .update({ name: cleanName })
        .eq('id', editData.id)
        .select();

      if (error) throw error;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error("Update blocked by SQL permissions.");
      }

      setEditingId(null);
      await refreshData();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteAttendee = async (attendeeId) => {
    setLoading(true);
    try {
      // Purge mappings
      await supabase.from('concert_attendee_bridge').delete().eq('attendee_id', attendeeId);

      const { data: deletedRows, error: delErr } = await supabase.from('attendees').delete().eq('id', attendeeId).select();
      if (delErr) throw delErr;
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error("Unable to delete. You likely don't have delete permissions.");
      }

      await refreshData();
    } catch (err) {
      alert("Error deleting attendee: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = formData.name.trim();
    if (!cleanName) return;

    if (!duplicateCreateOverride) {
      const collision = data.attendees.find(a => a.name.toLowerCase() === cleanName.toLowerCase());
      if (collision) {
        setDuplicateCreateWarning(true);
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('attendees').insert([{ id: crypto.randomUUID(), name: cleanName }]);
      if (error) throw error;
      setFormData({ name: '' });
      setDuplicateCreateWarning(false);
      setDuplicateCreateOverride(false);
      await refreshData();
    } catch (err) {
      alert("Error adding attendee: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Attendees</h1>
          <p style={styles.pageSubtitle}>Friends and companions you attended with</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} style={styles.inlineForm}>
        <input 
          ref={quickAttendeeInputRef}
          style={styles.inlineInput} placeholder="Attendee Name" required
          value={formData.name} onChange={e => {
            setFormData({name: e.target.value});
            setDuplicateCreateWarning(false);
            setDuplicateCreateOverride(false);
          }} 
          autoFocus={true}
        />
        <button type="submit" disabled={loading} style={styles.addBtn}>
          {loading ? 'Adding...' : 'Add Attendee'}
        </button>
      </form>

      {duplicateCreateWarning && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fff8c4', color: '#856404', borderRadius: '6px', border: '1px solid #ffeeba', fontSize: '0.875rem' }}>
          <strong>⚠️ Warning:</strong> An attendee named "{formData.name}" already exists. 
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="dupCreateOverride" checked={duplicateCreateOverride} onChange={e => setDuplicateCreateOverride(e.target.checked)} style={{cursor: 'pointer'}} />
            <label htmlFor="dupCreateOverride" style={{ cursor: 'pointer', fontWeight: '500' }}>Yes, deliberately create a duplicate</label>
          </div>
        </div>
      )}

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead><tr><th style={styles.th}>Name</th><th style={styles.th}>Concerts Attended With</th><th style={{...styles.th, textAlign: 'right'}}>Actions</th></tr></thead>
          <tbody>
            {data.attendees.length === 0 ? (
              <tr><td colSpan="3" style={styles.emptyCell}>No attendees found.</td></tr>
            ) : (
              [...data.attendees].sort((a,b) => a.name.localeCompare(b.name)).map(att => {
                const concertCount = data.concertAttendeeBridge.filter(b => b.attendee_id === att.id).length;
                const isEditing = editingId === att.id;
                const isDeleting = deletingId === att.id;

                if (isEditing) {
                  return (
                    <React.Fragment key={att.id}>
                      {editError && (
                        <tr><td colSpan="3" style={{ padding: '0.75rem', backgroundColor: '#ffebee', color: '#c62828', fontSize: '0.875rem' }}>⚠️ {editError}</td></tr>
                      )}
                      <tr style={{ ...styles.tr, backgroundColor: '#f5f8ff' }}>
                        <td style={{...styles.td, width: '40%'}}>
                          <input style={{...styles.inlineInput, width: '100%', minWidth: '120px'}} value={editData.name} onChange={e => {
                              setEditData({...editData, name: e.target.value});
                              setDuplicateEditWarning(false);
                              setDuplicateEditOverride(false);
                          }} />
                        </td>
                        <td style={styles.td}>
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>Readonly</span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button onClick={saveEdit} disabled={loading} style={{...styles.actionBtn, color: '#2e7d32', marginRight: '4px'}} title="Save">
                            <Save size={18} />
                          </button>
                          <button onClick={cancelEdit} disabled={loading} style={{...styles.actionBtn, color: '#d32f2f'}} title="Cancel">
                            <X size={18} />
                          </button>
                        </td>
                      </tr>
                      {duplicateEditWarning && (
                        <tr>
                          <td colSpan="3" style={{ padding: '0.75rem', backgroundColor: '#fff8c4', color: '#856404', fontSize: '0.875rem', borderBottom: '1px solid #ffeeba' }}>
                            <strong>⚠️ Warning:</strong> An attendee named "{editData.name}" already exists. 
                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input type="checkbox" id="dupEditOverride" checked={duplicateEditOverride} onChange={e => setDuplicateEditOverride(e.target.checked)} style={{cursor: 'pointer'}} />
                              <label htmlFor="dupEditOverride" style={{ cursor: 'pointer', fontWeight: '500' }}>Yes, allow duplicate naming and save</label>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }

                return (
                  <tr key={att.id} style={{...styles.tr, backgroundColor: isDeleting ? '#fee2e2' : undefined}}>
                    <td style={{...styles.td, fontWeight: '500'}}>{att.name}</td>
                    <td style={styles.td}>{concertCount}</td>
                    <td style={{ ...styles.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {isDeleting ? (
                        <>
                          <span style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#c62828', marginRight: '8px'}}>Confirm?</span>
                          <button onClick={() => deleteAttendee(att.id)} disabled={loading} style={{...styles.actionBtn, color: '#2e7d32', marginRight: '4px', border: '1px solid #2e7d32'}} title="Yes, Delete">
                            ✓
                          </button>
                          <button onClick={() => setDeletingId(null)} disabled={loading} style={{...styles.actionBtn, color: '#d32f2f', border: '1px solid #d32f2f'}} title="Cancel">
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(att)} style={{...styles.actionBtn, color: 'var(--text-secondary)'}} title="Edit Attendee">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => setDeletingId(att.id)} disabled={loading} style={{...styles.actionBtn, color: '#d32f2f', marginLeft: '4px'}} title="Delete Attendee">
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
  );
};
