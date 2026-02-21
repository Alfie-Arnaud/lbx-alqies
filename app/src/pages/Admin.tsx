import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, Film, MessageSquare, BarChart3, 
  Crown, UserX, UserCheck, Megaphone, Terminal,
  Search, Send
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RoleBadge } from '@/components/RoleBadge';

interface SiteStats {
  totalUsers: number;
  totalFilms: number;
  filmsLogged: number;
  reviewsWritten: number;
}

interface User {
  id: number;
  email: string;
  username: string;
  displayName: string;
  role: string;
  isBanned: boolean;
  createdAt: string;
}

export function Admin() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'commands'>('overview');
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [command, setCommand] = useState('');
  const [commandOutput, setCommandOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect if not owner
  useEffect(() => {
    if (isAuthenticated && user?.role !== 'owner') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    if (isAuthenticated && user?.role === 'owner') {
      fetchStats();
    }
  }, [isAuthenticated, user]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    if (activeTab === 'users' && isAuthenticated) {
      fetchUsers();
    }
  }, [activeTab, isAuthenticated]);

  const handleCommand = async () => {
    if (!command.trim()) return;

    setLoading(true);
    setCommandOutput(prev => [...prev, `> ${command}`]);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/admin/command`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setCommandOutput(prev => [...prev, data.message || 'Command executed successfully']);
      } else {
        setCommandOutput(prev => [...prev, `Error: ${data.error || 'Command failed'}`]);
      }
    } catch (error) {
      setCommandOutput(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setCommand('');
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated || user?.role !== 'owner') {
    return (
      <div className="min-h-screen pt-24 text-center">
        <p className="text-gray-400">Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8C547] to-[#00C8FF] flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#0a0a0b]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400">Manage your CinemaLog instance</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-white/10 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'commands', label: 'Commands', icon: Terminal },
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

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass p-6 rounded-xl">
              <Users className="w-8 h-8 text-[#E8C547] mb-4" />
              <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
              <p className="text-sm text-gray-400">Total Users</p>
            </div>
            <div className="glass p-6 rounded-xl">
              <Film className="w-8 h-8 text-[#E8C547] mb-4" />
              <p className="text-3xl font-bold text-white">{stats.totalFilms}</p>
              <p className="text-sm text-gray-400">Films in Database</p>
            </div>
            <div className="glass p-6 rounded-xl">
              <BarChart3 className="w-8 h-8 text-[#E8C547] mb-4" />
              <p className="text-3xl font-bold text-white">{stats.filmsLogged}</p>
              <p className="text-sm text-gray-400">Films Logged</p>
            </div>
            <div className="glass p-6 rounded-xl">
              <MessageSquare className="w-8 h-8 text-[#E8C547] mb-4" />
              <p className="text-3xl font-bold text-white">{stats.reviewsWritten}</p>
              <p className="text-sm text-gray-400">Reviews Written</p>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-dark pl-10 w-full max-w-md"
              />
            </div>

            {/* Users List */}
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8C547] to-[#00C8FF] flex items-center justify-center text-sm font-medium text-[#0a0a0b]">
                      {u.displayName?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{u.displayName}</span>
                        <RoleBadge role={u.role} size="sm" />
                        {u.isBanned && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                            Banned
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">@{u.username} • {u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Quick actions would go here */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commands Tab */}
        {activeTab === 'commands' && (
          <div className="space-y-4">
            <div className="glass p-4 rounded-xl">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[#E8C547]" />
                Owner Commands
              </h3>
              
              {/* Command input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
                  placeholder="Enter command (e.g., /stats, /promote @user patron)"
                  className="input-dark flex-1"
                />
                <button
                  onClick={handleCommand}
                  disabled={loading}
                  className="btn-primary flex items-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-[#0a0a0b] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Execute
                    </>
                  )}
                </button>
              </div>

              {/* Command output */}
              {commandOutput.length > 0 && (
                <div className="bg-black/50 rounded-lg p-4 font-mono text-sm space-y-1 max-h-64 overflow-y-auto">
                  {commandOutput.map((line, i) => (
                    <div
                      key={i}
                      className={line.startsWith('>') ? 'text-[#E8C547]' : line.startsWith('Error') ? 'text-red-400' : 'text-gray-300'}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}

              {/* Command reference */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Available Commands:</h4>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <code className="text-gray-300">/stats</code>
                  <span className="text-gray-500">Show site statistics</span>
                  <code className="text-gray-300">/promote @user {'<patron|pro|lifetime>'}</code>
                  <span className="text-gray-500">Promote a user</span>
                  <code className="text-gray-300">/demote @user</code>
                  <span className="text-gray-500">Demote a user to free</span>
                  <code className="text-gray-300">/ban @user</code>
                  <span className="text-gray-500">Ban a user</span>
                  <code className="text-gray-300">/unban @user</code>
                  <span className="text-gray-500">Unban a user</span>
                  <code className="text-gray-300">/broadcast {'<message>'}</code>
                  <span className="text-gray-500">Send site-wide announcement</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
