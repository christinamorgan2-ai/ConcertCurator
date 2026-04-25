import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListMusic, MapPin, Mic2, Users, Tags, Settings, LogOut, LogIn, Globe, Menu } from 'lucide-react';
import { supabase } from '../supabaseClient';

export const Navigation = ({ session, guestMode, onExitGuestMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const toggleNav = () => setMobileOpen(!mobileOpen);
  const closeNav = () => setMobileOpen(false);

  // Close nav when route changes
  useEffect(() => {
    closeNav();
  }, [location.pathname]);

  const navItem = (to, Icon, label, disabled) => {
    const content = (
      <>
        <Icon size={20} /><span>{label}</span>
      </>
    );

    if (disabled) {
      return (
        <div 
          style={{ ...styles.link, ...styles.disabledLink }} 
          title="Available for authenticated users only. Sign in to access."
        >
          {content}
        </div>
      );
    }

    return (
      <NavLink 
        to={to} 
        onClick={closeNav} 
        style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
      >
        {content}
      </NavLink>
    );
  };

  if (location.pathname === '/login' || location.pathname === '/update-password') {
    return null;
  }

  return (
    <>
      <button className="mobile-nav-toggle" onClick={toggleNav}>
        <Menu size={24} />
      </button>
      
      <div className={`nav-overlay ${mobileOpen ? 'open' : ''}`} onClick={closeNav}></div>

      <nav className={`sidebar-nav ${mobileOpen ? 'open' : ''}`}>
        <div style={styles.topSection}>
          <div style={styles.brand}>
            <h2>Concert Curator</h2>
          </div>
          <div style={styles.menu}>
            {navItem("/", LayoutDashboard, "Dashboard", guestMode)}
            {navItem("/concerts", ListMusic, "Concerts", guestMode)}
            {navItem("/venues", MapPin, "Venues", guestMode)}
            {navItem("/artists", Mic2, "Artists", guestMode)}
            {navItem("/attendees", Users, "Attendees", guestMode)}
            {navItem("/genres", Tags, "Genres", guestMode)}
          </div>

          <div style={styles.navGroup}>
            <div style={styles.navHeader}>SYSTEM</div>
            {navItem("/community", Globe, "Community", false)}
            {navItem("/settings", Settings, "Settings", guestMode)}
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
              <button onClick={() => {
                if (guestMode && onExitGuestMode) {
                  onExitGuestMode();
                }
                navigate('/login');
              }} style={styles.actionBtn}>
                <LogIn size={16} />
                <span>Log In</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

const styles = {
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
  disabledLink: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  navGroup: {
    marginTop: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  navHeader: {
    fontSize: '0.7rem',
    fontWeight: 'bold',
    color: '#666',
    padding: '0 1rem',
    marginBottom: '0.5rem',
    letterSpacing: '1px'
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
