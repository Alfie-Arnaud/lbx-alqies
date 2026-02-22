import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, Film, MessageSquare, BarChart3,
  Crown, UserX, UserCheck, Terminal,
  Search, Send, Megaphone, X, ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RoleBadge } from '@/components/RoleBadge';
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
interface SiteStats {
  totalUsers: number;
  totalFilms: number;
  filmsLogged: number;
  reviewsWritten: number;
}
interface UserItem {
  id: number;
  email: string;
  username: string;
  displayName: string;
  role: string;
  isBanned: boolean;
  banReason?: string;
  banExpiresAt?: string;
  createdAt: string;
}
interface Announcement {
  id: number;
  title: string;
  content: string;
  created_by_username: string;
  created_at: string;
}
interface BanModal {
  user: UserItem | null;
  open: boolean;
}
const VALID_ROLES = ['free', 'pro', 'patron', 'lifetime', 'admin', 'higher_admin'];
export function Admin() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'broadcast' | 'commands'>('overview');
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [command, setCommand] = useState('');
  const [commandOutput, setCommandOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Broadcast form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  // Ban modal
  const [banModal, setBanModal] = useState<BanModal>({ user: null, open: false });
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('permanent');
  const [banCustomDate, setBanCustomDate] = useState('');

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'owner' && user?.role !== 'higher_admin') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`${API}/admin/stats`, { credentials: 'include' })
      .then(r => r.json()).then(d => setStats(d.stats)).catch(console.error);
  }, [isAuthenticated]);
  useEffect(() => {
    if (activeTab !== 'users' || !isAuthenticated) return;
    fetch(`${API}/admin/users`, { credentials: 'include' })
      .then(r => r.json()).then(d => setUsers(d.users || [])).catch(console.error);
  }, [activeTab, isAuthenticated]);
  useEffect(() => {
    if (activeTab !== 'broadcast' || !isAuthenticated) return;
    fetch(`${API}/admin/announcements`, { credentials: 'include' })
      .then(r => r.json()).then(d => setAnnouncements(d.announcements || [])).catch(console.error);
  }, [activeTab, isAuthenticated]);

  const handleCommand = async () => {
    if (!command.trim()) return;
    setLoading(true);
    setCommandOutput(prev => [...prev, `> ${command}`]);
    try {
      const res = await fetch(`${API}/admin/command`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.stats) {
          setCommandOutput(prev => [...prev,
            `Users: ${data.stats.totalUsers} | Films: ${data.stats.totalFilms} | Logged: ${data.stats.filmsLogged} | Reviews: ${data.stats.reviewsWritten}`
          ]);
        } else {
          setCommandOutput(prev => [...prev, data.message || 'Done']);
          if (data.user) setCommandOutput(prev => [...prev, `  → @${data.user.username} is now [${data.user.role}]`]);
        }
      } else {
        setCommandOutput(prev => [...prev, `Error: ${data.error || 'Command failed'}`]);
      }
    } catch (e) {
      setCommandOutput(prev => [...prev, `Error: ${e instanceof Error ? e.message : 'Unknown error'}`]);
    } finally {
      setCommand('');
      setLoading(false);
    }
  };
  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastContent.trim()) return;
    setBroadcastSending(true);
    setBroadcastMsg('');
    try {
      const res = await fetch(`${API}/admin/broadcast`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: broadcastTitle, content: broadcastContent }),
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastMsg('✓ Broadcast sent successfully!');
        setBroadcastTitle('');
        setBroadcastContent('');
        fetch(`${API}/admin/announcements`, { credentials: 'include' })
          .then(r => r.json()).then(d => setAnnouncements(d.announcements || []));
      } else {
        setBroadcastMsg(`Error: ${data.error}`);
      }
    } catch (e) {
      setBroadcastMsg('Error: Failed to send broadcast');
    } finally {
      setBroadcastSending(false);
    }
  };
  const deactivateAnnouncement = async (id: number) => {
    await fetch(`${API}/admin/announcements/${id}/deactivate`, {
      method: 'PATCH', credentials: 'include'
    });
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };
  const changeUserRole = async (username: string, role: string) => {
    const endpoint = role === 'free' ? '/admin/demote' : '/admin/promote';
    const res = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, role }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.username === username ? { ...u, role } : u));
    }
  };

  const openBanModal = (u: UserItem) => {
    setBanModal({ user: u, open: true });
    setBanReason('');
    setBanDuration('permanent');
    setBanCustomDate('');
  };

  const closeBanModal = () => {
    setBanModal({ user: null, open: false });
  };

  const handleBan = async () => {
    if (!banModal.user) return;
    let expiresAt: string | null = null;
    if (banDuration === '1d') expiresAt = new Date(Date.now() + 86400000).toISOString();
    else if (banDuration === '7d') expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    else if (banDuration === '30d') expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    else if (banDuration === 'custom' && banCustomDate) expiresAt = new Date(banCustomDate).toISOString();

    const res = await fetch(`${API}/admin/ban`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: banModal.user.username, reason: banReason || null, expiresAt }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.username === banModal.user!.username
        ? { ...u, isBanned: true, banReason: banReason || undefined, banExpiresAt: expiresAt || undefined }
        : u
      ));
      closeBanModal();
    }
  };

  const handleUnban = async (u: UserItem) => {
    const res = await fetch(`${API}/admin/unban`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u.username }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(x => x.username === u.username
        ? { ...x, isBanned: false, banReason: undefined, banExpiresAt: undefined }
        : x
      ));
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated || (user?.role !== 'owner' && user?.role !== 'higher_admin')) {
    return <div className="min-h-screen pt-24 text-center"><p className="text-gray-400">Access denied</p></div>;
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
            <p className="text-gray-400">Manage Alfie's Basement</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-white/10 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
            { id: 'commands', label: 'Commands', icon: Terminal },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'text-[#E8C547] border-b-2 border-[#E8C547]' : 'text-gray-400 hover:text-white'
              }`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, value: stats.totalUsers, label: 'Total Users' },
              { icon: Film, value: stats.totalFilms, label: 'Films in Database' },
              { icon: BarChart3, value: stats.filmsLogged, label: 'Films Logged' },
              { icon: MessageSquare, value: stats.reviewsWritten, label: 'Reviews Written' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="glass p-6 rounded-xl">
                <Icon className="w-8 h-8 text-[#E8C547] mb-4" />
                <p className="text-3xl font-bold text-white">{value}</p>
                <p className="text-sm text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input type="text" placeholder="Search users..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-dark pl-10 w-full max-w-md" />
            </div>

            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8C547] to-[#00C8FF] flex items-center justify-center text-sm font-medium text-[#0a0a0b]">
                      {u.displayName?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white">{u.displayName}</span>
                        <RoleBadge role={u.role} size="sm" />
                        {u.isBanned && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                            Banned{u.banReason ? ` · ${u.banReason}` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">@{u.username} · {u.email}</p>
                      {u.isBanned && u.banExpiresAt && (
                        <p className="text-xs text-red-400/60">
                          Expires: {new Date(u.banExpiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {u.role !== 'owner' && (
                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        onChange={(e) => changeUserRole(u.username, e.target.value)}
                        className="input-dark text-xs py-1 px-2"
                      >
                        {VALID_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button
                        onClick={() => u.isBanned ? handleUnban(u) : openBanModal(u)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          u.isBanned ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}>
                        {u.isBanned ? <><UserCheck className="w-3 h-3" />Unban</> : <><UserX className="w-3 h-3" />Ban</>}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Broadcast */}
        {activeTab === 'broadcast' && (
          <div className="space-y-6">
            <div className="glass p-6 rounded-xl">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#E8C547]" />New Broadcast
              </h3>
              {broadcastMsg && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${broadcastMsg.startsWith('✓') ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                  {broadcastMsg}
                </div>
              )}
              <div className="space-y-3">
                <input className="input-dark w-full" placeholder="Announcement title..."
                  value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} />
                <textarea className="input-dark w-full resize-none" rows={4}
                  placeholder="Write your announcement..." value={broadcastContent}
                  onChange={e => setBroadcastContent(e.target.value)} />
                <button onClick={handleBroadcast} disabled={broadcastSending || !broadcastTitle || !broadcastContent}
                  className="btn-primary flex items-center gap-2">
                  {broadcastSending
                    ? <div className="w-4 h-4 border-2 border-[#0a0a0b] border-t-transparent rounded-full animate-spin" />
                    : <><Send className="w-4 h-4" />Send Broadcast</>}
                </button>
              </div>
            </div>

            {announcements.length > 0 && (
              <div className="glass p-6 rounded-xl">
                <h3 className="text-lg font-medium text-white mb-4">Active Announcements</h3>
                <div className="space-y-3">
                  {announcements.map(a => (
                    <div key={a.id} className="flex items-start justify-between gap-4 p-3 rounded-lg bg-white/5">
                      <div>
                        <p className="font-medium text-white text-sm">{a.title}</p>
                        <p className="text-gray-400 text-sm mt-0.5">{a.content}</p>
                        <p className="text-xs text-gray-600 mt-1">by @{a.created_by_username}</p>
                      </div>
                      <button onClick={() => deactivateAnnouncement(a.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Commands */}
        {activeTab === 'commands' && (
          <div className="glass p-4 rounded-xl space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#E8C547]" />Owner Commands
            </h3>

            <div className="flex gap-2">
              <input type="text" value={command} onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
                placeholder="/promote @user patron | /ban @user | /broadcast hello!"
                className="input-dark flex-1" />
              <button onClick={handleCommand} disabled={loading} className="btn-primary flex items-center gap-2">
                {loading
                  ? <div className="w-4 h-4 border-2 border-[#0a0a0b] border-t-transparent rounded-full animate-spin" />
                  : <><Send className="w-4 h-4" />Run</>}
              </button>
            </div>

            {commandOutput.length > 0 && (
              <div className="bg-black/50 rounded-lg p-4 font-mono text-sm space-y-1 max-h-64 overflow-y-auto">
                {commandOutput.map((line, i) => (
                  <div key={i} className={
                    line.startsWith('>') ? 'text-[#E8C547]' :
                    line.startsWith('Error') ? 'text-red-400' :
                    line.startsWith('  →') ? 'text-gray-500' : 'text-gray-300'
                  }>{line}</div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Available Commands:</h4>
              <div className="space-y-1.5 text-sm">
                {[
                  ['/stats', 'Show site statistics'],
                  ['/promote @user <role>', 'Roles: free | pro | patron | lifetime | admin | higher_admin'],
                  ['/demote @user', 'Reset user to free'],
                  ['/ban @user', 'Ban a user'],
                  ['/unban @user', 'Unban a user'],
                  ['/broadcast <message>', 'Send site-wide announcement'],
                ].map(([cmd, desc]) => (
                  <div key={cmd} className="flex gap-4">
                    <code className="text-[#E8C547] w-56 flex-shrink-0">{cmd}</code>
                    <span className="text-gray-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {banModal.open && banModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#111113] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Ban @{banModal.user.username}</h3>
              <button onClick={closeBanModal} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Reason (optional)</label>
                <input
                  className="input-dark w-full"
                  placeholder="e.g. Spamming, harassment, etc."
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: '1d', label: '1 Day' },
                    { value: '7d', label: '7 Days' },
                    { value: '30d', label: '30 Days' },
                    { value: 'permanent', label: 'Permanent' },
                    { value: 'custom', label: 'Custom Date' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setBanDuration(opt.value)}
                      className={`py-2 px-3 rounded-lg text-sm transition-colors ${
                        banDuration === opt.value
                          ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {banDuration === 'custom' && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Custom Date</label>
                  <input
                    type="date"
                    className="input-dark w-full"
                    value={banCustomDate}
                    onChange={e => setBanCustomDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={closeBanModal}
                className="flex-1 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors text-sm">
                Cancel
              </button>
              <button onClick={handleBan}
                className="flex-1 py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium">
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;