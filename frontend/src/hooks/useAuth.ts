import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/api';
import type { User } from '@/types';

export function useAuth() {
  const hasToken = !!localStorage.getItem('token');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasToken); // only show loader if token exists
  const navigate = useNavigate();

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const u = await authService.getMe();
      setUser(u);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/', { replace: true });
  }, [navigate]);

  const login = useCallback(() => {
    window.location.href = authService.getLoginUrl();
  }, []);

  return { user, loading, logout, login, refetch: fetchUser };
}