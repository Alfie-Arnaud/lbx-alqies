import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Film, Star, Clock, List, Users, UserPlus, UserCheck, 
  Settings, Calendar, MessageSquare 
} from 'lucide-react';
import { useAuth, useFollow } from '@/hooks/useAuth';
import { FilmGrid } from '@/components/FilmGrid';
import { ReviewCard } from '@/components/ReviewCard';
import { RoleBadge } from '@/components/RoleBadge';
import { StarRating } from '@/components/StarRating';

interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
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

export function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { follow, unfollow, checkFollowing, loading: followLoading } = useFollow();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'watched' | 'reviews' | 'watchlist' | 'lists'>('watched');

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      
      setLoading(true);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_BASE_URL}/auth/profile/${username}`);
        
        if (!response.ok) {
          throw new Error('Profile not found');
        }
        
        const data = await response.json();
        setProfile(data.user);
        
        // Check if following
        if (isAuthenticated && !isOwnProfile && data.user) {
          const following = await checkFollowing(data.user.id);
          setIsFollowing(following);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, isAuthenticated, isOwnProfile, checkFollowing]);

  const handleFollow = async () => {
    if (!profile) return;
    
    if (isFollowing) {
      await unfollow(profile.id);
      setIsFollowing(false);
    } else {
      await follow(profile.id);
      setIsFollowing(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-32 bg-white/5 rounded-lg mb-8" />
            <div className="h-8 bg-white/5 rounded w-1/4 mb-4" />
            <div className="h-4 bg-white/5 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl font-semibold text-white mb-4">User not found</h1>
          <p className="text-gray-400 mb-6">We couldn't find the user you're looking for.</p>
          <Link to="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="relative mb-8">
          {/* Cover Image */}
          <div className="h-48 rounded-xl bg-gradient-to-r from-[#E8C547]/20 to-[#00C8FF]/20" />
          
          {/* Profile Info */}
          <div className="relative -mt-16 px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
              {/* Avatar */}
              <div className="w-32 h-32 rounded-full border-4 border-[#0a0a0b] bg-gradient-to-br from-[#E8C547] to-[#00C8FF] flex items-center justify-center text-3xl font-bold text-[#0a0a0b]">
                {profile.displayName?.[0]?.toUpperCase()}
              </div>
              
              {/* Info */}
              <div className="flex-1 pb-4">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    {profile.displayName}
                  </h1>
                  <RoleBadge role={profile.role} />
                </div>
                <p className="text-gray-400">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-gray-300 mt-2 max-w-xl">{profile.bio}</p>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-3 pb-4">
                {!isOwnProfile && isAuthenticated && (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFollowing
                        ? 'bg-white/10 text-white hover:bg-white/20'
                        : 'bg-[#E8C547] text-[#0a0a0b] hover:bg-[#b89d35]'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Follow
                      </>
                    )}
                  </button>
                )}
                
                {isOwnProfile && (
                  <Link to="/settings" className="btn-secondary flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Edit Profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="glass p-4 rounded-lg text-center">
            <Film className="w-5 h-5 text-[#E8C547] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{profile.stats.filmsWatched}</p>
            <p className="text-xs text-gray-400">Films</p>
          </div>
          <div className="glass p-4 rounded-lg text-center">
            <Clock className="w-5 h-5 text-[#E8C547] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{profile.stats.totalHours}</p>
            <p className="text-xs text-gray-400">Hours</p>
          </div>
          <div className="glass p-4 rounded-lg text-center">
            <MessageSquare className="w-5 h-5 text-[#E8C547] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{profile.stats.reviewsWritten}</p>
            <p className="text-xs text-gray-400">Reviews</p>
          </div>
          <div className="glass p-4 rounded-lg text-center">
            <List className="w-5 h-5 text-[#E8C547] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{profile.stats.listsCreated}</p>
            <p className="text-xs text-gray-400">Lists</p>
          </div>
          <div className="glass p-4 rounded-lg text-center">
            <Users className="w-5 h-5 text-[#E8C547] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{profile.stats.followers}</p>
            <p className="text-xs text-gray-400">Followers</p>
          </div>
          <div className="glass p-4 rounded-lg text-center">
            <UserPlus className="w-5 h-5 text-[#E8C547] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{profile.stats.following}</p>
            <p className="text-xs text-gray-400">Following</p>
          </div>
          <div className="glass p-4 rounded-lg text-center">
            <Calendar className="w-5 h-5 text-[#E8C547] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {new Date(profile.createdAt).getFullYear()}
            </p>
            <p className="text-xs text-gray-400">Joined</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-white/10 mb-6">
          {[
            { id: 'watched', label: 'Watched', icon: Film },
            { id: 'reviews', label: 'Reviews', icon: MessageSquare },
            { id: 'watchlist', label: 'Watchlist', icon: List },
            { id: 'lists', label: 'Lists', icon: List },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-[#E8C547] border-b-2 border-[#E8C547]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {activeTab === 'watched' && (
            <FilmGrid
              films={[]}
              emptyMessage={isOwnProfile ? "You haven't watched any films yet. Start exploring!" : `${profile.displayName} hasn't watched any films yet.`}
            />
          )}

          {activeTab === 'reviews' && (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {isOwnProfile ? "You haven't written any reviews yet." : `${profile.displayName} hasn't written any reviews yet.`}
              </p>
            </div>
          )}

          {activeTab === 'watchlist' && (
            <FilmGrid
              films={[]}
              emptyMessage={isOwnProfile ? "Your watchlist is empty. Add some films!" : `${profile.displayName}'s watchlist is empty.`}
            />
          )}

          {activeTab === 'lists' && (
            <div className="text-center py-12">
              <List className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {isOwnProfile ? "You haven't created any lists yet." : `${profile.displayName} hasn't created any lists yet.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
