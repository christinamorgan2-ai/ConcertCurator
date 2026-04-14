import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
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
const ProtectedRoute = ({ session, children }) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const { data, loading, error, refreshData } = useDashboardData();
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      <div style={styles.appLayout}>
        <Navigation session={session} />
        
        <div style={styles.contentArea}>
          <Routes>
            <Route path="/" element={<ProtectedRoute session={session}><DashboardPage data={data} /></ProtectedRoute>} />
            <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
            
            <Route path="/concerts" element={<ProtectedRoute session={session}><ConcertsPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            <Route path="/venues" element={<ProtectedRoute session={session}><VenuesPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            <Route path="/artists" element={<ProtectedRoute session={session}><ArtistsPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            <Route path="/attendees" element={<ProtectedRoute session={session}><AttendeesPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            <Route path="/genres" element={<ProtectedRoute session={session}><GenresPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute session={session}><SettingsPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            
            <Route path="/add" element={<ProtectedRoute session={session}><AddConcertPage data={data} refreshData={refreshData} /></ProtectedRoute>} />
            
            <Route path="/community" element={<ProtectedRoute session={session}><CommunityPage /></ProtectedRoute>} />
            <Route path="/community/:id" element={<ProtectedRoute session={session}><PublicDashboardPage /></ProtectedRoute>} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

const styles = {
  appLayout: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%'
  },
  contentArea: {
    marginLeft: '250px',
    flex: 1,
    backgroundColor: 'var(--bg-color)'
  },
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
  }
};

export default App;
