import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Film, Star, Clock, List, Users, UserPlus, UserCheck,
  Settings, Calendar, MessageSquare, MapPin, Upload, X, Check, Search, ChevronLeft
} from 'lucide-react';
import { useAuth, useFollow } from '@/hooks/useAuth';
import { FilmGrid } from '@/components/FilmGrid';
import { ReviewCard } from '@/components/ReviewCard';
import { RoleBadge } from '@/components/RoleBadge';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;

interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  location: string | null;
  bannerUrl: string | null;
  role: string;
  createdAt: string;
  stats: {
    filmsWatched: number;
    totalHours: number;
    reviewsWritten: number;
    watchlistCount: number;
    listsCreated: number;
    followers: number;
    following: number;
  };
}

interface Review {
  id: number;
  content: string;
  rating?: number;
  containsSpoilers: boolean;
  createdAt: string;
  film?: { tmdbId: number; title: string; posterPath: string };
  user?: { username: string; displayName: string };
  likesCount: number;
}

interface TMDBMovie {
  id: number;
  title: string;
  backdrop_path: string | null;
  poster_path: string | null;
  release_date: string;
}

interface TMDBBackdrop {
  file_path: string;
  width: number;
  height: number;
  vote_average: number;
}

export function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { follow, unfollow, checkFollowing, loading: followLoading } = useFollow();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'watched' | 'reviews' | 'watchlist' | 'lists'>('watched');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [watchedFilms, setWatchedFilms] = useState<any[]>([]);
  const [watchedLoading, setWatchedLoading] = useState(false);
  const [watchlistFilms, setWatchlistFilms] = useState<any[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '', location: '', bannerUrl: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Banner picker
  const [bannerTab, setBannerTab] = useState<'search' | 'url'>('search');
  const [filmSearch, setFilmSearch] = useState('');
  const [filmResults, setFilmResults] = useState<TMDBMovie[]>([]);
  const [filmSearching, setFilmSearching] = useState(false);

  // Backdrop selection state
  const [selectedFilm, setSelectedFilm] = useState<TMDBMovie | null>(null);
  const [backdrops, setBackdrops] = useState<TMDBBackdrop[]>([]);
  const [backdropsLoading, setBackdropsLoading] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwnProfile = currentUser?.username === username;
  const isOwner = currentUser?.role === 'owner';

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      setLoading(true);
      try {
        const res = await fetch(`${API}/auth/profile/${username}`);
        if (!res.ok) throw new Error('Profile not found');
        const data = await res.json();
        setProfile(data.user);
        if (isAuthenticated && !isOwnProfile && data.user)
          setIsFollowing(await checkFollowing(data.user.id));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchProfile();
  }, [username, isAuthenticated, isOwnProfile]);

  useEffect(() => {
    if (activeTab !== 'reviews' || !username) return;
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const res = await fetch(`${API}/reviews/user/${username}`);
        const data = await res.json();
        setReviews(data.reviews || []);
      } catch (e) { console.error(e); }
      finally { setReviewsLoading(false); }
    };
    fetchReviews();
  }, [activeTab, username]);

  // Fetch watched films
  useEffect(() => {
    if (activeTab !== 'watched' || !isOwnProfile) return;
    const fetchWatched = async () => {
      setWatchedLoading(true);
      try {
        const res = await fetch(`${API}/films/user/watched`, { credentials: 'include' });
        const data = await res.json();
        setWatchedFilms(data.films || []);
      } catch (e) { console.error(e); }
      finally { setWatchedLoading(false); }
    };
    fetchWatched();
  }, [activeTab, isOwnProfile]);

  // Fetch watchlist
  useEffect(() => {
    if (activeTab !== 'watchlist' || !isOwnProfile) return;
    const fetchWatchlist = async () => {
      setWatchlistLoading(true);
      try {
        const res = await fetch(`${API}/films/user/watchlist`, { credentials: 'include' });
        const data = await res.json();
        setWatchlistFilms(data.films || []);
      } catch (e) { console.error(e); }
      finally { setWatchlistLoading(false); }
    };
    fetchWatchlist();
  }, [activeTab, isOwnProfile]);

  // TMDB film search with debounce
  useEffect(() => {
    if (!filmSearch.trim() || selectedFilm) { if (!selectedFilm) setFilmResults([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setFilmSearching(true);
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(filmSearch)}&language=en-US&page=1`
        );
        const data = await res.json();
        setFilmResults((data.results || []).filter((m: TMDBMovie) => m.backdrop_path).slice(0, 8));
      } catch (e) { console.error(e); }
      finally { setFilmSearching(false); }
    }, 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [filmSearch, selectedFilm]);

  // Fetch all backdrops when a film is selected
  const selectFilmAndFetchBackdrops = async (movie: TMDBMovie) => {
    setSelectedFilm(movie);
    setFilmSearch(movie.title);
    setFilmResults([]);
    setBackdrops([]);
    setBackdropsLoading(true);
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.id}/images?api_key=${TMDB_KEY}`
      );
      const data = await res.json();
      // Sort by vote_average descending so best ones come first
      const sorted: TMDBBackdrop[] = (data.backdrops || []).sort(
        (a: TMDBBackdrop, b: TMDBBackdrop) => b.vote_average - a.vote_average
      );
      setBackdrops(sorted);
    } catch (e) { console.error(e); }
    finally { setBackdropsLoading(false); }
  };

  const selectBackdrop = (backdrop: TMDBBackdrop) => {
    const url = `https://image.tmdb.org/t/p/original${backdrop.file_path}`;
    setEditForm(p => ({ ...p, bannerUrl: url }));
  };

  const resetFilmSearch = () => {
    setSelectedFilm(null);
    setFilmSearch('');
    setFilmResults([]);
    setBackdrops([]);
  };

  const startEditing = () => {
    if (!profile) return;
    setEditForm({ displayName: profile.displayName || '', bio: profile.bio || '', location: profile.location || '', bannerUrl: profile.bannerUrl || '' });
    setFilmSearch('');
    setFilmResults([]);
    setSelectedFilm(null);
    setBackdrops([]);
    setBannerTab('search');
    setSaveError('');
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const body: Record<string, string> = {
        displayName: editForm.displayName,
        bio: editForm.bio,
        location: editForm.location,
      };
      if (isOwner) body.bannerUrl = editForm.bannerUrl;

      const res = await fetch(`${API}/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setProfile(prev => prev ? { ...prev, ...data.user } : prev);
      setEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleFollow = async () => {
    if (!profile) return;
    if (isFollowing) { await unfollow(profile.id); setIsFollowing(false); }
    else { await follow(profile.id); setIsFollowing(true); }
  };

  if (loading) return (
    <div className="min-h-screen pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
        <div className="h-48 bg-white/5 rounded-xl mb-8" />
        <div className="h-8 bg-white/5 rounded w-1/4 mb-4" />
        <div className="h-4 bg-white/5 rounded w-1/2" />
      </div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-2xl font-semibold text-white mb-4">User not found</h1>
        <Link to="/" className="btn-primary">Go Home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Banner */}
        <div className="relative mb-8">
          <div
            className="w-full rounded-xl overflow-hidden"
            style={
              profile.bannerUrl
                ? { backgroundImage: `url(${profile.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center center', backgroundRepeat: 'no-repeat', aspectRatio: '4 / 1' }
                : { aspectRatio: '4 / 1', background: 'linear-gradient(135deg, rgba(232,197,71,0.2), rgba(0,200,255,0.2))' }
            }
          />
          <div className="relative -mt-16 px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
              <div className="w-32 h-32 rounded-full border-4 border-[#0a0a0b] bg-gradient-to-br from-[#E8C547] to-[#00C8FF] flex items-center justify-center text-3xl font-bold text-[#0a0a0b] flex-shrink-0">
                {profile.avatarUrl
                  ? <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full rounded-full object-cover" />
                  : profile.displayName?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">{profile.displayName}</h1>
                  <RoleBadge role={profile.role} />
                </div>
                <p className="text-gray-400 text-sm">@{profile.username}</p>
                {profile.location && (
                  <p className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                    <MapPin className="w-3.5 h-3.5" />{profile.location}
                  </p>
                )}
                {profile.bio && <p className="text-gray-300 mt-2 max-w-xl text-sm">{profile.bio}</p>}
              </div>
              <div className="flex items-center gap-3 pb-4">
                {!isOwnProfile && isAuthenticated && (
                  <button onClick={handleFollow} disabled={followLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isFollowing ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#E8C547] text-[#0a0a0b] hover:bg-[#b89d35]'}`}>
                    {isFollowing ? <><UserCheck className="w-4 h-4" />Following</> : <><UserPlus className="w-4 h-4" />Follow</>}
                  </button>
                )}
                {isOwnProfile && (
                  <button onClick={startEditing} className="btn-secondary flex items-center gap-2">
                    <Settings className="w-4 h-4" />Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Edit Profile</h2>
                <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              {saveError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{saveError}</div>}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
                  <input className="input-dark w-full" value={editForm.displayName}
                    onChange={e => setEditForm(p => ({ ...p, displayName: e.target.value }))} placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
                  <textarea className="input-dark w-full resize-none" rows={3} value={editForm.bio}
                    onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Location <span className="text-gray-500 font-normal">(anything goes!)</span></span>
                  </label>
                  <input className="input-dark w-full" value={editForm.location}
                    onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))}
                    placeholder="e.g. Love Island, The Moon, Middle Earth..." />
                </div>

                {/* Banner — owner only */}
                {isOwner && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5" />Profile Banner
                        <span className="text-[#E8C547] text-xs font-normal ml-1">Owner only</span>
                      </span>
                    </label>

                    {/* Tabs */}
                    <div className="flex gap-1 mb-3 bg-white/5 rounded-lg p-1">
                      <button onClick={() => setBannerTab('search')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors ${bannerTab === 'search' ? 'bg-[#E8C547] text-[#0a0a0b]' : 'text-gray-400 hover:text-white'}`}>
                        <Search className="w-3.5 h-3.5" />Search Film
                      </button>
                      <button onClick={() => setBannerTab('url')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors ${bannerTab === 'url' ? 'bg-[#E8C547] text-[#0a0a0b]' : 'text-gray-400 hover:text-white'}`}>
                        <Upload className="w-3.5 h-3.5" />Custom URL
                      </button>
                    </div>

                    {bannerTab === 'search' && (
                      <div>
                        {/* Search input — show back button when film is selected */}
                        <div className="relative">
                          {selectedFilm ? (
                            <button onClick={resetFilmSearch}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          ) : (
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          )}
                          <input className="input-dark pl-9 w-full" value={filmSearch}
                            onChange={e => { setFilmSearch(e.target.value); if (selectedFilm) resetFilmSearch(); }}
                            placeholder="Search for a movie..." />
                          {filmSearching && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                          )}
                        </div>

                        {/* Step 1: Film search results */}
                        {!selectedFilm && filmResults.length > 0 && (
                          <div className="mt-2 grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                            {filmResults.map(movie => (
                              <button key={movie.id} onClick={() => selectFilmAndFetchBackdrops(movie)}
                                className="relative rounded-lg overflow-hidden group text-left border-2 border-transparent hover:border-[#E8C547] transition-all">
                                <img
                                  src={`https://image.tmdb.org/t/p/w300${movie.backdrop_path}`}
                                  alt={movie.title}
                                  className="w-full h-16 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors flex items-end p-1.5">
                                  <p className="text-white text-xs font-medium leading-tight line-clamp-2">{movie.title}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Step 2: All backdrops for selected film */}
                        {selectedFilm && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-400 mb-2">
                              {backdropsLoading
                                ? 'Loading backdrops...'
                                : `${backdrops.length} backdrop${backdrops.length !== 1 ? 's' : ''} available — click one to set as banner`}
                            </p>
                            {backdropsLoading ? (
                              <div className="grid grid-cols-2 gap-2">
                                {Array.from({ length: 4 }, (_, i) => (
                                  <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
                                ))}
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                                {backdrops.map((backdrop, idx) => {
                                  const url = `https://image.tmdb.org/t/p/original${backdrop.file_path}`;
                                  const isSelected = editForm.bannerUrl === url;
                                  return (
                                    <button key={idx} onClick={() => selectBackdrop(backdrop)}
                                      className={`relative rounded-lg overflow-hidden group text-left border-2 transition-all ${isSelected ? 'border-[#E8C547]' : 'border-transparent hover:border-[#E8C547]/60'}`}>
                                      <img
                                        src={`https://image.tmdb.org/t/p/w300${backdrop.file_path}`}
                                        alt={`Backdrop ${idx + 1}`}
                                        className="w-full h-16 object-cover"
                                      />
                                      {/* Vote average badge */}
                                      {backdrop.vote_average > 0 && (
                                        <div className="absolute top-1 left-1 bg-black/70 rounded px-1 py-0.5 text-xs text-yellow-400 font-medium">
                                          ★ {backdrop.vote_average.toFixed(1)}
                                        </div>
                                      )}
                                      {isSelected && (
                                        <div className="absolute top-1 right-1 w-5 h-5 bg-[#E8C547] rounded-full flex items-center justify-center">
                                          <Check className="w-3 h-3 text-[#0a0a0b]" />
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {bannerTab === 'url' && (
                      <input className="input-dark w-full" value={editForm.bannerUrl}
                        onChange={e => setEditForm(p => ({ ...p, bannerUrl: e.target.value }))}
                        placeholder="https://... (image URL)" />
                    )}

                    {/* Preview */}
                    {editForm.bannerUrl && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">Preview:</p>
                        <div className="h-24 rounded-lg overflow-hidden relative">
                          <img src={editForm.bannerUrl} alt="Banner preview"
                            className="w-full h-full object-cover"
                            onError={e => (e.currentTarget.style.display = 'none')} />
                          <button onClick={() => { setEditForm(p => ({ ...p, bannerUrl: '' })); resetFilmSearch(); }}
                            className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-500/80 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={saveProfile} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving
                    ? <div className="w-4 h-4 border-2 border-[#0a0a0b] border-t-transparent rounded-full animate-spin" />
                    : <><Check className="w-4 h-4" />Save</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          {[
            { icon: Film, value: profile.stats.filmsWatched, label: 'Films' },
            { icon: Clock, value: profile.stats.totalHours, label: 'Hours' },
            { icon: MessageSquare, value: profile.stats.reviewsWritten, label: 'Reviews' },
            { icon: List, value: profile.stats.listsCreated, label: 'Lists' },
            { icon: Users, value: profile.stats.followers, label: 'Followers' },
            { icon: UserPlus, value: profile.stats.following, label: 'Following' },
            { icon: Calendar, value: new Date(profile.createdAt).getFullYear(), label: 'Joined' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="glass p-4 rounded-lg text-center">
              <Icon className="w-5 h-5 text-[#E8C547] mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-white/10 mb-6">
          {[
            { id: 'watched', label: 'Watched', icon: Film },
            { id: 'reviews', label: 'Reviews', icon: MessageSquare },
            { id: 'watchlist', label: 'Watchlist', icon: List },
            { id: 'lists', label: 'Lists', icon: List },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-[#E8C547] border-b-2 border-[#E8C547]' : 'text-gray-400 hover:text-white'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {activeTab === 'watched' && (
            <FilmGrid
              films={watchedFilms.map(f => ({
                tmdbId: f.tmdb_id,
                title: f.title,
                posterPath: f.poster_path,
                releaseDate: f.release_date,
                voteAverage: f.vote_average,
                userRating: f.rating,
                isWatched: true,
              }))}
              loading={watchedLoading}
              emptyMessage={isOwnProfile ? "You haven't watched any films yet." : `${profile.displayName} hasn't watched any films yet.`}
            />
          )}
          {activeTab === 'reviews' && (
            reviewsLoading ? (
              <div className="space-y-4">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />)}</div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">{isOwnProfile ? "You haven't written any reviews yet." : `${profile.displayName} hasn't written any reviews yet.`}</p>
                {isOwnProfile && <Link to="/search" className="text-[#E8C547] hover:underline mt-2 inline-block">Find a film to review</Link>}
              </div>
            ) : (
              <div className="space-y-4">{reviews.map(r => <ReviewCard key={r.id} review={r} />)}</div>
            )
          )}
          {activeTab === 'watchlist' && (
            <FilmGrid
              films={watchlistFilms.map(f => ({
                tmdbId: f.tmdb_id,
                title: f.title,
                posterPath: f.poster_path,
                releaseDate: f.release_date,
                isInWatchlist: true,
              }))}
              loading={watchlistLoading}
              emptyMessage={isOwnProfile ? "Your watchlist is empty." : `${profile.displayName}'s watchlist is empty.`}
            />
          )}
          {activeTab === 'lists' && (
            <div className="text-center py-12">
              <List className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">{isOwnProfile ? "You haven't created any lists yet." : `${profile.displayName} hasn't created any lists yet.`}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;