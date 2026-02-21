const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Get API key from environment
const getApiKey = () => {
  return import.meta.env.VITE_TMDB_API_KEY || '';
};

// Generic fetch function with error handling
async function fetchTMDB(endpoint: string, params: Record<string, string> = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('TMDB API key not configured');
  }

  const queryParams = new URLSearchParams({
    api_key: apiKey,
    language: 'en-US',
    ...params,
  });

  const url = `${TMDB_BASE_URL}${endpoint}?${queryParams}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error(`TMDB API error: ${response.status}`);
  }
  
  return response.json();
}

// Image URLs
export function getPosterUrl(path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500') {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getBackdropUrl(path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280') {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getProfileUrl(path: string | null, size: 'w45' | 'w185' | 'h632' | 'original' = 'w185') {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

// Movie endpoints
export async function getMovieDetails(movieId: number) {
  return fetchTMDB(`/movie/${movieId}`, { append_to_response: 'credits,videos,images' });
}

export async function getTVDetails(tvId: number) {
  return fetchTMDB(`/tv/${tvId}`, { append_to_response: 'credits,videos,images' });
}

export async function searchMovies(query: string, page: number = 1) {
  return fetchTMDB('/search/movie', { query, page: page.toString() });
}

export async function searchTV(query: string, page: number = 1) {
  return fetchTMDB('/search/tv', { query, page: page.toString() });
}

export async function searchMulti(query: string, page: number = 1) {
  return fetchTMDB('/search/multi', { query, page: page.toString() });
}

export async function getTrending(timeWindow: 'day' | 'week' = 'week') {
  return fetchTMDB(`/trending/movie/${timeWindow}`);
}

export async function getPopularMovies(page: number = 1) {
  return fetchTMDB('/movie/popular', { page: page.toString() });
}

export async function getNowPlaying(page: number = 1) {
  return fetchTMDB('/movie/now_playing', { page: page.toString() });
}

export async function getUpcoming(page: number = 1) {
  return fetchTMDB('/movie/upcoming', { page: page.toString() });
}

export async function getTopRated(page: number = 1) {
  return fetchTMDB('/movie/top_rated', { page: page.toString() });
}

export async function getMoviesByGenre(genreId: number, page: number = 1) {
  return fetchTMDB('/discover/movie', { with_genres: genreId.toString(), page: page.toString() });
}

export async function getGenreList() {
  return fetchTMDB('/genre/movie/list');
}

// Get trailer key from videos
export function getTrailerKey(videos: { results: Array<{ type: string; site: string; key: string }> }) {
  if (!videos || !videos.results) return null;
  
  const trailer = videos.results.find(
    (video) => video.type === 'Trailer' && video.site === 'YouTube'
  );
  
  return trailer?.key || null;
}

// Get director from credits
export function getDirector(credits: { crew: Array<{ job: string; name: string }> }) {
  if (!credits || !credits.crew) return null;
  
  const director = credits.crew.find((person) => person.job === 'Director');
  return director?.name || null;
}

// Get top cast
export function getTopCast(credits: { cast: Array<{ name: string; profile_path: string; character: string }> }, limit: number = 5) {
  if (!credits || !credits.cast) return [];
  return credits.cast.slice(0, limit);
}

// Format runtime
export function formatRuntime(minutes: number): string {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

// Format year
export function formatYear(dateString: string): string {
  if (!dateString) return '';
  return new Date(dateString).getFullYear().toString();
}

// Cache helpers
const CACHE_PREFIX = 'tmdb_cache_';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export function getCachedData<T>(key: string): T | null {
  try {
    const cached = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setCachedData<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // Ignore cache errors
  }
}

// Batch fetch movies by IDs
export async function fetchMoviesBatch(ids: number[]): Promise<Record<number, unknown>> {
  const results: Record<number, unknown> = {};
  const batchSize = 10;
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const promises = batch.map(async (id) => {
      // Check cache first
      const cached = getCachedData(`movie_${id}`);
      if (cached) {
        results[id] = cached;
        return;
      }
      
      try {
        const data = await getMovieDetails(id);
        setCachedData(`movie_${id}`, data);
        results[id] = data;
      } catch (error) {
        console.error(`Failed to fetch movie ${id}:`, error);
      }
    });
    
    await Promise.all(promises);
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < ids.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

export default {
  getMovieDetails,
  getTVDetails,
  searchMovies,
  searchTV,
  searchMulti,
  getTrending,
  getPopularMovies,
  getNowPlaying,
  getUpcoming,
  getTopRated,
  getMoviesByGenre,
  getGenreList,
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
  getTrailerKey,
  getDirector,
  getTopCast,
  formatRuntime,
  formatYear,
  fetchMoviesBatch,
  getCachedData,
  setCachedData,
};
