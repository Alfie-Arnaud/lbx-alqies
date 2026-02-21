import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Plus, Check, Star } from 'lucide-react';
import { getPosterUrl } from '@/utils/tmdb';
import { StarRating } from './StarRating';

interface FilmCardProps {
  film: {
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
  };
  showActions?: boolean;
  onWatch?: () => void;
  onRate?: (rating: number) => void;
  onWatchlist?: () => void;
  size?: 'sm' | 'md' | 'lg';
  rank?: number;
}

const sizeConfig = {
  sm: { width: 100, height: 150 },
  md: { width: 150, height: 225 },
  lg: { width: 200, height: 300 },
};

export function FilmCard({
  film,
  showActions = true,
  onWatch,
  onRate,
  onWatchlist,
  size = 'md',
  rank,
}: FilmCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const tmdbId = film.tmdb_id || film.tmdbId || film.id;
  const posterPath = film.poster_path || film.posterPath;
  const releaseDate = film.release_date || film.releaseDate;
  const rating = film.vote_average || film.voteAverage || 0;

  // Lazy loading with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const posterUrl = posterPath ? getPosterUrl(posterPath, 'w500') : null;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : '';

  return (
    <div
      ref={cardRef}
      className="film-card group"
      style={{
        aspectRatio: '2/3',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/film/${tmdbId}`} className="block relative w-full h-full">
        {/* Rank number (for Top 250) */}
        {rank && (
          <div className="absolute -top-2 -left-2 z-20 w-8 h-8 rounded-full bg-[#E8C547] flex items-center justify-center text-sm font-bold text-[#0a0a0b]">
            {rank}
          </div>
        )}

        {/* Watched indicator */}
        {film.isWatched && (
          <div className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-[#E8C547] flex items-center justify-center">
            <Check className="w-4 h-4 text-[#0a0a0b]" />
          </div>
        )}

        {/* Poster image */}
        <div className="relative w-full h-full rounded-md overflow-hidden bg-[#1a1a1d]">
          {!imageLoaded && (
            <div className="absolute inset-0 skeleton" />
          )}
          
          {isInViewport && posterUrl ? (
            <img
              src={posterUrl}
              alt={film.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1a1a1d]">
              <span className="text-gray-600 text-sm">No poster</span>
            </div>
          )}

          {/* Hover overlay with actions */}
          {showActions && isHovered && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-3 z-10">
              <h3 className="text-white font-medium text-sm mb-1 line-clamp-2">
                {film.title}
              </h3>
              
              {year && (
                <span className="text-gray-400 text-xs mb-2">{year}</span>
              )}

              {/* Rating */}
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-3 h-3 text-[#E8C547] fill-[#E8C547]" />
                <span className="text-xs text-white">{rating.toFixed(1)}</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {!film.isWatched && onWatch && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onWatch();
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-[#E8C547] text-[#0a0a0b] text-xs font-medium hover:bg-[#b89d35] transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    Watch
                  </button>
                )}
                
                {onWatchlist && !film.isInWatchlist && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onWatchlist();
                    }}
                    className="flex items-center justify-center p-1.5 rounded bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
                
                {film.isInWatchlist && (
                  <div className="flex items-center justify-center p-1.5 rounded bg-[#E8C547]/20 text-[#E8C547]">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* User rating */}
              {film.userRating && (
                <div className="mt-2 flex items-center gap-1">
                  <Star className="w-3 h-3 text-[#E8C547] fill-[#E8C547]" />
                  <span className="text-xs text-[#E8C547]">{film.userRating}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

// Skeleton loader for film cards
export function FilmCardSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{
        aspectRatio: '2/3',
      }}
    >
      <div className="w-full h-full skeleton" />
    </div>
  );
}

export default FilmCard;
