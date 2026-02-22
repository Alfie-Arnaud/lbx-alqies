import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Navbar } from '@/components/Navbar';
import { Toaster } from 'sonner';
import { X, Megaphone, ShieldBan } from 'lucide-react';
// Pages
import { Home } from '@/pages/Home';
import { Film } from '@/pages/Film';
import { Search } from '@/pages/Search';
import { Profile } from '@/pages/Profile';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Admin } from '@/pages/Admin';
import { Top250Page } from '@/pages/Top250Page';
import { Banned } from '@/pages/Banned';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_by_username: string;
}

function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [fading, setFading] = useState<number[]>([]);
  const [dismissed, setDismissed] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]'); }
    catch { return []; }
  });
  const seenRef = useRef<number[]>([]);

  const dismiss = (id: number) => {
    const current = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
    if (current.includes(id)) return;
    const next = [...current, id];
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(next));
    setDismissed(next);
    setFading(p => p.filter(x => x !== id));
  };

  const fetchAnnouncements = () => {
    fetch(`${API}/admin/announcements`)
      .then(r => r.json())
      .then(d => {
        const list: Announcement[] = d.announcements || [];
        const currentDismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
        setAnnouncements(list);
        setDismissed(currentDismissed);
        list.forEach(a => {
          if (!currentDismissed.includes(a.id) && !seenRef.current.includes(a.id)) {
            seenRef.current.push(a.id);
            setTimeout(() => {
              setFading(p => [...p, a.id]);
              setTimeout(() => dismiss(a.id), 800);
            }, 5000);
          }
        });
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 10000);
    return () => clearInterval(interval);
  }, []);

  const visible = announcements.filter(a => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col">
      {visible.map(a => (
        <div key={a.id}
          className="flex items-center gap-3 px-4 py-2.5 text-sm"
          style={{
            background: 'linear-gradient(90deg, #E8C547 0%, #00C8FF 100%)',
            opacity: fading.includes(a.id) ? 0 : 1,
            transform: fading.includes(a.id) ? 'translateY(-100%)' : 'translateY(0)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}>
          <Megaphone className="w-4 h-4 text-[#0a0a0b] flex-shrink-0" />
          <span className="font-semibold text-[#0a0a0b]">{a.title}:</span>
          <span className="text-[#0a0a0b] flex-1">{a.content}</span>
          <button onClick={() => { setFading(p => [...p, a.id]); setTimeout(() => dismiss(a.id), 800); }}
            className="text-[#0a0a0b]/60 hover:text-[#0a0a0b] transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function BanBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.isBanned) {
      const timer = setTimeout(() => navigate('/banned'), 3000);
      return () => clearTimeout(timer);
    }
  }, [user?.isBanned, navigate]);

  if (!user?.isBanned) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 text-sm"
        style={{ background: 'linear-gradient(90deg, #dc2626 0%, #7f1d1d 100%)' }}>
        <ShieldBan className="w-4 h-4 text-white flex-shrink-0" />
        <span className="font-bold text-white">Akun kamu telah di-banned.</span>
        {user.banReason && (
          <span className="text-white/90">Alasan: <span className="font-semibold">{user.banReason}</span></span>
        )}
        {user.banExpiresAt && (
          <span className="text-white/80">· Berakhir: {new Date(user.banExpiresAt).toLocaleDateString('id-ID')}</span>
        )}
        <span className="text-white/60 ml-auto">Mengalihkan dalam 3 detik...</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, requireOwner = false }: { children: React.ReactNode; requireOwner?: boolean }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E8C547] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.isBanned) return <Navigate to="/banned" replace />;
  if (requireOwner && user?.role !== 'owner' && user?.role !== 'higher_admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <div className="vignette" />
      <BanBanner />
      <AnnouncementBanner />
      <div className="content-wrapper">
        <Navbar />
        <main className="min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/film/:id" element={<Film />} />
            <Route path="/search" element={<Search />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/top250" element={<Top250Page />} />
            <Route path="/banned" element={<Banned />} />
            <Route path="/admin" element={
              <ProtectedRoute requireOwner>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#111113',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#E8E8E8',
        },
      }} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;