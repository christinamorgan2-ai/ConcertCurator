/**
 * Fetches the top genre tags for an artist from the MusicBrainz API.
 * @param {string} artistName - The exact name of the artist to search.
 * @returns {Promise<string[]>} - An array of the top 5 genre tags, or empty array if none found.
 */
export const fetchArtistGenres = async (artistName) => {
  if (!artistName) return [];

  try {
    // We encode the query to ensure special characters like '+' or '&' don't break the URL.
    const query = encodeURIComponent(`"${artistName}"`);
    const endpoint = `https://musicbrainz.org/ws/2/artist/?query=${query}&fmt=json`;

    const response = await fetch(endpoint, {
      headers: {
        'User-Agent': 'ConcertCurator/1.0.0 ( https://concert-curator.vercel.app/contact )',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error("MusicBrainz API returned an error:", response.status);
      return [];
    }

    const data = await response.json();

    if (data && data.artists && data.artists.length > 0) {
      // Find the best match. We'll take the first one since it's scored by relevance,
      // but ensure we only use it if it closely matches the requested name.
      const bestMatch = data.artists.find(
        a => a.name.toLowerCase() === artistName.toLowerCase() || 
             (a.aliases && a.aliases.some(alias => alias.name.toLowerCase() === artistName.toLowerCase()))
      );

      const artist = bestMatch || data.artists[0];

      if (artist && artist.tags && artist.tags.length > 0) {
        // Sort tags by count descending to get the most popular genres/tags
        const sortedTags = [...artist.tags].sort((a, b) => b.count - a.count);
        
        // Take the top 5 tags and return just their names
        return sortedTags.slice(0, 5).map(tag => tag.name);
      }
    }
    return [];
  } catch (error) {
    console.error("Error fetching from MusicBrainz:", error);
    return [];
  }
};
