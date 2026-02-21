import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Star, Clock, Film, ChevronRight } from 'lucide-react';
import { useTrending, usePopularMovies } from '@/hooks/useTMDB';
import { FilmGrid } from '@/components/FilmGrid';
import { Top250 } from '@/components/Top250';
import { ReviewCard } from '@/components/ReviewCard';
import { Credits } from '@/components/Credits';
import { getBackdropUrl } from '@/utils/tmdb';

export function Home() {
  const { data: trendingData, loading: trendingLoading } = useTrending('week');
  const { data: popularData, loading: popularLoading } = usePopularMovies(1);
  const heroRef = useRef<HTMLDivElement>(null);

  const trendingMovies = (trendingData as { results?: unknown[] })?.results?.slice(0, 6) || [];
  const popularMovies = (popularData as { results?: unknown[] })?.results?.slice(0, 12) || [];

  // Featured movie (first trending)
  const featuredMovie = trendingMovies[0] as {
    id: number;
    title: string;
    backdrop_path: string;
    overview: string;
    vote_average: number;
  } | undefined;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      {featuredMovie && (
        <div
          ref={heroRef}
          className="relative h-[70vh] min-h-[500px] flex items-end"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${getBackdropUrl(featuredMovie.backdrop_path, 'w1280')})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b]/80 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[#E8C547]" />
                <span className="text-sm font-medium text-[#E8C547]">Trending This Week</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
                {featuredMovie.title}
              </h1>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-[#E8C547] fill-[#E8C547]" />
                  <span className="text-lg font-medium text-white">
                    {featuredMovie.vote_average?.toFixed(1)}
                  </span>
                </div>
              </div>
              
              <p className="text-gray-300 text-lg mb-6 line-clamp-3">
                {featuredMovie.overview}
              </p>
              
              <div className="flex items-center gap-4">
                <Link
                  to={`/film/${featuredMovie.id}`}
                  className="btn-primary flex items-center gap-2"
                >
                  <Film className="w-5 h-5" />
                  View Details
                </Link>
                <Link
                  to="/top250"
                  className="btn-secondary flex items-center gap-2"
                >
                  <Star className="w-5 h-5" />
                  Explore Top 250
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Trending Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#E8C547]" />
              Trending This Week
            </h2>
            <Link
              to="/search"
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <FilmGrid
            films={trendingMovies.map((m: unknown) => ({
              tmdbId: (m as { id: number }).id,
              title: (m as { title: string }).title,
              poster_path: (m as { poster_path: string }).poster_path,
              release_date: (m as { release_date: string }).release_date,
              vote_average: (m as { vote_average: number }).vote_average,
            }))}
            loading={trendingLoading}
          />
        </section>

        {/* Top 250 Preview */}
        <section>
          <Top250 />
        </section>

        {/* Popular Movies */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Star className="w-6 h-6 text-[#E8C547]" />
              Popular Movies
            </h2>
            <Link
              to="/search"
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <FilmGrid
            films={popularMovies.map((m: unknown) => ({
              tmdbId: (m as { id: number }).id,
              title: (m as { title: string }).title,
              poster_path: (m as { poster_path: string }).poster_path,
              release_date: (m as { release_date: string }).release_date,
              vote_average: (m as { vote_average: number }).vote_average,
            }))}
            loading={popularLoading}
          />
        </section>

        {/* Recent Reviews */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-[#E8C547]" />
              Recent Reviews
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Placeholder reviews - would be fetched from API */}
            <div className="review-card p-6 text-center">
              <p className="text-gray-400">Reviews from the community will appear here</p>
              <Link to="/search" className="text-[#E8C547] hover:underline mt-2 inline-block">
                Find a film to review
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Credits */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Credits />
      </div>
    </div>
  );
}

export default Home;
