import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Star, Clock, Film, ChevronRight, Maximize, Minimize, X } from 'lucide-react';
import { useTrending, usePopularMovies } from '@/hooks/useTMDB';
import { FilmGrid } from '@/components/FilmGrid';
import { Top250 } from '@/components/Top250';
import { Credits } from '@/components/Credits';
import { getBackdropUrl } from '@/utils/tmdb';

export function Home() {
  const { data: trendingData, loading: trendingLoading } = useTrending('week');
  const { data: popularData, loading: popularLoading } = usePopularMovies(1);
  const heroRef = useRef<HTMLDivElement>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [cinematic, setCinematic] = useState(false);

  const trendingMovies = (trendingData as { results?: unknown[] })?.results?.slice(0, 6) || [];
  const popularMovies = (popularData as { results?: unknown[] })?.results?.slice(0, 12) || [];

  const goToSlide = useCallback((nextIndex: number) => {
    if (transitioning || nextIndex === featuredIndex) return;
    setTransitioning(true);
    setPrevIndex(featuredIndex);
    setFeaturedIndex(nextIndex);
    setTimeout(() => { setPrevIndex(null); setTransitioning(false); }, 900);
  }, [transitioning, featuredIndex]);

  useEffect(() => {
    if (trendingMovies.length === 0) return;
    const interval = setInterval(() => {
      goToSlide((featuredIndex + 1) % trendingMovies.length);
    }, cinematic ? 8000 : 7000);
    return () => clearInterval(interval);
  }, [trendingMovies.length, featuredIndex, transitioning, cinematic]);

  const enterCinematic = useCallback(() => {
    setCinematic(true);
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
  }, []);

  const exitCinematic = useCallback(() => {
    setCinematic(false);
    if (document.fullscreenElement) document.exitFullscreen();
  }, []);

  useEffect(() => {
    const onFsChange = () => { if (!document.fullscreenElement) setCinematic(false); };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && cinematic) exitCinematic(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cinematic, exitCinematic]);

  type Movie = { id: number; title: string; backdrop_path: string; overview: string; vote_average: number; release_date?: string; genres?: {id:number;name:string}[] };
  const featuredMovie = trendingMovies[featuredIndex] as Movie | undefined;
  const prevMovie = prevIndex !== null ? trendingMovies[prevIndex] as Movie | undefined : undefined;

  const kenBurnsVariants = [
    'kenburns-zoom-pan-1',
    'kenburns-zoom-pan-2',
    'kenburns-zoom-pan-3',
  ];
  const currentKB = kenBurnsVariants[featuredIndex % kenBurnsVariants.length];

  return (
    <div className="min-h-screen">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes kenburns1 {
          0%   { transform: scale(1)    translate(0%, 0%); }
          100% { transform: scale(1.12) translate(-2%, -1%); }
        }
        @keyframes kenburns2 {
          0%   { transform: scale(1.08) translate(-1%, 1%); }
          100% { transform: scale(1)    translate(2%, -1%); }
        }
        @keyframes kenburns3 {
          0%   { transform: scale(1)    translate(1%, -1%); }
          100% { transform: scale(1.1)  translate(-1%, 2%); }
        }
        .kenburns-zoom-pan-1 { animation: kenburns1 14s ease-in-out infinite alternate; }
        .kenburns-zoom-pan-2 { animation: kenburns2 14s ease-in-out infinite alternate; }
        .kenburns-zoom-pan-3 { animation: kenburns3 14s ease-in-out infinite alternate; }
        .fade-in  { animation: fadeIn  0.9s ease forwards; }
        .fade-out { animation: fadeOut 0.9s ease forwards; }
        .slide-up { animation: slideUp 0.7s ease forwards; }
        .cinematic-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: #0a0a0b;
        }
      `}</style>

      {/* ── CINEMATIC MODE ── */}
      {cinematic && featuredMovie && (
        <div className="cinematic-overlay">
          {/* Prev backdrop fading out */}
          {prevMovie && (
            <div className="absolute inset-0 overflow-hidden fade-out">
              <div
                className={`absolute inset-0 bg-cover bg-center ${kenBurnsVariants[(prevIndex! % kenBurnsVariants.length)]}`}
                style={{ backgroundImage: `url(${getBackdropUrl(prevMovie.backdrop_path, 'original')})` }}
              />
            </div>
          )}

          {/* Current backdrop */}
          <div key={`cin-${featuredIndex}`} className="absolute inset-0 overflow-hidden fade-in">
            <div
              className={`absolute inset-0 bg-cover bg-center ${currentKB}`}
              style={{ backgroundImage: `url(${getBackdropUrl(featuredMovie.backdrop_path, 'original')})` }}
            />
          </div>

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

          {/* Exit button */}
          <button
            onClick={exitCinematic}
            className="absolute top-6 right-6 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium backdrop-blur-sm transition-all"
          >
            <Minimize className="w-4 h-4" />
            Exit Cinematic
          </button>

          {/* Film info */}
          <div
            key={`cin-content-${featuredIndex}`}
            className="absolute bottom-0 left-0 right-0 z-10 px-12 pb-16 slide-up"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[#E8C547]" />
              <span className="text-sm font-medium text-[#E8C547] tracking-widest uppercase">Trending This Week</span>
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold text-white mb-4 max-w-4xl leading-tight drop-shadow-2xl">
              {featuredMovie.title}
            </h1>

            <div className="flex items-center gap-6 mb-4 text-sm text-gray-300">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-[#E8C547] fill-[#E8C547]" />
                <span className="text-lg font-semibold text-white">{featuredMovie.vote_average?.toFixed(1)}</span>
              </div>
              {featuredMovie.release_date && (
                <span className="text-gray-400">{new Date(featuredMovie.release_date).getFullYear()}</span>
              )}
              {featuredMovie.genres && featuredMovie.genres.length > 0 && (
                <span className="text-gray-400">{featuredMovie.genres.slice(0, 3).map(g => g.name).join(' · ')}</span>
              )}
            </div>

            <p className="text-gray-300 text-lg mb-8 max-w-2xl line-clamp-3 leading-relaxed">
              {featuredMovie.overview}
            </p>

            <div className="flex items-center gap-4">
              <Link
                to={`/film/${featuredMovie.id}`}
                onClick={exitCinematic}
                className="btn-primary flex items-center gap-2 text-base px-6 py-3"
              >
                <Film className="w-5 h-5" />
                View Details
              </Link>
              <Link
                to="/top250"
                onClick={exitCinematic}
                className="btn-secondary flex items-center gap-2 text-base px-6 py-3"
              >
                <Star className="w-5 h-5" />
                Top 250
              </Link>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center gap-2 mt-8">
              {trendingMovies.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === featuredIndex ? 'bg-[#E8C547] w-8' : 'bg-white/30 w-2 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NORMAL HERO ── */}
      {featuredMovie && (
        <div ref={heroRef} className="relative h-[70vh] min-h-[500px] flex items-end overflow-hidden">
          {/* Prev backdrop */}
          {prevMovie && (
            <div className="absolute inset-0 overflow-hidden fade-out">
              <div
                className={`absolute inset-0 bg-cover bg-center ${kenBurnsVariants[prevIndex! % kenBurnsVariants.length]}`}
                style={{ backgroundImage: `url(${getBackdropUrl(prevMovie.backdrop_path, 'original')})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b]/80 to-transparent" />
            </div>
          )}

          {/* Current backdrop */}
          <div key={`hero-${featuredIndex}`} className="absolute inset-0 overflow-hidden fade-in">
            <div
              className={`absolute inset-0 bg-cover bg-center ${currentKB}`}
              style={{ backgroundImage: `url(${getBackdropUrl(featuredMovie.backdrop_path, 'original')})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b]/80 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
            <div key={`hero-content-${featuredIndex}`} className="max-w-2xl slide-up">
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
                  <span className="text-lg font-medium text-white">{featuredMovie.vote_average?.toFixed(1)}</span>
                </div>
                {featuredMovie.release_date && (
                  <span className="text-gray-400 text-sm">{new Date(featuredMovie.release_date).getFullYear()}</span>
                )}
              </div>
              <p className="text-gray-300 text-lg mb-6 line-clamp-3">{featuredMovie.overview}</p>
              <div className="flex items-center gap-4 flex-wrap">
                <Link to={`/film/${featuredMovie.id}`} className="btn-primary flex items-center gap-2">
                  <Film className="w-5 h-5" />
                  View Details
                </Link>
                <Link to="/top250" className="btn-secondary flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Explore Top 250
                </Link>
                <button
                  onClick={enterCinematic}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium backdrop-blur-sm transition-all border border-white/20 hover:border-white/40"
                >
                  <Maximize className="w-4 h-4" />
                  Cinematic Mode
                </button>
              </div>
            </div>

            {/* Dots */}
            <div className="flex items-center gap-2 mt-6">
              {trendingMovies.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    i === featuredIndex ? 'bg-[#E8C547] w-6' : 'bg-white/30 w-2 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#E8C547]" />
              Trending This Week
            </h2>
            <Link to="/search" className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-4 h-4" />
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

        <section><Top250 /></section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Star className="w-6 h-6 text-[#E8C547]" />
              Popular Movies
            </h2>
            <Link to="/search" className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-4 h-4" />
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

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-[#E8C547]" />
              Recent Reviews
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="review-card p-6 text-center">
              <p className="text-gray-400">Reviews from the community will appear here</p>
              <Link to="/search" className="text-[#E8C547] hover:underline mt-2 inline-block">
                Find a film to review
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Credits />
      </div>
    </div>
  );
}

export default Home;