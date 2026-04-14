import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Globe, Users } from 'lucide-react';

export const CommunityPage = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPublicProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('user_id, profile_name')
          .eq('is_public', true)
          .not('profile_name', 'is', null);

        if (error) throw error;
        setProfiles(data || []);
      } catch (err) {
        setError("Failed to load community directory.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfiles();
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Globe size={40} color="var(--text-primary)" />
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Community</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Explore the live music ecosystems of other public curators.</p>
        </div>
      </header>

      {error ? (
        <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '6px' }}>{error}</div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Loading community matrix...</div>
      ) : profiles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          No public profiles found yet. Be the first to share yours in Settings!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {profiles.map(profile => (
            <div 
              key={profile.user_id}
              onClick={() => navigate(`/community/${profile.user_id}`)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
            >
              <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '50%', display: 'flex' }}>
                <Users size={24} color="#475569" />
              </div>
              <div style={{flex: 1}}>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#0f172a' }}>{profile.profile_name}</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>View Dashboard →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
