import React from 'react';
import { ExternalLink } from 'lucide-react';

export const ContactPage = () => {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>About & Contact</h1>
        <p style={styles.paragraph}>
          Concert Curator is a passion project built to help music lovers track, explore, and visualize their live music experiences across concerts, artists, venues, genres, and attendees.
        </p>
        <p style={styles.paragraph}>

          For questions, suggestions, data-related inquiries, or integration concerns, you can contact the developer directly on LinkedIn.
        </p>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Get In Touch</h2>
          <p style={styles.cardText}>
            I'd love to hear from other music fans, data people, developers, or anyone with feedback about the project.

            For technical or data-source questions, please reach out via LinkedIn.
          </p>

          <a
            href="https://www.linkedin.com/in/christina-morgan-mba-predictive-analytics-atlanta/"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.button}
          >
            <ExternalLink size={20} />
            Connect with Christina Morgan on LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: '2rem'
  },
  container: {
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: '1rem'
  },
  paragraph: {
    fontSize: '1.1rem',
    color: '#475569',
    lineHeight: '1.6',
    marginBottom: '3rem'
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '3rem 2rem',
    borderRadius: '16px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: '1rem',
    marginTop: 0
  },
  cardText: {
    fontSize: '1rem',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.5'
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#0a66c2', // LinkedIn blue
    color: '#ffffff',
    textDecoration: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'background-color 0.2s',
  }
};
