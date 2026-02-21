import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Flag, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getPosterUrl } from '@/utils/tmdb';
import { StarRating } from './StarRating';
import { RoleBadge } from './RoleBadge';

interface ReviewCardProps {
  review: {
    id: number;
    content: string;
    containsSpoilers: boolean;
    likesCount: number;
    createdAt: string;
    user: {
      username: string;
      displayName: string;
      avatarUrl: string | null;
      role?: string;
    };
    film?: {
      id: number;
      tmdbId: number;
      title: string;
      posterPath: string | null;
      releaseDate: string;
    };
    userRating?: number;
    hasLiked?: boolean;
  };
  currentUser?: { username: string; role: string } | null;
  onLike?: () => void;
  onUnlike?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showFilm?: boolean;
  compact?: boolean;
}

export function ReviewCard({
  review,
  currentUser,
  onLike,
  onUnlike,
  onEdit,
  onDelete,
  showFilm = false,
  compact = false,
}: ReviewCardProps) {
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const isOwner = currentUser?.username === review.user.username;
  const isAdmin = currentUser?.role === 'owner';

  const handleLike = () => {
    if (review.hasLiked && onUnlike) {
      onUnlike();
    } else if (onLike) {
      onLike();
    }
  };

  if (compact) {
    return (
      <div className="review-card p-3">
        <div className="flex items-start gap-3">
          <Link to={`/profile/${review.user.username}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E8C547] to-[#00C8FF] flex items-center justify-center text-xs font-medium text-[#0a0a0b]">
              {review.user.displayName?.[0]?.toUpperCase()}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link
                to={`/profile/${review.user.username}`}
                className="text-sm font-medium text-white hover:text-[#E8C547] transition-colors"
              >
                {review.user.displayName}
              </Link>
              {review.user.role && review.user.role !== 'free' && (
                <RoleBadge role={review.user.role} size="sm" />
              )}
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-gray-300 line-clamp-2">{review.content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${review.user.username}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8C547] to-[#00C8FF] flex items-center justify-center text-sm font-medium text-[#0a0a0b]">
              {review.user.displayName?.[0]?.toUpperCase()}
            </div>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Link
                to={`/profile/${review.user.username}`}
                className="font-medium text-white hover:text-[#E8C547] transition-colors"
              >
                {review.user.displayName}
              </Link>
              {review.user.role && review.user.role !== 'free' && (
                <RoleBadge role={review.user.role} size="sm" />
              )}
            </div>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Actions menu */}
        {(isOwner || isAdmin) && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 top-full mt-1 w-32 rounded-lg bg-[#1a1a1d] border border-white/10 shadow-lg z-10">
                {isOwner && (
                  <button
                    onClick={() => {
                      onEdit?.();
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                )}
                {(isOwner || isAdmin) && (
                  <button
                    onClick={() => {
                      onDelete?.();
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Film info (if showing in film context) */}
      {showFilm && review.film && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white/5">
          <Link to={`/film/${review.film.tmdbId}`}>
            <img
              src={getPosterUrl(review.film.posterPath, 'w92') || ''}
              alt={review.film.title}
              className="w-12 h-18 rounded object-cover"
            />
          </Link>
          <div>
            <Link
              to={`/film/${review.film.tmdbId}`}
              className="font-medium text-white hover:text-[#E8C547] transition-colors"
            >
              {review.film.title}
            </Link>
            <p className="text-xs text-gray-500">
              {review.film.releaseDate && new Date(review.film.releaseDate).getFullYear()}
            </p>
            {review.userRating && (
              <StarRating rating={review.userRating} size="sm" />
            )}
          </div>
        </div>
      )}

      {/* Review content */}
      <div className="mb-4">
        {review.containsSpoilers && !showSpoilers ? (
          <div className="spoiler-warning">
            <p className="mb-2">This review contains spoilers</p>
            <button
              onClick={() => setShowSpoilers(true)}
              className="text-sm underline hover:no-underline"
            >
              Show anyway
            </button>
          </div>
        ) : (
          <p className="text-gray-300 whitespace-pre-wrap">{review.content}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            review.hasLiked
              ? 'text-red-400'
              : 'text-gray-400 hover:text-red-400'
          }`}
        >
          <Heart
            className={`w-4 h-4 ${review.hasLiked ? 'fill-current' : ''}`}
          />
          <span>{review.likesCount}</span>
        </button>

        <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          <MessageCircle className="w-4 h-4" />
          <span>Reply</span>
        </button>

        {!isOwner && (
          <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors ml-auto">
            <Flag className="w-4 h-4" />
            <span>Report</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default ReviewCard;
