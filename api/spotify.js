export default async function handler(req, res) {
  // Securely retrieve credentials from environment variables (never exposed to client)
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;

  // To prevent crashing locally if you haven't set up your .env yet
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Missing Spotify API credentials in environment variables.' });
  }

  try {
    // 1. Authenticate with Spotify to get a temporary access token
    const authResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      throw new Error(`Spotify Auth Error: ${errorText}`);
    }

    const { access_token } = await authResponse.json();
    const { type, q } = req.query;

    // 2. Determine which Spotify endpoint to call
    let endpoint = '';
    if (type === 'search') {
      if (!q) return res.status(400).json({ error: 'Missing query parameter for search' });
      // Search for artists and limit to 5 results to keep the dropdown clean
      endpoint = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=5`;
    } else if (type === 'genres') {
      endpoint = `https://api.spotify.com/v1/recommendations/available-genre-seeds`;
    } else {
      return res.status(400).json({ error: 'Invalid type parameter. Use ?type=search or ?type=genres' });
    }

    // 3. Fetch data from Spotify using our secure token
    const dataResponse = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!dataResponse.ok) {
      throw new Error('Spotify API Error');
    }

    let data = await dataResponse.json();

    // 4. Spotify's Search API sometimes drops the 'genres' array. 
    // If this was an artist search, do a quick secondary lookup for the full profiles.
    if (type === 'search' && data.artists && data.artists.items.length > 0) {
      const ids = data.artists.items.map(a => a.id).join(',');
      const fullArtistsRes = await fetch(`https://api.spotify.com/v1/artists?ids=${ids}`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      if (fullArtistsRes.ok) {
        const fullData = await fullArtistsRes.json();
        // Replace the sparse search items with the full rich artist objects
        data.artists.items = fullData.artists;
      }
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("Spotify Proxy Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
