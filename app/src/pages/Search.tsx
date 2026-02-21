import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Filter, X } from 'lucide-react';
import { useSearch, useGenres } from '@/hooks/useTMDB';
import { FilmGrid } from '@/components/FilmGrid';

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  const { data: searchData, loading: searchLoading } = useSearch(debouncedQuery);
  const { data: genresData } = useGenres();

  const genres = (genresData as { genres?: { id: number; name: string }[] })?.genres || [];
  
  const results = (searchData as { results?: unknown[] })?.results || [];
  
  // Filter by genre if selected
  const filteredResults = selectedGenre
    ? results.filter((item: unknown) => {
        const genreIds = (item as { genre_ids?: number[] }).genre_ids || [];
        return genreIds.includes(parseInt(selectedGenre));
      })
    : results;

  // Debounce search query
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
      if (query) {
        setSearchParams({ q: query });
      } else {
        setSearchParams({});
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, setSearchParams]);

  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-6">Search Films</h1>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search for movies, TV shows, actors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-dark pl-12 pr-12 py-3 w-full text-lg"
              autoFocus
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters || selectedGenre
                  ? 'bg-[#E8C547] text-[#0a0a0b]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {selectedGenre && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#0a0a0b] text-xs">
                  1
                </span>
              )}
            </button>

            {selectedGenre && (
              <button
                onClick={() => setSelectedGenre('')}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => setSelectedGenre(
                      selectedGenre === genre.id.toString() ? '' : genre.id.toString()
                    )}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedGenre === genre.id.toString()
                        ? 'bg-[#E8C547] text-[#0a0a0b]'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          {debouncedQuery ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg text-gray-400">
                  {searchLoading ? (
                    'Searching...'
                  ) : (
                    <>
                      Found <span className="text-white font-medium">{filteredResults.length}</span> results for "{debouncedQuery}"
                    </>
                  )}
                </h2>
              </div>

              <FilmGrid
                films={filteredResults.map((item: unknown) => ({
                  tmdbId: (item as { id: number }).id,
                  title: (item as { title?: string; name?: string }).title || (item as { name: string }).name || 'Unknown',
                  poster_path: (item as { poster_path: string }).poster_path,
                  release_date: (item as { release_date?: string; first_air_date?: string }).release_date || (item as { first_air_date: string }).first_air_date,
                  vote_average: (item as { vote_average: number }).vote_average,
                }))}
                loading={searchLoading}
                emptyMessage={`No results found for "${debouncedQuery}"`}
              />
            </>
          ) : (
            /* Default view when no search */
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                <SearchIcon className="w-10 h-10 text-gray-500" />
              </div>
              <h2 className="text-xl font-medium text-white mb-2">
                Start searching
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                Search for your favorite movies, TV shows, or discover new ones to add to your watchlist.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Search;
