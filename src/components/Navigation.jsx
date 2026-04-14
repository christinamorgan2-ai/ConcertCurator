import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListMusic, MapPin, Mic2, Users, Tags, Settings, LogOut, LogIn, Globe } from 'lucide-react';
import { supabase } from '../supabaseClient';

export const Navigation = ({ session }) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.topSection}>
        <div style={styles.brand}>
          <h2>Concert Curator</h2>
        </div>
        <div style={styles.menu}>
          <NavLink to="/" style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}>
            <LayoutDashboard size={20} /><span>Dashboard</span>
          </NavLink>
          
          <NavLink to="/concerts" style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}>
            <ListMusic size={20} /><span>Concerts</span>
          </NavLink>

          <NavLink to="/venues" style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}>
            <MapPin size={20} /><span>Venues</span>
          </NavLink>

          <NavLink to="/artists" style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}>
            <Mic2 size={20} /><span>Artists</span>
          </NavLink>

          <NavLink to="/attendees" style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}>
            <Users size={20} /><span>Attendees</span>
          </NavLink>

          <NavLink to="/genres" style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}>
            <Tags size={20} /><span>Genres</span>
          </NavLink>
        </div>

        <div style={styles.navGroup}>
          <div style={styles.navHeader}>SYSTEM</div>
          <NavLink to="/community" style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}>
            <Globe size={20} /><span>Community</span>
          </NavLink>
          <NavLink to="/settings" style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}>
            <Settings size={20} /><span>Settings</span>
          </NavLink>
        </div>
      </div>

      <div style={styles.bottomSection}>
        {session ? (
          <div style={styles.profileSection}>
            <p style={styles.userEmail}>{session.user.email}</p>
            <button onClick={handleSignOut} style={styles.actionBtn}>
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div style={styles.profileSection}>
            <button onClick={() => navigate('/login')} style={styles.actionBtn}>
              <LogIn size={16} />
              <span>Log In</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    width: '250px',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '2rem 1rem',
    position: 'fixed'
  },
  topSection: {
    display: 'flex',
    flexDirection: 'column'
  },
  bottomSection: {
    borderTop: '1px solid #333333',
    paddingTop: '1rem',
    marginTop: 'auto'
  },
  brand: {
    marginBottom: '3rem',
    padding: '0 1rem',
  },
  menu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    color: '#a3a3a3',
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  activeLink: {
    backgroundColor: '#333333',
    color: '#ffffff',
    fontWeight: '500'
  },
  profileSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  userEmail: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.75rem',
    color: '#a3a3a3',
    padding: '0 1rem',
    wordBreak: 'break-all'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'transparent',
    color: '#a3a3a3',
    border: '1px solid #333333',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%'
  }
};
