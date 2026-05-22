import { fetchArtistMetadata } from './src/utils/musicBrainz.js';
(async () => {
  const result = await fetchArtistMetadata('Fiction Plane');
  console.log(result);
})();
