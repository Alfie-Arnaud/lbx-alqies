import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star, Clock, Calendar, Eye, Plus, Check, Play,
  User, Heart, MessageCircle, Share2, Flag
} from 'lucide-react';
import { useMovieDetails } from '@/hooks/useTMDB';
import { useAuth } from '@/hooks/useAuth';
import {
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
  formatRuntime,
  formatYear,
  getTrailerKey,
  getDirector,
  getTopCast
} from '@/utils/tmdb';
import { StarRating } from '@/components/StarRating';
import { FilmGrid } from '@/components/FilmGrid';
import { ReviewCard } from '@/components/ReviewCard';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function Film() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { data: movie, loading, error } = useMovieDetails(id ? parseInt(id) : null);

  const [userRating, setUserRating] = useState(0);
  const [isWatched, setIsWatched] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewContent, setReviewContent] = useState('');
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const movieData = movie as {
    id: number;
    title: string;
    original_title: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    release_date: string;
    runtime: number;
    genres: { id: number; name: string }[];
    tagline: string;
    vote_average: number;
    vote_count: number;
    credits?: { cast: unknown[]; crew: unknown[] };
    videos?: { results: unknown[] };
    similar?: { results: unknown[] };
  } | null;

  const trailerKey = movieData?.videos ? getTrailerKey(movieData.videos as { results: { type: string; site: string; key: string }[] }) : null;
  const director = movieData?.credits ? getDirector(movieData.credits as { crew: { job: string; name: string }[] }) : null;
  const cast = movieData?.credits ? getTopCast(movieData.credits as { cast: { name: string; profile_path: string; character: string }[] }, 6) : [];
  const similarMovies = (movieData?.similar?.results || []).slice(0, 6);

  // Fetch reviews for this film
  useEffect(() => {
    if (!movieData?.id) return;
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const res = await fetch(`${API}/reviews/film/${movieData.id}`);
        const data = await res.json();
        setReviews(data.reviews || []);
      } catch (e) {
        console.error(e);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [movieData?.id]);

  // Fetch user's watched/watchlist status
  useEffect(() => {
    if (!isAuthenticated || !movieData?.id) return;
    const fetchUserFilmStatus = async () => {
      try {
        const res = await fetch(`${API}/films/${movieData.id}/status`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setIsWatched(data.watched || false);
          setIsInWatchlist(data.inWatchlist || false);
          setUserRating(data.rating || 0);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUserFilmStatus();
  }, [isAuthenticated, movieData?.id]);

  // Ensure film exists in our DB before doing anything
  const ensureFilmInDB = async () => {
    if (!movieData) return null;
    try {
      const res = await fetch(`${API}/films/ensure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tmdbId: movieData.id,
          title: movieData.title,
          posterPath: movieData.poster_path,
          backdropPath: movieData.backdrop_path,
          releaseDate: movieData.release_date,
          runtime: movieData.runtime,
          overview: movieData.overview,
          voteAverage: movieData.vote_average,
          voteCount: movieData.vote_count,
        }),
      });
      const data = await res.json();
      return data.film || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleRate = async (rating: number) => {
    if (!isAuthenticated) return;
    setUserRating(rating);
    await ensureFilmInDB();
    try {
      await fetch(`${API}/films/${movieData!.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rating }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleWatch = async () => {
    if (!isAuthenticated || !movieData) return;
    const newWatched = !isWatched;
    setIsWatched(newWatched);
    await ensureFilmInDB();
    try {
      await fetch(`${API}/films/${movieData.id}/watched`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ watched: newWatched }),
      });
    } catch (e) {
      console.error(e);
      setIsWatched(!newWatched); // revert on error
    }
  };

  const handleWatchlist = async () => {
    if (!isAuthenticated || !movieData) return;
    const newWatchlist = !isInWatchlist;
    setIsInWatchlist(newWatchlist);
    await ensureFilmInDB();
    try {
      await fetch(`${API}/films/${movieData.id}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inWatchlist: newWatchlist }),
      });
    } catch (e) {
      console.error(e);
      setIsInWatchlist(!newWatchlist); // revert on error
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewContent.trim() || !movieData) return;
    setSubmittingReview(true);
    setReviewError('');
    try {
      await ensureFilmInDB();
      const res = await fetch(`${API}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tmdbId: movieData.id,
          content: reviewContent,
          containsSpoilers: hasSpoiler,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      // Add new review to list
      setReviews(prev => [data.review, ...prev]);
      setShowReviewModal(false);
      setReviewContent('');
      setHasSpoiler(false);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-96 bg-white/5 rounded-lg mb-8" />
            <div className="h-8 bg-white/5 rounded w-1/3 mb-4" />
            <div className="h-4 bg-white/5 rounded w-2/3 mb-2" />
            <div className="h-4 bg-white/5 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !movieData) {
    return (
      <div className="min-h-screen pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl font-semibold text-white mb-4">Film not found</h1>
          <p className="text-gray-400 mb-6">We couldn't find the film you're looking for.</p>
          <Link to="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative">
        {movieData.backdrop_path && (
          <div
            className="absolute inset-0 h-[60vh] bg-cover bg-center"
            style={{ backgroundImage: `url(${getBackdropUrl(movieData.backdrop_path, 'w1280')})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b]/90 to-transparent" />
          </div>
        )}

        <div className="relative z-10 pt-24 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Poster */}
              <div className="flex-shrink-0">
                <div className="w-64 mx-auto md:mx-0 rounded-lg overflow-hidden shadow-2xl">
                  {movieData.poster_path ? (
                    <img
                      src={getPosterUrl(movieData.poster_path, 'w500') || undefined}
                      alt={movieData.title}
                      className="w-full"
                    />
                  ) : (
                    <div className="aspect-[2/3] bg-white/5 flex items-center justify-center">
                      <span className="text-gray-500">No poster</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                  {movieData.title}
                </h1>

                {movieData.original_title !== movieData.title && (
                  <p className="text-gray-400 mb-4">{movieData.original_title}</p>
                )}

                {movieData.tagline && (
                  <p className="text-lg text-gray-300 italic mb-4">"{movieData.tagline}"</p>
                )}

                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-[#E8C547] fill-[#E8C547]" />
                    <span className="text-lg font-medium text-white">{movieData.vote_average?.toFixed(1)}</span>
                    <span className="text-sm text-gray-500">({movieData.vote_count?.toLocaleString()} votes)</span>
                  </div>
                  {movieData.release_date && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{formatYear(movieData.release_date)}</span>
                    </div>
                  )}
                  {movieData.runtime > 0 && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{formatRuntime(movieData.runtime)}</span>
                    </div>
                  )}
                </div>

                {movieData.genres && movieData.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {movieData.genres.map((genre) => (
                      <span key={genre.id} className="px-3 py-1 rounded-full text-sm bg-white/5 text-gray-300">
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* User actions */}
                {isAuthenticated && (
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Your rating:</span>
                      <StarRating rating={userRating} interactive onRate={handleRate} />
                    </div>

                    <button
                      onClick={handleWatch}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isWatched ? 'bg-[#E8C547] text-[#0a0a0b]' : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {isWatched ? <><Check className="w-4 h-4" />Watched</> : <><Eye className="w-4 h-4" />Mark as Watched</>}
                    </button>

                    <button
                      onClick={handleWatchlist}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isInWatchlist ? 'bg-[#E8C547]/20 text-[#E8C547]' : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {isInWatchlist ? <><Check className="w-4 h-4" />In Watchlist</> : <><Plus className="w-4 h-4" />Add to Watchlist</>}
                    </button>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Overview</h3>
                  <p className="text-gray-300 leading-relaxed">{movieData.overview || 'No overview available.'}</p>
                </div>

                {director && (
                  <div className="mb-4">
                    <span className="text-gray-400">Director: </span>
                    <span className="text-white">{director}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Trailer */}
        {trailerKey && (
          <section>
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <Play className="w-6 h-6 text-[#E8C547]" />Trailer
            </h2>
            <div className="trailer-container max-w-3xl">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}`}
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <User className="w-6 h-6 text-[#E8C547]" />Cast
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {cast.map((actor: { name: string; profile_path: string; character: string }, index: number) => (
                <div key={index} className="text-center">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 bg-white/5">
                    {actor.profile_path ? (
                      <img
                        src={getProfileUrl(actor.profile_path, 'w185') || undefined}
                        alt={actor.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-white truncate">{actor.name}</p>
                  <p className="text-xs text-gray-500 truncate">{actor.character}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-[#E8C547]" />
              Reviews {reviews.length > 0 && <span className="text-base text-gray-400 font-normal">({reviews.length})</span>}
            </h2>
            {isAuthenticated && (
              <button onClick={() => setShowReviewModal(true)} className="btn-primary text-sm">
                Write a Review
              </button>
            )}
          </div>

          {reviewsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="review-card p-6 text-center">
              <p className="text-gray-400">
                {isAuthenticated ? 'Be the first to review this film!' : 'Log in to write a review'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </section>

        {/* Similar Movies */}
        {similarMovies.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-[#E8C547]" />Similar Movies
            </h2>
            <FilmGrid
              films={similarMovies.map((m: unknown) => ({
                tmdbId: (m as { id: number }).id,
                title: (m as { title: string }).title,
                poster_path: (m as { poster_path: string }).poster_path,
                release_date: (m as { release_date: string }).release_date,
                vote_average: (m as { vote_average: number }).vote_average,
              }))}
            />
          </section>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white mb-4">Write a Review</h3>
            {reviewError && (
              <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {reviewError}
              </div>
            )}
            <textarea
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              placeholder="Share your thoughts on this film... (min 10 characters)"
              className="input-dark w-full h-32 resize-none mb-4"
            />
            <label className="flex items-center gap-2 mb-4 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSpoiler}
                onChange={(e) => setHasSpoiler(e.target.checked)}
                className="rounded border-gray-600"
              />
              Contains spoilers
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReviewModal(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={handleSubmitReview}
                className="btn-primary flex items-center gap-2"
                disabled={!reviewContent.trim() || submittingReview}
              >
                {submittingReview
                  ? <div className="w-4 h-4 border-2 border-[#0a0a0b] border-t-transparent rounded-full animate-spin" />
                  : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Film;