import { FilmCard, FilmCardSkeleton } from './FilmCard';

interface Film {
  id?: number;
  tmdb_id?: number;
  tmdbId?: number;
  title: string;
  poster_path?: string;
  posterPath?: string;
  release_date?: string;
  releaseDate?: string;
  vote_average?: number;
  voteAverage?: number;
  userRating?: number;
  isWatched?: boolean;
  isInWatchlist?: boolean;
}

interface FilmGridProps {
  films: Film[];
  loading?: boolean;
  emptyMessage?: string;
  showActions?: boolean;
  onWatch?: (film: Film) => void;
  onRate?: (film: Film, rating: number) => void;
  onWatchlist?: (film: Film) => void;
  columns?: number;
  ranked?: boolean;
}

export function FilmGrid({
  films,
  loading = false,
  emptyMessage = 'No films found',
  showActions = true,
  onWatch,
  onRate,
  onWatchlist,
  ranked = false,
}: FilmGridProps) {
  if (loading) {
    return (
      <div className="film-grid">
        {Array.from({ length: 12 }, (_, i) => (
          <FilmCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (films.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
        </div>
        <p className="text-gray-400 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="film-grid">
      {films.map((film, index) => (
        <FilmCard
          key={film.id || film.tmdb_id || film.tmdbId || index}
          film={film}
          showActions={showActions}
          onWatch={onWatch ? () => onWatch(film) : undefined}
          onRate={onRate ? (rating) => onRate(film, rating) : undefined}
          onWatchlist={onWatchlist ? () => onWatchlist(film) : undefined}
          rank={ranked ? index + 1 : undefined}
        />
      ))}
    </div>
  );
}

export default FilmGrid;
