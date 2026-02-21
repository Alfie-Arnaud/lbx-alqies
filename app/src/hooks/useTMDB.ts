import { useState, useEffect, useCallback } from 'react';
import * as tmdb from '@/utils/tmdb';

// Hook for searching movies/TV
export function useSearch(query: string, page: number = 1) {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const results = await tmdb.searchMulti(query, page);
        setData(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchData, 300);
    return () => clearTimeout(timeoutId);
  }, [query, page]);

  return { data, loading, error };
}

// Hook for movie details
export function useMovieDetails(movieId: number | null) {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!movieId) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Check cache first
        const cached = tmdb.getCachedData(`movie_${movieId}`);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
        
        const results = await tmdb.getMovieDetails(movieId);
        tmdb.setCachedData(`movie_${movieId}`, results);
        setData(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load movie');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [movieId]);

  return { data, loading, error };
}

// Hook for trending movies
export function useTrending(timeWindow: 'day' | 'week' = 'week') {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const cached = tmdb.getCachedData(`trending_${timeWindow}`);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
        
        const results = await tmdb.getTrending(timeWindow);
        tmdb.setCachedData(`trending_${timeWindow}`, results);
        setData(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trending');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeWindow]);

  return { data, loading, error };
}

// Hook for popular movies
export function usePopularMovies(page: number = 1) {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const cached = tmdb.getCachedData(`popular_${page}`);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
        
        const results = await tmdb.getPopularMovies(page);
        tmdb.setCachedData(`popular_${page}`, results);
        setData(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load popular movies');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  return { data, loading, error };
}

// Hook for batch fetching movies (for Top 250)
export function useMoviesBatch(ids: number[]) {
  const [data, setData] = useState<Record<number, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) {
      setData({});
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setProgress(0);
      
      try {
        const results: Record<number, unknown> = {};
        const batchSize = 10;
        
        for (let i = 0; i < ids.length; i += batchSize) {
          const batch = ids.slice(i, i + batchSize);
          
          await Promise.all(
            batch.map(async (id) => {
              // Check cache first
              const cached = tmdb.getCachedData(`movie_${id}`);
              if (cached) {
                results[id] = cached;
                return;
              }
              
              try {
                const movieData = await tmdb.getMovieDetails(id);
                tmdb.setCachedData(`movie_${id}`, movieData);
                results[id] = movieData;
              } catch (err) {
                console.error(`Failed to fetch movie ${id}:`, err);
              }
            })
          );
          
          setProgress(Math.min(((i + batchSize) / ids.length) * 100, 100));
          
          // Delay between batches
          if (i + batchSize < ids.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        setData(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load movies');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ids]);

  return { data, loading, progress, error };
}

// Hook for genres
export function useGenres() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const cached = tmdb.getCachedData('genres');
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
        
        const results = await tmdb.getGenreList();
        tmdb.setCachedData('genres', results);
        setData(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load genres');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

export default {
  useSearch,
  useMovieDetails,
  useTrending,
  usePopularMovies,
  useMoviesBatch,
  useGenres,
};
