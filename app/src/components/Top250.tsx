import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Filter } from 'lucide-react';
import { useMoviesBatch } from '@/hooks/useTMDB';
import { UNIQUE_TOP_250_TMDB_IDS } from '@/data/top250';
import { getPosterUrl, formatYear } from '@/utils/tmdb';
import { FilmCardSkeleton } from './FilmCard';
import { StarRating } from './StarRating';

export function Top250() {
  const [sortBy, setSortBy] = useState<'rank' | 'rating' | 'year'>('rank');
  const { data: movies, loading, progress } = useMoviesBatch(UNIQUE_TOP_250_TMDB_IDS.slice(0, 50));

  interface MovieData {
    tmdbId: number;
    title?: string;
    poster_path?: string;
    release_date?: string;
    vote_average?: number;
  }

  const sortedMovies = Object.entries(movies)
    .map(([tmdbId, movie]: [string, unknown]) => ({
      tmdbId: parseInt(tmdbId),
      ...(movie as Record<string, unknown>),
    } as MovieData))
    .sort((a, b) => {
      if (sortBy === 'rating') {
        return ((b.vote_average || 0) - (a.vote_average || 0));
      }
      if (sortBy === 'year') {
        return (new Date(b.release_date || 0).getFullYear() || 0) - 
               (new Date(a.release_date || 0).getFullYear() || 0);
      }
      // Default: by rank (original order)
      return UNIQUE_TOP_250_TMDB_IDS.indexOf(a.tmdbId) - UNIQUE_TOP_250_TMDB_IDS.indexOf(b.tmdbId);
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#E8C547]" />
            Top 250 Films
          </h2>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#E8C547] to-[#00C8FF] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-400 text-center">
          Loading films... {Math.round(progress)}%
        </p>
        
        <div className="film-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <FilmCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-[#E8C547]" />
          Top 250 Films
        </h2>
        
        {/* Sort options */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'rank' | 'rating' | 'year')}
            className="input-dark text-sm py-1.5"
          >
            <option value="rank">Sort by Rank</option>
            <option value="rating">Sort by Rating</option>
            <option value="year">Sort by Year</option>
          </select>
        </div>
      </div>

      {/* Films list */}
      <div className="space-y-3">
        {sortedMovies.map((movie, index) => {
          const rank = sortBy === 'rank' ? index + 1 : UNIQUE_TOP_250_TMDB_IDS.indexOf(movie.tmdbId) + 1;
          const posterUrl = getPosterUrl(movie.poster_path || null, 'w92');
          const year = formatYear(movie.release_date as string);

          return (
            <Link
              key={movie.tmdbId}
              to={`/film/${movie.tmdbId}`}
              className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
            >
              {/* Rank */}
              <div className="w-12 text-center">
                <span className="rank-number text-2xl">{rank}</span>
              </div>

              {/* Poster */}
              <div className="w-12 h-18 flex-shrink-0">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={movie.title as string}
                    className="w-full h-full object-cover rounded"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-white/10 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-500">No poster</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white group-hover:text-[#E8C547] transition-colors truncate">
                  {movie.title as string}
                </h3>
                <p className="text-sm text-gray-400">{year}</p>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <StarRating
                    rating={(movie.vote_average as number) / 2}
                    size="sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(movie.vote_average as number)?.toFixed(1)}/10
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* View all link */}
      <div className="text-center pt-4">
        <Link
          to="/top250"
          className="inline-flex items-center gap-2 text-[#E8C547] hover:text-[#b89d35] transition-colors"
        >
          View all 250 films
          <TrendingUp className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default Top250;
