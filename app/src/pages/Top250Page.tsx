import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Filter, ChevronLeft, Star, Calendar } from 'lucide-react';
import { useMoviesBatch } from '@/hooks/useTMDB';
import { UNIQUE_TOP_250_TMDB_IDS } from '@/data/top250';
import { getPosterUrl, getBackdropUrl, formatYear } from '@/utils/tmdb';
import { FilmCardSkeleton } from '@/components/FilmCard';
import { Credits } from '@/components/Credits';

type SortOption = 'rank' | 'rating' | 'year' | 'popularity';

export function Top250Page() {
  const [sortBy, setSortBy] = useState<SortOption>('rank');
  const [visibleCount, setVisibleCount] = useState(50);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const visibleIds = useMemo(() => UNIQUE_TOP_250_TMDB_IDS.slice(0, visibleCount), [visibleCount]);
  const { data: movies, loading, progress } = useMoviesBatch(visibleIds);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < UNIQUE_TOP_250_TMDB_IDS.length) {
          setVisibleCount(prev => Math.min(prev + 50, UNIQUE_TOP_250_TMDB_IDS.length));
        }
      },
      { rootMargin: '100px' }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [visibleCount]);

  interface MovieData {
    tmdbId: number;
    title?: string;
    poster_path?: string;
    backdrop_path?: string;
    release_date?: string;
    vote_average?: number;
    vote_count?: number;
    runtime?: number;
    popularity?: number;
    overview?: string;
    genres?: { id: number; name: string }[];
  }

  const sortedMovies = Object.entries(movies)
    .map(([tmdbId, movie]: [string, unknown]) => ({
      tmdbId: parseInt(tmdbId),
      ...(movie as Record<string, unknown>),
    } as MovieData))
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating': return (b.vote_average || 0) - (a.vote_average || 0);
        case 'year':
          return (new Date(b.release_date || 0).getFullYear() || 0) -
                 (new Date(a.release_date || 0).getFullYear() || 0);
        case 'popularity': return (b.popularity || 0) - (a.popularity || 0);
        default:
          return UNIQUE_TOP_250_TMDB_IDS.indexOf(a.tmdbId) - UNIQUE_TOP_250_TMDB_IDS.indexOf(b.tmdbId);
      }
    });

  return (
    <div className="min-h-screen pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8 text-[#E8C547]" />
                Top 250 Films
              </h1>
              <p className="text-gray-400">The highest-rated films of all time</p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="input-dark text-sm py-2"
              >
                <option value="rank">Sort by Rank</option>
                <option value="rating">Sort by Rating</option>
                <option value="year">Sort by Year</option>
                <option value="popularity">Sort by Popularity</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && sortedMovies.length === 0 && (
          <div className="space-y-6">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#E8C547] to-[#00C8FF] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 text-center">Loading films... {Math.round(progress)}%</p>
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* Films list — landscape cards */}
        <div className="space-y-3">
          {sortedMovies.map((movie, index) => {
            const rank = sortBy === 'rank'
              ? UNIQUE_TOP_250_TMDB_IDS.indexOf(movie.tmdbId) + 1
              : index + 1;
            const backdropUrl = getBackdropUrl(movie.backdrop_path as string, 'w780');
            const posterUrl = getPosterUrl(movie.poster_path as string, 'w92');
            const year = formatYear(movie.release_date as string);

            return (
              <Link
                key={movie.tmdbId}
                to={`/film/${movie.tmdbId}`}
                className="group relative flex items-center gap-0 rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl"
                style={{ minHeight: '100px' }}
              >
                {/* Backdrop banner */}
                {backdropUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-300"
                    style={{ backgroundImage: `url(${backdropUrl})` }}
                  />
                ) : null}
                {/* Left gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b]/90 via-[#0a0a0b]/60 to-transparent" />

                {/* Content */}
                <div className="relative z-10 flex items-center gap-4 p-4 w-full">
                  {/* Rank */}
                  <div className="w-12 sm:w-14 text-center flex-shrink-0">
                    <span className={`text-2xl sm:text-3xl font-bold ${
                      rank <= 3 ? 'text-[#E8C547]' : rank <= 10 ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {rank}
                    </span>
                  </div>

                  {/* Poster */}
                  <div className="w-12 sm:w-14 flex-shrink-0">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={movie.title}
                        className="w-full aspect-[2/3] object-cover rounded shadow-lg"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-white/10 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-500">—</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-[#E8C547] transition-colors truncate text-base sm:text-lg">
                      {movie.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {year}
                      </span>
                      {(movie.runtime as number) > 0 && (
                        <span>{Math.floor((movie.runtime as number) / 60)}h {(movie.runtime as number) % 60}m</span>
                      )}
                      {movie.genres && movie.genres.length > 0 && (
                        <span className="hidden sm:block text-gray-500 truncate">
                          {movie.genres.slice(0, 2).map(g => g.name).join(' · ')}
                        </span>
                      )}
                    </div>
                    {movie.overview && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1 hidden sm:block">
                        {movie.overview}
                      </p>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="text-right flex-shrink-0 pr-2">
                    <div className="flex items-center gap-1 justify-end">
                      <Star className="w-4 h-4 text-[#E8C547] fill-[#E8C547]" />
                      <span className="font-semibold text-white text-base">
                        {(movie.vote_average as number)?.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(movie.vote_count as number)?.toLocaleString()} votes
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Load more trigger */}
        {visibleCount < UNIQUE_TOP_250_TMDB_IDS.length && (
          <div ref={loadMoreRef} className="py-8 text-center">
            <div className="inline-flex items-center gap-2 text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              Loading more films...
            </div>
          </div>
        )}

        {visibleCount >= UNIQUE_TOP_250_TMDB_IDS.length && sortedMovies.length > 0 && (
          <div className="py-8 text-center text-gray-500">
            You've reached the end of the Top 250
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Credits />
      </div>
    </div>
  );
}

export default Top250Page;