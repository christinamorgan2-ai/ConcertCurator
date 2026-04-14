import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserCircle } from 'lucide-react';

export const LoginPage = () => {
  const [error, setError] = useState(null);

  const handleOAuthSignIn = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
    } catch (err) {
      setError(err.message || `Failed to authenticate with ${provider}`);
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
          Sign in or create an account using your preferred provider
        </p>

        {error && <div style={styles.errorBanner}>{error}</div>}

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

          <button 
            type="button"
            onClick={() => handleOAuthSignIn('apple')} 
            style={styles.oauthBtn}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" style={styles.oauthIcon}>
              <path d="M16.365 1.43c0 0-2.049-.155-3.844 1.25-.831.65-1.483 1.547-1.458 2.505 0 0 2.227.026 3.868-1.298.667-.538 1.144-1.343 1.434-2.457zM17.158 5.485c-1.391-.013-3.111.956-4.148.956-1.077 0-2.585-.92-3.882-.92-1.745 0-3.355.955-4.249 2.493-1.808 3.12-.462 7.712 1.3 10.231.867 1.242 1.884 2.617 3.23 2.593 1.306-.025 1.815-.815 3.393-.815 1.577 0 2.036.815 3.417.788 1.405-.026 2.279-1.241 3.118-2.467.973-1.411 1.378-2.775 1.403-2.846-.032-.014-2.667-1.015-2.695-4.07-.027-2.553 2.083-3.791 2.181-3.845-1.196-1.733-3.056-1.96-3.719-2.001z" fill="#000000"/>
            </svg>
            Continue with Apple
          </button>
        </div>
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
    maxWidth: '400px',
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
  oauthContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: '0.75rem'
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
  }
};
