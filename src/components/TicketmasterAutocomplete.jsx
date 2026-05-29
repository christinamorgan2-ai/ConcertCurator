import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Calendar, MapPin } from 'lucide-react';

export const TicketmasterAutocomplete = ({ onSelectEvent, placeholder, style, value, onChange }) => {
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
    const query = value || '';
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/ticketmaster?keyword=${encodeURIComponent(query)}&size=30&sort=relevance,desc`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        
        if (data && data._embedded && data._embedded.events) {
          setResults(data._embedded.events);
          setIsOpen(true);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error("Ticketmaster Search Error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  const handleSelect = (event) => {
    if (onChange) onChange(event.name);
    setIsOpen(false);
    setResults([]);
    
    let date = '';
    let time = '';
    if (event.dates?.start?.localDate) {
      date = event.dates.start.localDate;
    }
    if (event.dates?.start?.localTime) {
      time = event.dates.start.localTime.substring(0, 5); // HH:mm
    }
    
    let venue = null;
    if (event._embedded?.venues && event._embedded.venues.length > 0) {
      const v = event._embedded.venues[0];
      venue = {
        name: v.name,
        city: v.city?.name || '',
        region: v.state?.stateCode || v.state?.name || '',
        country: v.country?.countryCode || v.country?.name || '',
        lat: v.location?.latitude || '',
        long: v.location?.longitude || ''
      };
    }

    let artists = [];
    if (event._embedded?.attractions) {
       artists = event._embedded.attractions.map(a => a.name);
    }
    
    let tourName = '';
    if (event.name && event.name.toLowerCase().includes('tour')) {
       const parts = event.name.split(/\s+-\s+|:\s+|\s+\|\s+/);
       const tourPart = parts.find(p => p.toLowerCase().includes('tour'));
       if (tourPart) {
           tourName = tourPart.trim();
       } else {
           tourName = event.name.trim();
       }
    }

    onSelectEvent({
      name: event.name,
      date,
      time,
      venue,
      artists,
      tourName
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
      <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => {
          if (onChange) onChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        placeholder={placeholder || "Search Ticketmaster or type custom..."}
        style={{ ...style, paddingLeft: '36px', width: '100%' }}
      />
      
      {isLoading && (
        <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center' }}>
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
          {value.trim() && !isLoading && (
            <div
              onClick={() => { setIsOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', padding: '0.75rem', 
                cursor: 'pointer', gap: '0.5rem', color: '#2563eb', fontWeight: '500',
                transition: 'background-color 0.1s', borderBottom: results.length > 0 ? '1px solid #f1f5f9' : 'none'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Use "{value.trim()}" manually (Hit Enter)
            </div>
          )}

          {results.length > 0 ? (
            results.map((event) => {
              const imageUrl = event.images && event.images.length > 0 ? event.images[0].url : null;
              const dateStr = event.dates?.start?.localDate || 'TBD';
              const venueName = event._embedded?.venues?.[0]?.name || 'Unknown Venue';
              const city = event._embedded?.venues?.[0]?.city?.name || '';
              
              return (
                <div
                  key={event.id}
                  onClick={() => handleSelect(event)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '0.75rem', 
                    borderBottom: '1px solid #f1f5f9', cursor: 'pointer', gap: '1rem',
                    transition: 'background-color 0.1s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: '#e2e8f0', overflow: 'hidden', flexShrink: 0 }}>
                    {imageUrl && <img src={imageUrl} alt={event.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '1rem', marginTop: '2px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {dateStr}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><MapPin size={12} /> {venueName}{city ? `, ${city}` : ''}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : !isLoading && value && value.trim() ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
              No Ticketmaster events found for "{value}". You can still save it manually.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
