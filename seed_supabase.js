import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

const supabaseUrl = 'https://jojbqbheyxjljunjoidg.supabase.co';
const supabaseKey = 'sb_publishable_7K3oqheKRtD0_q-U9xDTmQ_1CuFo4if';
const supabase = createClient(supabaseUrl, supabaseKey);

const SPREADSHEET_ID = '1DQmEU71hFpPBv5205LlVuElERdHutUk2V5MVOTAlDPs';

const sanitizeData = (dataArray) => {
  return dataArray.map(row => {
    const sanitized = {};
    Object.keys(row).forEach(key => {
      if (key && key.trim() !== '') {
        const newKey = key.replace(/\s+/g, '');
        sanitized[newKey] = row[key];
      }
    });
    return sanitized;
  });
};

const fetchSheetCSV = async (sheetName) => {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
  const response = await fetch(url);
  const text = await response.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      complete: (results) => resolve(sanitizeData(results.data)),
      error: (error) => reject(error)
    });
  });
};

async function seed() {
  try {
    console.log("Fetching sheets...");
    const venues = await fetchSheetCSV('Venue');
    const artists = await fetchSheetCSV('Artist');
    const genres = await fetchSheetCSV('Genre');
    const concerts = await fetchSheetCSV('Concert');
    const artistGenreBridge = await fetchSheetCSV('ArtistGenreBridge');
    const concertArtistBridge = await fetchSheetCSV('ConcertArtistBridge');

    console.log("Seeding Venues...");
    const vPayload = venues.filter(v => v.VenueID).map(v => ({ id: v.VenueID, name: v.VenueName || v.Venue, lat: parseFloat(v.Lat), long: parseFloat(v.Long) }));
    await supabase.from('venues').insert(vPayload);

    console.log("Seeding Artists...");
    const aPayload = artists.filter(a => a.ArtistID).map(a => ({ id: a.ArtistID, name: a.ArtistName || a.Artist }));
    await supabase.from('artists').insert(aPayload);

    console.log("Seeding Genres...");
    const gPayload = genres.filter(g => g.GenreID).map(g => ({ id: g.GenreID, name: g.GenreName || g.Genre }));
    await supabase.from('genres').insert(gPayload);

    console.log("Seeding Concerts...");
    const cPayload = concerts.filter(c => c.ConcertID).map(c => ({
      id: c.ConcertID,
      name: c.ConcertName,
      tour_name: c.TourName,
      date: c.Date,
      venue_id: c.VenueID,
      festival: c.Festival === '1' || c.Festival === 'TRUE'
    }));
    await supabase.from('concerts').insert(cPayload);

    console.log("Seeding ArtistGenreBridge...");
    const agPayload = artistGenreBridge.filter(b => b.ArtistID && b.GenreID).map(b => ({
      artist_id: b.ArtistID,
      genre_id: b.GenreID
    }));
    await supabase.from('artist_genre_bridge').insert(agPayload);

    console.log("Seeding ConcertArtistBridge...");
    const caPayload = concertArtistBridge.filter(b => b.ConcertID && b.ArtistID).map(b => ({
        concert_id: b.ConcertID,
        artist_id: b.ArtistID
    }));
    await supabase.from('concert_artist_bridge').insert(caPayload);

    console.log("Successfully seeded database!");
  } catch (err) {
    console.error("Error seeding:", err);
  }
}

seed();
