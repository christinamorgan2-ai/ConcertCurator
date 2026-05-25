export const buildGenreNetworkData = (data, nodeThreshold = 1, edgeThreshold = 1) => {
  if (!data || !data.concerts || data.concerts.length === 0) {
    return { nodes: [], links: [] };
  }

  // 1. Normalize genres: Map GenreID to normalized name.
  // We'll group genres by their lowercased, trimmed name.
  const genreMap = {}; // original GenreID -> normalized Name
  const normalizedGenreIdMap = {}; // normalized Name -> primary GenreID
  const genreNameMap = {}; // primary GenreID -> display Name (capitalized)

  (data.genres || []).forEach(g => {
    if (!g.name) return;
    const gId = g.id || g.GenreID;
    const normalizedName = g.name.toLowerCase().trim();
    if (!normalizedGenreIdMap[normalizedName]) {
      normalizedGenreIdMap[normalizedName] = gId;
      // Capitalize first letter of each word for display
      genreNameMap[gId] = normalizedName.replace(/\b\w/g, l => l.toUpperCase());
    }
    genreMap[gId] = normalizedGenreIdMap[normalizedName];
  });

  // 2. Count how many times each artist has been seen.
  // One concert-artist pair = 1 "seen"
  const artistSeenCount = {};
  (data.concertArtistBridge || []).forEach(bridge => {
    artistSeenCount[bridge.ArtistID] = (artistSeenCount[bridge.ArtistID] || 0) + 1;
  });

  // 3. For each artist, gather their normalized genres
  const artistToGenres = {}; // ArtistID -> Set of normalized GenreIDs
  (data.artistGenreBridge || []).forEach(bridge => {
    const normId = genreMap[bridge.GenreID];
    if (normId) {
      if (!artistToGenres[bridge.ArtistID]) {
        artistToGenres[bridge.ArtistID] = new Set();
      }
      artistToGenres[bridge.ArtistID].add(normId);
    }
  });

  // 4. Calculate node sizes, edge weights, and collect artist names
  const nodeSizes = {}; // normalized GenreID -> size
  const nodeArtists = {}; // normalized GenreID -> Set of artist names
  const edgeWeights = {}; // "GenreID1|GenreID2" -> weight

  const artistNameLookup = {};
  (data.artists || []).forEach(a => {
    artistNameLookup[a.id || a.ArtistID] = a.name;
  });

  Object.keys(artistSeenCount).forEach(artistId => {
    const seenCount = artistSeenCount[artistId];
    if (!seenCount) return;

    const genres = Array.from(artistToGenres[artistId] || []);
    
    const artistName = artistNameLookup[artistId] || 'Unknown Artist';
    
    // Add to node size and node artists
    genres.forEach(gId => {
      nodeSizes[gId] = (nodeSizes[gId] || 0) + seenCount;
      if (!nodeArtists[gId]) nodeArtists[gId] = new Set();
      nodeArtists[gId].add(artistName);
    });

    // Add to edge weights (combinations of genres)
    for (let i = 0; i < genres.length; i++) {
      for (let j = i + 1; j < genres.length; j++) {
        // Sort to ensure consistency (source|target vs target|source)
        const sortedPair = [genres[i], genres[j]].sort();
        const edgeKey = `${sortedPair[0]}|${sortedPair[1]}`;
        edgeWeights[edgeKey] = (edgeWeights[edgeKey] || 0) + seenCount;
      }
    }
  });

  // 5. Filter and format
  const nodes = Object.keys(nodeSizes)
    .filter(gId => nodeSizes[gId] >= nodeThreshold)
    .map(gId => ({
      id: gId,
      name: genreNameMap[gId],
      val: nodeSizes[gId],
      artists: Array.from(nodeArtists[gId] || []).sort()
    }));

  const validNodeIds = new Set(nodes.map(n => n.id));

  const links = Object.keys(edgeWeights)
    .map(key => {
      const [source, target] = key.split('|');
      return { source, target, weight: edgeWeights[key] };
    })
    .filter(l => 
      l.weight >= edgeThreshold && 
      validNodeIds.has(l.source) && 
      validNodeIds.has(l.target)
    );

  return { nodes, links };
};
