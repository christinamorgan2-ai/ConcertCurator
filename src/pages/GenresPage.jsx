import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { sharedTableStyles as styles } from './ConcertsPage';

export const GenresPage = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '' });

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
          <thead><tr><th style={styles.th}>Name</th></tr></thead>
          <tbody>
            {data.genres.length === 0 ? (
              <tr><td style={styles.emptyCell}>No genres found.</td></tr>
            ) : (
              data.genres.sort((a,b) => a.name.localeCompare(b.name)).map(g => (
                <tr key={g.id} style={styles.tr}>
                  <td style={{...styles.td, fontWeight: '500'}}>{g.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
