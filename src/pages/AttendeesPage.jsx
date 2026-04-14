import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { sharedTableStyles as styles } from './ConcertsPage';

export const AttendeesPage = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('attendees').insert([{ id: crypto.randomUUID(), name: formData.name }]);
      if (error) throw error;
      setFormData({ name: '' });
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
          style={styles.inlineInput} placeholder="Attendee Name" required
          value={formData.name} onChange={e => setFormData({name: e.target.value})} 
        />
        <button type="submit" disabled={loading} style={styles.addBtn}>
          {loading ? 'Adding...' : 'Add Attendee'}
        </button>
      </form>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead><tr><th style={styles.th}>Name</th><th style={styles.th}>Concerts Attended With</th></tr></thead>
          <tbody>
            {data.attendees.length === 0 ? (
              <tr><td colSpan="2" style={styles.emptyCell}>No attendees found.</td></tr>
            ) : (
              data.attendees.sort((a,b) => a.name.localeCompare(b.name)).map(att => {
                const concertCount = data.concertAttendeeBridge.filter(b => b.attendee_id === att.id).length;
                return (
                  <tr key={att.id} style={styles.tr}>
                    <td style={{...styles.td, fontWeight: '500'}}>{att.name}</td>
                    <td style={styles.td}>{concertCount}</td>
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
