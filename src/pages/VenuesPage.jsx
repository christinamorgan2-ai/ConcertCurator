import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { sharedTableStyles as styles } from './ConcertsPage';
import { Edit2, Save, X, Settings, Trash2 } from 'lucide-react';

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

export const VenuesPage = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const userDefaultCountry = data.userSettings?.default_country || 'USA';
  
  const [formData, setFormData] = useState({ 
    name: '', country: userDefaultCountry, region: '', city: '', lat: '', long: '' 
  });
  
  const [duplicateVenueWarning, setDuplicateVenueWarning] = useState(false);
  const [duplicateVenueOverride, setDuplicateVenueOverride] = useState(false);
  
  // Settings State
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [editError, setEditError] = useState(null);
  const [duplicateEditWarning, setDuplicateEditWarning] = useState(false);
  const [duplicateEditOverride, setDuplicateEditOverride] = useState(false);

  // Deletion State
  const [deletingId, setDeletingId] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  // Sync new default country to form whenever auth/fetch updates
  useEffect(() => {
    setFormData(prev => ({ ...prev, country: userDefaultCountry }));
  }, [userDefaultCountry]);

  const handleUpdateDefaultCountry = async (e) => {
    const newDefault = e.target.value;
    setIsUpdatingSettings(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('user_settings').upsert({
        user_id: user.id,
        default_country: newDefault
      });
      if (error) throw error;
      await refreshData();
    } catch (err) {
      alert("Error saving settings: " + err.message);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleCreateVenue = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    // Soft Duplicate Check
    if (!duplicateVenueOverride) {
      const cleanName = formData.name.trim().toLowerCase();
      const collision = data.venues.find(v => v.name.toLowerCase() === cleanName);
      if (collision) {
        setDuplicateVenueWarning(true);
        return; // Halt and wait for user explicitly checking override
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('venues').insert([{ 
        id: crypto.randomUUID(), 
        name: formData.name, 
        country: formData.country || null,
        region: formData.region || null,
        city: formData.city || null,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        long: formData.long ? parseFloat(formData.long) : null
      }]);
      if (error) throw error;
      setFormData({ name: '', country: userDefaultCountry, region: '', city: '', lat: '', long: '' });
      setDuplicateVenueWarning(false);
      setDuplicateVenueOverride(false);
      await refreshData();
    } catch (err) {
      alert("Error adding venue: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (v) => {
    setEditingId(v.id);
    setEditError(null);
    setEditData({ 
      id: v.id, 
      name: v.name || '', 
      country: v.country || '',
      region: v.region || '', 
      city: v.city || '', 
      lat: v.lat || '',
      long: v.long || ''
    });
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

  const deleteVenue = async (venueId) => {
    setLoading(true);
    setGlobalError(null);
    try {
      const { error } = await supabase.from('venues').delete().eq('id', venueId);
      if (error) {
        if (error.code === '23503') throw new Error("This venue is actively assigned to one or more concerts! You must reassign or delete those concerts before deleting this location.");
        throw error;
      }
      setDeletingId(null);
      await refreshData();
    } catch (err) {
      setGlobalError("Failed to delete: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setEditError(null);
    if (!editData.name) {
      setEditError("Venue Name is required.");
      return;
    }

    // Soft Duplicate Check
    if (!duplicateEditOverride) {
      const cleanName = editData.name.trim().toLowerCase();
      const collision = data.venues.find(v => v.name.toLowerCase() === cleanName && v.id !== editData.id);
      if (collision) {
        setDuplicateEditWarning(true);
        return; // Halt and wait for user explicitly checking override
      }
    }

    setLoading(true);
    try {
      const { data: updatedRows, error } = await supabase.from('venues').update({
        name: editData.name,
        country: editData.country || null,
        region: editData.region || null,
        city: editData.city || null,
        lat: editData.lat ? parseFloat(editData.lat) : null,
        long: editData.long ? parseFloat(editData.long) : null
      }).eq('id', editData.id).select();
      
      if (error) throw error;
      if (!updatedRows || updatedRows.length === 0) {
         throw new Error("Database update ignored. This is usually caused by Row Level Security (RLS) policies blocking the UPDATE operation.");
      }

      setEditingId(null);
      await refreshData();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Venues</h1>
          <p style={styles.pageSubtitle}>Manage concert locations and deep metadata</p>
        </div>
      </header>

      {globalError && (
        <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '6px', border: '1px solid #c62828', fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: '500' }}>
          ⚠️ {globalError}
        </div>
      )}

      {/* Inline Create Form */}
      <form onSubmit={handleCreateVenue} style={{...styles.inlineForm, flexDirection: 'column'}}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', width: '100%', marginBottom: '0.5rem' }}>
          <input 
            style={{...styles.inlineInput, flex: 2, minWidth: '150px'}} placeholder="Venue Name *" required
            value={formData.name} onChange={e => {
              setFormData({...formData, name: e.target.value});
              setDuplicateVenueWarning(false);
              setDuplicateVenueOverride(false);
            }} 
          />
          <select 
            style={{...styles.inlineInput, flex: 1, minWidth: '80px', backgroundColor: '#fff'}}
            value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})}
          >
            <option value="">Country...</option>
            {COMMON_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {formData.country && formData.country.toUpperCase() === 'USA' ? (
            <select 
              style={{...styles.inlineInput, flex: 1, minWidth: '80px', backgroundColor: '#fff'}}
              value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})}
            >
              <option value="">State...</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input 
              style={{...styles.inlineInput, flex: 1, minWidth: '80px'}} placeholder="Region/State"
              value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} 
            />
          )}
          <input 
            style={{...styles.inlineInput, flex: 1, minWidth: '80px'}} placeholder="City"
            value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} 
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', width: '100%' }}>
          <input 
            style={{...styles.inlineInput, flex: 1, minWidth: '120px'}} placeholder="Latitude (Optional)" type="number" step="any"
            value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} 
          />
          <input 
            style={{...styles.inlineInput, flex: 1, minWidth: '120px'}} placeholder="Longitude (Optional)" type="number" step="any"
            value={formData.long} onChange={e => setFormData({...formData, long: e.target.value})} 
          />
          <button type="submit" disabled={loading} style={styles.addBtn}>
            {loading ? 'Adding...' : 'Add Venue'}
          </button>
        </div>

        {duplicateVenueWarning && (
          <div style={{ width: '100%', padding: '0.75rem', backgroundColor: '#fff8c4', color: '#856404', borderRadius: '6px', border: '1px solid #ffeeba', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            <strong>⚠️ Warning:</strong> A venue named "{formData.name}" already exists. 
            Are you sure you want to create a duplicate? (Tip: Try appending the city, e.g. "{formData.name} ({formData.city || 'City'})").
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="dupCreateOverride" checked={duplicateVenueOverride} onChange={e => setDuplicateVenueOverride(e.target.checked)} style={{cursor: 'pointer'}} />
              <label htmlFor="dupCreateOverride" style={{ cursor: 'pointer', fontWeight: '500' }}>Yes, deliberately create a duplicate venue</label>
            </div>
          </div>
        )}
      </form>

      {/* Venues Table */}
      <div style={styles.tableContainer}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{...styles.table, minWidth: '800px'}}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Country</th>
                <th style={styles.th}>Region/State</th>
                <th style={styles.th}>City</th>
                <th style={styles.th}>Latitude</th>
                <th style={styles.th}>Longitude</th>
                <th style={{...styles.th, textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.venues.length === 0 ? (
                <tr><td colSpan="7" style={styles.emptyCell}>No venues found.</td></tr>
              ) : (
                [...data.venues].sort((a,b) => a.name.localeCompare(b.name)).map(v => {
                  const isEditing = editingId === v.id;
                  const isDeleting = deletingId === v.id;

                  if (isEditing) {
                    return (
                      <React.Fragment key={v.id}>
                        {editError && (
                          <tr>
                            <td colSpan="7" style={{ padding: '0.75rem', backgroundColor: '#ffebee', color: '#c62828', fontSize: '0.875rem', textAlign: 'center', border: '1px solid #c62828' }}>
                              ⚠️ {editError}
                            </td>
                          </tr>
                        )}
                        <tr style={{ ...styles.tr, backgroundColor: '#f5f8ff' }}>
                        <td style={{...styles.td, width: '30%'}}>
                          <input style={{...styles.inlineInput, width: '100%', minWidth: '120px'}} value={editData.name} onChange={e => {
                            setEditData({...editData, name: e.target.value});
                            setDuplicateEditWarning(false);
                            setDuplicateEditOverride(false);
                          }} />
                        </td>
                        <td style={{...styles.td, width: '14%'}}>
                          <select 
                            style={{...styles.inlineInput, width: '100%', minWidth: '70px', backgroundColor: '#fff'}}
                            value={editData.country} onChange={e => setEditData({...editData, country: e.target.value})}
                          >
                            <option value="">Country...</option>
                            {COMMON_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td style={{...styles.td, width: '14%'}}>
                          {editData.country && editData.country.toUpperCase() === 'USA' ? (
                            <select 
                              style={{...styles.inlineInput, width: '100%', minWidth: '70px', backgroundColor: '#fff'}}
                              value={editData.region} onChange={e => setEditData({...editData, region: e.target.value})}
                            >
                              <option value="">State...</option>
                              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <input style={{...styles.inlineInput, width: '100%', minWidth: '70px'}} value={editData.region} onChange={e => setEditData({...editData, region: e.target.value})} />
                          )}
                        </td>
                        <td style={{...styles.td, width: '14%'}}>
                          <input style={{...styles.inlineInput, width: '100%', minWidth: '70px'}} value={editData.city} onChange={e => setEditData({...editData, city: e.target.value})} />
                        </td>
                        <td style={{...styles.td, width: '10%'}}>
                          <input style={{...styles.inlineInput, width: '100%', minWidth: '60px'}} type="number" step="any" value={editData.lat} onChange={e => setEditData({...editData, lat: e.target.value})} />
                        </td>
                        <td style={{...styles.td, width: '10%'}}>
                          <input style={{...styles.inlineInput, width: '100%', minWidth: '60px'}} type="number" step="any" value={editData.long} onChange={e => setEditData({...editData, long: e.target.value})} />
                        </td>
                        <td style={{...styles.td, width: '8%', textAlign: 'right', whiteSpace: 'nowrap'}}>
                          <button onClick={saveEdit} disabled={loading} style={{...styles.actionBtn, color: '#2e7d32', marginRight: '8px'}} title="Save">
                            <Save size={18} />
                          </button>
                          <button onClick={cancelEdit} disabled={loading} style={{...styles.actionBtn, color: '#d32f2f'}} title="Cancel">
                            <X size={18} />
                          </button>
                        </td>
                      </tr>
                      {duplicateEditWarning && (
                        <tr>
                          <td colSpan="7" style={{ padding: '0.75rem', backgroundColor: '#fff8c4', color: '#856404', fontSize: '0.875rem', borderBottom: '1px solid #ffeeba' }}>
                            <strong>⚠️ Warning:</strong> Another venue named "{editData.name}" already exists elsewhere. 
                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input type="checkbox" id="dupEditOverride" checked={duplicateEditOverride} onChange={e => setDuplicateEditOverride(e.target.checked)} style={{cursor: 'pointer'}} />
                              <label htmlFor="dupEditOverride" style={{ cursor: 'pointer', fontWeight: '500' }}>Yes, allow duplicate naming and save</label>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    )
                  }

                  return (
                    <tr key={v.id} style={{ ...styles.tr, backgroundColor: isDeleting ? '#fee2e2' : undefined }}>
                      <td style={{...styles.td, fontWeight: '500'}}>{v.name}</td>
                      <td style={styles.td}>{v.country || '-'}</td>
                      <td style={styles.td}>{v.region || '-'}</td>
                      <td style={styles.td}>{v.city || '-'}</td>
                      <td style={styles.td}>{v.lat || '-'}</td>
                      <td style={styles.td}>{v.long || '-'}</td>
                      <td style={{...styles.td, textAlign: 'right', whiteSpace: 'nowrap'}}>
                        {isDeleting ? (
                          <>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#c62828', marginRight: '8px'}}>Confirm?</span>
                            <button onClick={() => deleteVenue(v.id)} disabled={loading} style={{...styles.actionBtn, color: '#2e7d32', marginRight: '4px', border: '1px solid #2e7d32'}} title="Yes, Delete">
                              ✓
                            </button>
                            <button onClick={() => setDeletingId(null)} disabled={loading} style={{...styles.actionBtn, color: '#d32f2f', border: '1px solid #d32f2f'}} title="Cancel">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(v)} style={{...styles.actionBtn, color: 'var(--text-secondary)'}} title="Edit Venue">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => setDeletingId(v.id)} disabled={loading} style={{...styles.actionBtn, color: '#d32f2f', marginLeft: '4px'}} title="Delete Venue">
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Styles and constants
const actionBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  transition: 'background-color 0.2s'
};

const settingsStyles = {
  banner: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    width: 'fit-content'
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-secondary)'
  },
  input: {
    padding: '0.4rem 0.6rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    fontSize: '0.875rem',
    width: '100px',
    outline: 'none'
  }
};

Object.assign(styles, { actionBtn: actionBtnStyle });
