import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { sharedTableStyles as styles } from './ConcertsPage';
import { Settings as SettingsIcon, Save, X, Plus } from 'lucide-react';

const COMMON_COUNTRIES = [
  "USA", "Canada", "UK", "Australia", "New Zealand", "Ireland",
  "Germany", "France", "Spain", "Italy", "Netherlands", "Belgium",
  "Sweden", "Norway", "Denmark", "Finland", "Japan", "South Korea",
  "Mexico", "Brazil", "Argentina", "Chile", "South Africa"
];

export const SettingsPage = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const initialSettings = data.userSettings || {};

  const [formData, setFormData] = useState({
    default_country: initialSettings.default_country || 'USA',
    default_attendee_name: initialSettings.default_attendee_name || 'Me',
    artist_types: initialSettings.artist_types || [],
    ecosystems: initialSettings.ecosystems || [],
    is_public: initialSettings.is_public || false,
    profile_name: initialSettings.profile_name || ''
  });

  const [typeInput, setTypeInput] = useState('');
  const [ecoInput, setEcoInput] = useState('');

  const handleAddString = (field, currentArr, inputVal, setInputFn) => {
    const val = inputVal.trim();
    if (val && !currentArr.includes(val)) {
      setFormData({ ...formData, [field]: [...currentArr, val] });
    }
    setInputFn('');
  };

  const handleRemoveString = (field, currentArr, target) => {
    setFormData({ ...formData, [field]: currentArr.filter(i => i !== target) });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (formData.is_public && !formData.profile_name.trim()) {
      setError("A Public Profile Display Name is required if your profile is set to Public.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: upsertErr } = await supabase.from('user_settings').upsert({
        user_id: user.id,
        default_country: formData.default_country,
        default_attendee_name: formData.default_attendee_name.trim() || 'Me',
        artist_types: formData.artist_types,
        ecosystems: formData.ecosystems,
        is_public: formData.is_public,
        profile_name: formData.profile_name.trim() || null
      });

      if (upsertErr) throw upsertErr;

      await refreshData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <SettingsIcon size={32} color="var(--text-primary)" />
          <div>
            <h1 style={styles.pageTitle}>Account Settings</h1>
            <p style={styles.pageSubtitle}>Manage your global preferences and category options</p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '800px' }}>
        {error && <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '6px', border: '1px solid #c62828', fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: '500' }}>⚠️ {error}</div>}
        {success && <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '6px', border: '1px solid #2e7d32', fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: '500' }}>✅ Settings saved successfully!</div>}

        <form onSubmit={handleSave} style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0', color: 'var(--text-primary)' }}>Privacy & Community</h2>

            <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: formData.is_public ? '#f0fdf4' : '#f8fafc', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={e => setFormData({ ...formData, is_public: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#22c55e' }}
                />
                <label style={{ fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', color: formData.is_public ? '#166534' : 'var(--text-primary)' }}>Make my Concert Dashboard Public</label>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, paddingLeft: '2.2rem' }}>When public, your dashboard and mapping data will be visible to everyone on the Community page.</p>

              {formData.is_public && (
                <div style={{ paddingLeft: '2.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#166534' }}>Public Profile Display Name *</label>
                  <input
                    style={{ ...styles.inlineInput, width: '100%', maxWidth: '300px', borderColor: '#86efac' }}
                    type="text"
                    placeholder="e.g. Christina's Concerts"
                    value={formData.profile_name}
                    onChange={e => setFormData({ ...formData, profile_name: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0' }}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0', color: 'var(--text-primary)' }}>General Behaviors</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Default Country for New Venues</label>
              <select
                style={{ ...styles.inlineInput, width: '100%', maxWidth: '300px', backgroundColor: '#fff', cursor: 'pointer' }}
                value={formData.default_country}
                onChange={e => setFormData({ ...formData, default_country: e.target.value })}
              >
                <option value="">None</option>
                {COMMON_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Automatically populates the country field when adding new Venues to save keystrokes.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Primary Attendee Name</label>
              <input
                style={{ ...styles.inlineInput, width: '100%', maxWidth: '300px' }}
                type="text"
                placeholder="e.g. Christina"
                required
                value={formData.default_attendee_name}
                onChange={e => setFormData({ ...formData, default_attendee_name: e.target.value })}
              />
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Automatically injected into the Attendees tag box for new concerts.</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0' }}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0', color: 'var(--text-primary)' }}>Artist Categories</h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Define custom dropdown categories for detailed database classification.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Custom Artist Types</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    style={{ ...styles.inlineInput, flex: 1 }}
                    placeholder="e.g. Band, Solo, DJ"
                    value={typeInput}
                    onChange={e => setTypeInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddString('artist_types', formData.artist_types, typeInput, setTypeInput))}
                  />
                  <button type="button" onClick={() => handleAddString('artist_types', formData.artist_types, typeInput, setTypeInput)} style={{ ...styles.actionBtn, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}><Plus size={16} color="#475569" /></button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', border: '1px solid #e2e8f0', minHeight: '60px', padding: '0.5rem', borderRadius: '6px', backgroundColor: '#fafafa', alignContent: 'flex-start' }}>
                  {formData.artist_types.length === 0 && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No types defined.</span>}
                  {formData.artist_types.map(t => (
                    <div key={t} style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#0f172a', gap: '0.3rem' }}>
                      {t}
                      <button type="button" onClick={() => handleRemoveString('artist_types', formData.artist_types, t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Custom Ecosystems</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    style={{ ...styles.inlineInput, flex: 1 }}
                    placeholder="e.g. Local, National, Global"
                    value={ecoInput}
                    onChange={e => setEcoInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddString('ecosystems', formData.ecosystems, ecoInput, setEcoInput))}
                  />
                  <button type="button" onClick={() => handleAddString('ecosystems', formData.ecosystems, ecoInput, setEcoInput)} style={{ ...styles.actionBtn, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}><Plus size={16} color="#475569" /></button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', border: '1px solid #e2e8f0', minHeight: '60px', padding: '0.5rem', borderRadius: '6px', backgroundColor: '#fafafa', alignContent: 'flex-start' }}>
                  {formData.ecosystems.length === 0 && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No ecosystems defined.</span>}
                  {formData.ecosystems.map(t => (
                    <div key={t} style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#0f172a', gap: '0.3rem' }}>
                      {t}
                      <button type="button" onClick={() => handleRemoveString('ecosystems', formData.ecosystems, t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
            <button type="submit" disabled={loading} style={{ ...styles.addBtn, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
