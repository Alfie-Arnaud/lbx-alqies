import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface User {
  id: number;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
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

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Fetch with credentials
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

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await fetchWithAuth('/auth/me');
        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    checkAuth();
  }, [fetchWithAuth]);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    const data = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setState({
      user: data.user,
      isLoading: false,
      isAuthenticated: true,
    });
  }, [fetchWithAuth]);

  // Register
  const register = useCallback(async (registerData: RegisterData) => {
    const data = await fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registerData),
    });

    setState({
      user: data.user,
      isLoading: false,
      isAuthenticated: true,
    });
  }, [fetchWithAuth]);

  // Logout
  const logout = useCallback(async () => {
    await fetchWithAuth('/auth/logout', { method: 'POST' });

    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, [fetchWithAuth]);

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const data = await fetchWithAuth('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    setState(prev => ({
      ...prev,
      user: data.user,
    }));
  }, [fetchWithAuth]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const data = await fetchWithAuth('/auth/me');
      setState(prev => ({
        ...prev,
        user: data.user,
      }));
    } catch {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, [fetchWithAuth]);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for user stats
export function useUserStats() {
  const [stats, setStats] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/auth/stats`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// Hook for following users
export function useFollow() {
  const [loading, setLoading] = useState(false);

  const follow = useCallback(async (userId: number) => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/auth/follow/${userId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to follow user');
      }

      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const unfollow = useCallback(async (userId: number) => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/auth/unfollow/${userId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to unfollow user');
      }

      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkFollowing = useCallback(async (userId: number) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/auth/is-following/${userId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.isFollowing;
    } catch {
      return false;
    }
  }, []);

  return { follow, unfollow, checkFollowing, loading };
}

export default useAuth;