import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserCircle } from 'lucide-react';

export const LoginPage = ({ onGuestLogin }) => {
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  
  // Email Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOAuthSignIn = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || `Failed to authenticate with ${provider}`);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Success! Check your email for the confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <UserCircle size={48} color="var(--text-primary)" />
        </div>
        <h1 style={styles.title}>Welcome to Concert Curator</h1>
        <p style={styles.subtitle}>
          Sign in or create an account to add and track concerts. Just evaluating? Explore the app in Guest Mode—no account required.
        </p>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {message && <div style={{...styles.errorBanner, backgroundColor: '#e8f5e9', color: '#2e7d32', borderColor: '#c8e6c9'}}>{message}</div>}

        <form onSubmit={handleEmailAuth} style={styles.formContainer}>
          <input 
            type="email" 
            placeholder="Email address" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            required
            style={styles.inputField}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            required
            style={styles.inputField}
          />
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
          
          <div style={styles.toggleTextContainer}>
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={styles.toggleBtn}>
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </button>
          </div>
        </form>

        <div style={styles.dividerContainer}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>OR</span>
          <div style={styles.dividerLine} />
        </div>

        <div style={styles.oauthContainer}>
          <button 
            type="button"
            onClick={() => handleOAuthSignIn('google')} 
            style={styles.oauthBtn}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" style={styles.oauthIcon}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div style={styles.dividerContainer}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>OR</span>
          <div style={styles.dividerLine} />
        </div>

        <button 
          type="button"
          onClick={onGuestLogin}
          style={styles.guestBtn}
        >
          <UserCircle size={20} style={styles.oauthIcon} />
          Explore in Guest Mode
        </button>
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
  },
  toggleTextContainer: {
    textAlign: 'center',
    marginTop: '0.25rem',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#475569',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: '0.875rem'
  },
  oauthContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  oauthBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '0.875rem',
    backgroundColor: '#ffffff',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  oauthIcon: {
    marginRight: '0.75rem'
  },
  dividerContainer: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    margin: '1.5rem 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'var(--border-color)',
  },
  dividerText: {
    padding: '0 0.75rem',
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
  guestBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '0.875rem',
    backgroundColor: '#f5f5f5',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  }
};
