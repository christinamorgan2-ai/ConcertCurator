import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

export const UpdatePasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Supabase automatically parses the hash token from the URL and logs the user in.
  // We can verify they have a session before letting them update the password.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // If they managed to get here without a valid reset token session, kick them to login
        navigate('/login', { replace: true });
      }
    });
  }, [navigate]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setMessage("Password updated successfully! Redirecting...");
      
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
      
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <Lock size={48} color="var(--text-primary)" />
        </div>
        <h1 style={styles.title}>Update Password</h1>
        <p style={styles.subtitle}>
          Enter a new password for your Concert Curator account.
        </p>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {message && <div style={{...styles.errorBanner, backgroundColor: '#e8f5e9', color: '#2e7d32', borderColor: '#c8e6c9'}}>{message}</div>}

        <form onSubmit={handleUpdatePassword} style={styles.formContainer}>
          <input 
            type="password" 
            placeholder="New Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            required
            style={styles.inputField}
          />
          <input 
            type="password" 
            placeholder="Confirm New Password" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)}
            required
            style={styles.inputField}
          />
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    padding: '2rem'
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '430px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  iconContainer: {
    marginBottom: '1rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    margin: '0 0 0.5rem 0'
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    margin: '0 0 2rem 0',
    textAlign: 'center'
  },
  errorBanner: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '6px',
    border: '1px solid #ffcdd2',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  formContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  inputField: {
    width: '100%',
    padding: '0.875rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box'
  },
  submitBtn: {
    width: '100%',
    padding: '0.875rem',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  }
};
