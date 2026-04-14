import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const usePublicDashboardData = (targetUserId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!targetUserId) return;

    const fetchPublicData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch User Settings to ensure they are public and get their name
        const { data: userSettings, error: usErr } = await supabase
          .from('user_settings')
          .select('is_public, profile_name')
          .eq('user_id', targetUserId)
          .single();

        if (usErr || !userSettings || !userSettings.is_public) {
          throw new Error('This profile is either private or does not exist.');
        }

        const [
          { data: concerts, error: cErr },
          { data: venues, error: vErr },
          { data: genres, error: gErr },
          { data: artistGenreBridge, error: agErr },
          { data: concertArtistBridge, error: caErr },
          { data: artists, error: aErr }
        ] = await Promise.all([
          supabase.from('concerts').select('*').eq('user_id', targetUserId),
          supabase.from('venues').select('*').eq('user_id', targetUserId),
          supabase.from('genres').select('*').eq('user_id', targetUserId),
          supabase.from('artist_genre_bridge').select('*').eq('user_id', targetUserId),
          supabase.from('concert_artist_bridge').select('*').eq('user_id', targetUserId),
          supabase.from('artists').select('*').eq('user_id', targetUserId)
        ]);

        if (cErr || vErr || gErr || agErr || caErr || aErr) {
          throw new Error('Failed to load public data records from Supabase.');
        }

        setData({
          profile_name: userSettings.profile_name,
          concerts: concerts.map(c => ({ ...c, ConcertID: c.id, VenueID: c.venue_id })),
          venues: venues.map(v => ({ ...v, VenueID: v.id, Name: v.name, Lat: v.lat, Long: v.long })),
          artists: artists.map(a => ({ ...a, ArtistID: a.id })),
          genres: genres.map(g => ({ ...g, GenreID: g.id, Name: g.name })),
          artistGenreBridge: artistGenreBridge.map(ag => ({ ...ag, ArtistID: ag.artist_id, GenreID: ag.genre_id })),
          concertArtistBridge: concertArtistBridge.map(ca => ({ ...ca, ConcertID: ca.concert_id, ArtistID: ca.artist_id })),
          // Blank arrays for unused dashboard components
          attendees: [], concertAttendeeBridge: []
        });

      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [targetUserId]);

  return { data, loading, error };
};
