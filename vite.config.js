import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const vercelApiMock = () => ({
  name: 'vercel-api-mock',
  configureServer(server) {
    server.middlewares.use('/api/spotify', async (req, res) => {
      // Load all env vars including .env.local
      const env = loadEnv('', process.cwd(), '');
      const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = env;

      if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing Spotify API credentials' }));
        return;
      }

      try {
        const authResponse = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
          },
          body: 'grant_type=client_credentials'
        });

        if (!authResponse.ok) throw new Error('Spotify Auth Error');
        const { access_token } = await authResponse.json();

        // Parse query params since req.originalUrl contains the full path
        const url = new URL(req.originalUrl || req.url, `http://${req.headers.host}`);
        const type = url.searchParams.get('type');
        const q = url.searchParams.get('q');

        let endpoint = '';
        if (type === 'search') {
          if (!q) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing query parameter' }));
            return;
          }
          endpoint = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=5`;
        } else if (type === 'genres') {
          endpoint = `https://api.spotify.com/v1/recommendations/available-genre-seeds`;
        } else {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid type parameter' }));
          return;
        }

        const dataResponse = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${access_token}` }
        });

        if (!dataResponse.ok) throw new Error('Spotify API Error');
        let data = await dataResponse.json();

        if (type === 'search' && data.artists && data.artists.items.length > 0) {
          const ids = data.artists.items.map(a => a.id).join(',');
          const fullArtistsRes = await fetch(`https://api.spotify.com/v1/artists?ids=${ids}`, {
            headers: { 'Authorization': `Bearer ${access_token}` }
          });
          if (fullArtistsRes.ok) {
            const fullData = await fullArtistsRes.json();
            data.artists.items = fullData.artists;
          }
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      } catch (error) {
        console.error("Spotify Proxy Error:", error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiMock()],
})
