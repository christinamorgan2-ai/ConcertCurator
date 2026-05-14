import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Plus } from 'lucide-react';

export const SpotifyArtistAutocomplete = ({ onSelectArtist, placeholder, style }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/spotify?type=search&q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        
        if (data && data.artists && data.artists.items) {
          setResults(data.artists.items);
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Spotify Search Error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (artist) => {
    onSelectArtist({ 
      name: artist.name, 
      genres: artist.genres || [],
      followers: artist.followers?.total || null
    });
    setQuery('');
    setIsOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        handleSelect({ name: query.trim(), genres: [] });
      }
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
      <Search size={16} color="#94a3b8" style={{ marginRight: '8px', flexShrink: 0 }} />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        placeholder={placeholder || "Search Spotify for an artist..."}
        style={{ ...style, flex: 1 }}
      />
      
      {isLoading && (
        <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
          <Loader2 size={16} color="#94a3b8" className="lucide-spin" />
        </div>
      )}

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, 
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0', 
          borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
          marginTop: '8px', zIndex: 50, maxHeight: '300px', overflowY: 'auto'
        }}>
          {query.trim() && !isLoading && (
            <div
              onClick={() => handleSelect({ name: query.trim(), genres: [] })}
              style={{
                display: 'flex', alignItems: 'center', padding: '0.75rem', 
                cursor: 'pointer', gap: '0.5rem', color: '#2563eb', fontWeight: '500',
                transition: 'background-color 0.1s', borderBottom: results.length > 0 ? '1px solid #f1f5f9' : 'none'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Plus size={16} />
              Add "{query.trim()}" manually
            </div>
          )}

          {results.length > 0 ? (
            results.map((artist) => {
              const imageUrl = artist.images && artist.images.length > 0 ? artist.images[artist.images.length - 1].url : null;
              return (
                <div
                  key={artist.id}
                  onClick={() => handleSelect(artist)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '0.75rem', 
                    borderBottom: '1px solid #f1f5f9', cursor: 'pointer', gap: '1rem',
                    transition: 'background-color 0.1s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>?</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {artist.genres && artist.genres.length > 0 ? artist.genres.slice(0, 3).join(', ') : ''}
                    </div>
                  </div>
                </div>
              );
            })
          ) : !isLoading && query.trim() ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
              No Spotify artists found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
