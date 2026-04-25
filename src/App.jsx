import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Plus } from 'lucide-react';
import { useDashboardData } from './hooks/useDashboardData';
import { Navigation } from './components/Navigation';
import { DashboardPage } from './pages/DashboardPage';
import { AddConcertPage } from './pages/AddConcertPage';
import { LoginPage } from './pages/LoginPage';

import { ConcertsPage } from './pages/ConcertsPage';
import { VenuesPage } from './pages/VenuesPage';
import { ArtistsPage } from './pages/ArtistsPage';
import { AttendeesPage } from './pages/AttendeesPage';
import { GenresPage } from './pages/GenresPage';
import { SettingsPage } from './pages/SettingsPage';
import { CommunityPage } from './pages/CommunityPage';
import { PublicDashboardPage } from './pages/PublicDashboardPage';

// Simple Route Guard
const ProtectedRoute = ({ session, guestMode, guestAllowed, children }) => {
  if (!session && !guestMode) {
    return <Navigate to="/login" replace />;
  }
  if (guestMode && !guestAllowed) {
    return <Navigate to="/community" replace />;
  }
  return children;
};

function App() {
  const { data, loading, error, refreshData } = useDashboardData();
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(() => localStorage.getItem('guestMode') === 'true');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setGuestMode(false);
        localStorage.removeItem('guestMode');
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setGuestMode(false);
        localStorage.removeItem('guestMode');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGuestLogin = () => {
    setGuestMode(true);
    localStorage.setItem('guestMode', 'true');
  };

  const handleExitGuestMode = () => {
    setGuestMode(false);
    localStorage.removeItem('guestMode');
  };

  if (loading || authLoading) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.spinner}></div>
        <p>Loading Application...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.errorBox}>
          <h3>Error loading data</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navigation session={session} guestMode={guestMode} onExitGuestMode={handleExitGuestMode} />
        
        <div className="content-area">
          {guestMode && (
            <div style={styles.guestBanner}>
              You're in Guest Mode — exploring a read-only version of the app. Sign in anytime to track your own concerts and preferences.
            </div>
          )}
          
          {(session || guestMode) && !guestMode && (
            <Link to="/add" className="fab" title="Log New Concert">
              <Plus size={28} />
            </Link>
          )}

          <Routes>
            <Route path="/" element={<ProtectedRoute session={session} guestMode={guestMode} guestAllowed={false}><DashboardPage data={data} /></ProtectedRoute>} />
            <Route path="/login" element={session ? <Navigate to="/" replace /> : guestMode ? <Navigate to="/community" replace /> : <LoginPage onGuestLogin={handleGuestLogin} />} />
            
            <Route path="/concerts" element={<ProtectedRoute session={session} guestMode={guestMode} guestAllowed={false}><ConcertsPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            <Route path="/venues" element={<ProtectedRoute session={session} guestMode={guestMode} guestAllowed={false}><VenuesPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            <Route path="/artists" element={<ProtectedRoute session={session} guestMode={guestMode} guestAllowed={false}><ArtistsPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            <Route path="/attendees" element={<ProtectedRoute session={session} guestMode={guestMode} guestAllowed={false}><AttendeesPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            <Route path="/genres" element={<ProtectedRoute session={session} guestMode={guestMode} guestAllowed={false}><GenresPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute session={session} guestMode={guestMode} guestAllowed={false}><SettingsPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            
            <Route path="/add" element={<ProtectedRoute session={session} guestMode={guestMode} guestAllowed={false}><AddConcertPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            
            <Route path="/community" element={<ProtectedRoute session={session} guestMode={guestMode} guestAllowed={true}><CommunityPage /></ProtectedRoute>} />
            <Route path="/community/:id" element={<ProtectedRoute session={session} guestMode={guestMode} guestAllowed={true}><PublicDashboardPage /></ProtectedRoute>} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

const styles = {
  centerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%'
  },
  errorBox: {
    padding: '2rem',
    border: '1px solid #ffcdd2',
    backgroundColor: '#ffebee',
    borderRadius: '8px',
    color: '#c62828'
  },
  spinner: {
    border: '4px solid rgba(0,0,0,0.1)',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    borderLeftColor: 'var(--accent-color)',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  guestBanner: {
    backgroundColor: '#333',
    color: '#fff',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    textAlign: 'center',
    fontSize: '0.9rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #444',
  }
};

export default App;
