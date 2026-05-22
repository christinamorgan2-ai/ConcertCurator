/**
 * Fetches the top genre tags and earliest release year for an artist from the MusicBrainz API.
 * @param {string} artistName - The exact name of the artist to search.
 * @returns {Promise<{tags: string[], firstAlbumYear: number | null}>}
 */
export const fetchArtistMetadata = async (artistName) => {
  if (!artistName) return { tags: [], firstAlbumYear: null };

  try {
    const query = encodeURIComponent(`"${artistName}"`);
    const endpoint = `https://musicbrainz.org/ws/2/artist/?query=${query}&fmt=json`;

    const response = await fetch(endpoint, {
      headers: {
        'User-Agent': 'ConcertCurator/1.0.0 ( https://concert-curator.vercel.app/contact )',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error("MusicBrainz API returned an error on search:", response.status);
      return { tags: [], firstAlbumYear: null };
    }

    const data = await response.json();

    if (data && data.artists && data.artists.length > 0) {
      const bestMatch = data.artists.find(
        a => a.name.toLowerCase() === artistName.toLowerCase() || 
             (a.aliases && a.aliases.some(alias => alias.name.toLowerCase() === artistName.toLowerCase()))
      );

      const artist = bestMatch || data.artists[0];
      
      let tags = [];
      if (artist && artist.tags && artist.tags.length > 0) {
        const sortedTags = [...artist.tags].sort((a, b) => b.count - a.count);
        tags = sortedTags.slice(0, 5).map(tag => tag.name);
      }

      // Respect MusicBrainz rate limiting (1 request per second)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch release groups for the artist
      const rgEndpoint = `https://musicbrainz.org/ws/2/release-group?artist=${artist.id}&limit=100&fmt=json`;
      const rgResponse = await fetch(rgEndpoint, {
        headers: {
          'User-Agent': 'ConcertCurator/1.0.0 ( https://concert-curator.vercel.app/contact )',
          'Accept': 'application/json'
        }
      });

      let firstAlbumYear = null;
      if (rgResponse.ok) {
        const rgData = await rgResponse.json();
        if (rgData && rgData['release-groups']) {
          // Filter for Album, EP, Single
          const validTypes = ['Album', 'EP', 'Single'];
          
          const years = rgData['release-groups']
            .filter(rg => validTypes.includes(rg['primary-type']))
            .map(rg => rg['first-release-date'])
            .filter(Boolean)
            .map(d => parseInt(d.substring(0, 4)))
            .filter(y => !isNaN(y));

          if (years.length > 0) {
            firstAlbumYear = Math.min(...years);
          }
        }
      }

      return { tags, firstAlbumYear };
    }
    
    return { tags: [], firstAlbumYear: null };
  } catch (error) {
    console.error("Error fetching from MusicBrainz:", error);
    return { tags: [], firstAlbumYear: null };
  }
};
