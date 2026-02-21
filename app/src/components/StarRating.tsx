import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onRate?: (rating: number) => void;
  showValue?: boolean;
}

const sizeConfig = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-6 h-6',
};

export function StarRating({
  rating,
  maxRating = 5,
  interactive = false,
  size = 'md',
  onRate,
  showValue = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || rating;

  const handleClick = (index: number, isHalf: boolean) => {
    if (!interactive || !onRate) return;
    const newRating = index + (isHalf ? 0.5 : 1);
    onRate(newRating);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    setHoverRating(index + (isHalf ? 0.5 : 1));
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setHoverRating(0);
  };

  const renderStar = (index: number) => {
    const starValue = index + 1;
    const isFilled = displayRating >= starValue;
    const isHalf = displayRating >= index + 0.5 && displayRating < starValue;

    return (
      <div
        key={index}
        className={`relative ${interactive ? 'cursor-pointer' : ''}`}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          handleClick(index, x < rect.width / 2);
        }}
        onMouseMove={(e) => handleMouseMove(e, index)}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background star (empty) */}
        <Star
          className={`${sizeConfig[size]} text-gray-600`}
          fill="currentColor"
          strokeWidth={0}
        />
        
        {/* Filled star overlay */}
        {(isFilled || isHalf) && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: isHalf ? '50%' : '100%' }}
          >
            <Star
              className={`${sizeConfig[size]} text-[#E8C547]`}
              fill="currentColor"
              strokeWidth={0}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {Array.from({ length: maxRating }, (_, i) => renderStar(i))}
      </div>
      {showValue && (
        <span className="ml-2 text-sm text-gray-400">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// Compact rating display (just stars and number)
export function CompactRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Star className="w-4 h-4 text-[#E8C547] fill-[#E8C547]" />
      <span className="text-sm font-medium text-white">{rating.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-xs text-gray-500">({count})</span>
      )}
    </div>
  );
}

export default StarRating;
