import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/services/api';
import type { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const u = await authService.getMe();
      setUser(u);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const login = useCallback(() => {
    window.location.href = authService.getLoginUrl();
  }, []);

  return { user, loading, logout, login, refetch: fetchUser };
}
