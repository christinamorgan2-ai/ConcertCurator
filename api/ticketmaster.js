export default async function handler(req, res) {
  const { TICKETMASTER_API_KEY } = process.env;

  if (!TICKETMASTER_API_KEY) {
    return res.status(500).json({ error: 'Missing Ticketmaster API credentials in environment variables.' });
  }

  const { keyword, size = '30', sort = 'relevance,desc' } = req.query;

  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ error: 'Missing keyword query parameter.' });
  }

  const ticketmasterUrl = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(keyword)}&apikey=${encodeURIComponent(TICKETMASTER_API_KEY)}&size=${encodeURIComponent(size)}&sort=${encodeURIComponent(sort)}`;

  try {
    const response = await fetch(ticketmasterUrl);
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status || 500).json({ error: `Ticketmaster API Error: ${errorText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Ticketmaster Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
