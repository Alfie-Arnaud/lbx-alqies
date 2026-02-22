import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface User {
  id: number;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  role: 'owner' | 'higher_admin' | 'admin' | 'patron' | 'pro' | 'lifetime' | 'free';
  isBanned: boolean;
  banReason: string | null;
  banExpiresAt: string | null;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  justBanned: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    justBanned: false,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }, []);

  const checkAuth = useCallback(async (silent = false) => {
    try {
      const data = await fetchWithAuth('/auth/me');
      setState(prev => {
        const wasBanned = prev.user?.isBanned;
        const nowBanned = data.user?.isBanned;
        return {
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
          justBanned: !wasBanned && nowBanned ? true : false,
        };
      });
    } catch {
      if (!silent) {
        setState({ user: null, isLoading: false, isAuthenticated: false, justBanned: false });
      }
    }
  }, [fetchWithAuth]);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Poll ban status every 10 seconds when logged in
  useEffect(() => {
    if (state.isAuthenticated && state.user && !state.user.isBanned) {
      pollRef.current = setInterval(() => checkAuth(true), 10000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [state.isAuthenticated, state.user?.isBanned, checkAuth]);

  // Auto logout when banned (after banner shows for 3s)
  useEffect(() => {
    if (state.user?.isBanned) {
      const timer = setTimeout(async () => {
        try {
          await fetchWithAuth('/auth/logout', { method: 'POST' });
        } catch {}
        setState({ user: null, isLoading: false, isAuthenticated: false, justBanned: true });
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [state.user?.isBanned, fetchWithAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setState({ user: data.user, isLoading: false, isAuthenticated: true, justBanned: false });
    if (data.user?.isBanned) throw new Error('Account is banned');
  }, [fetchWithAuth]);

  const register = useCallback(async (registerData: RegisterData) => {
    const data = await fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registerData),
    });
    setState({ user: data.user, isLoading: false, isAuthenticated: true, justBanned: false });
  }, [fetchWithAuth]);

  const logout = useCallback(async () => {
    await fetchWithAuth('/auth/logout', { method: 'POST' });
    setState({ user: null, isLoading: false, isAuthenticated: false, justBanned: false });
  }, [fetchWithAuth]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const data = await fetchWithAuth('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setState(prev => ({ ...prev, user: data.user }));
  }, [fetchWithAuth]);

  const refreshUser = useCallback(async () => {
    await checkAuth(true);
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export function useUserStats() {
  const [stats, setStats] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/stats`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  return { stats, loading, error, refetch: fetchStats };
}

export function useFollow() {
  const [loading, setLoading] = useState(false);

  const follow = useCallback(async (userId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/follow/${userId}`, { method: 'POST', credentials: 'include' });
      return res.ok;
    } catch { return false; } finally { setLoading(false); }
  }, []);

  const unfollow = useCallback(async (userId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/unfollow/${userId}`, { method: 'POST', credentials: 'include' });
      return res.ok;
    } catch { return false; } finally { setLoading(false); }
  }, []);

  const checkFollowing = useCallback(async (userId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/is-following/${userId}`, { credentials: 'include' });
      if (!res.ok) return false;
      const data = await res.json();
      return data.isFollowing;
    } catch { return false; }
  }, []);

  return { follow, unfollow, checkFollowing, loading };
}

export default useAuth;