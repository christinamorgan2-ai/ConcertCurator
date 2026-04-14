import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useDashboardData = () => {
  const [data, setData] = useState({
    concerts: [],
    venues: [],
    artists: [],
    genres: [],
    attendees: [],
    artistGenreBridge: [],
    concertArtistBridge: [],
    concertAttendeeBridge: [],
    userSettings: { default_country: 'USA', default_attendee_name: 'Me', artist_types: [], ecosystems: [] }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Not authenticated');

      const [
        { data: concerts, error: cErr },
        { data: venues, error: vErr },
        { data: artists, error: aErr },
        { data: genres, error: gErr },
        { data: attendees, error: attErr },
        { data: artistGenreBridge, error: agErr },
        { data: concertArtistBridge, error: caErr },
        { data: concertAttendeeBridge, error: cabErr },
        { data: userSettings, error: usErr }
      ] = await Promise.all([
        supabase.from('concerts').select('*').eq('user_id', user.id),
        supabase.from('venues').select('*').eq('user_id', user.id),
        supabase.from('artists').select('*').eq('user_id', user.id),
        supabase.from('genres').select('*').eq('user_id', user.id),
        supabase.from('attendees').select('*').eq('user_id', user.id),
        supabase.from('artist_genre_bridge').select('*').eq('user_id', user.id),
        supabase.from('concert_artist_bridge').select('*').eq('user_id', user.id),
        supabase.from('concert_attendee_bridge').select('*').eq('user_id', user.id),
        supabase.from('user_settings').select('*').eq('user_id', user.id)
      ]);

      if (cErr || vErr || aErr || gErr || attErr || agErr || caErr || cabErr || usErr) {
        throw new Error('Error fetching data from Supabase');
      }

      setData({
        concerts: concerts.map(c => ({ ...c, ConcertID: c.id, VenueID: c.venue_id })),
        venues: venues.map(v => ({ ...v, VenueID: v.id, Name: v.name, Lat: v.lat, Long: v.long })),
        artists: artists.map(a => ({ ...a, ArtistID: a.id })),
        genres: genres.map(g => ({ ...g, GenreID: g.id, Name: g.name })),
        attendees: attendees.map(at => ({ ...at, AttendeeID: at.id })),
        artistGenreBridge: artistGenreBridge.map(ag => ({ ...ag, ArtistID: ag.artist_id, GenreID: ag.genre_id })),
        concertArtistBridge: concertArtistBridge.map(ca => ({ ...ca, ConcertID: ca.concert_id, ArtistID: ca.artist_id })),
        concertAttendeeBridge: concertAttendeeBridge.map(cab => ({ ...cab, ConcertID: cab.concert_id, AttendeeID: cab.attendee_id })),
        userSettings: userSettings && userSettings.length > 0 ? userSettings[0] : { default_country: 'USA', default_attendee_name: 'Me', artist_types: [], ecosystems: [] }
      });
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initially
    fetchDashboardData();

    // Re-fetch automatically whenever the user logs in or out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If signed out, immediately clear out old data locally so it isn't leaked
      if (!session) {
        setData({
          concerts: [], venues: [], artists: [], genres: [], attendees: [],
          artistGenreBridge: [], concertArtistBridge: [], concertAttendeeBridge: []
        });
      } else {
        fetchDashboardData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { data, loading, error, refreshData: fetchDashboardData };
};
