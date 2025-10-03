import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  trustScore: number;
  bio?: string;
  address?: any;
  location?: any;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthState({ user: null, loading: false, isAuthenticated: false });
        return;
      }

      try {
        const response = await api.get('/auth/me');
        const user = response.data.data.user;
        setAuthState({ user, loading: false, isAuthenticated: true });
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthState({ user: null, loading: false, isAuthenticated: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setAuthState({ user, loading: false, isAuthenticated: true });
      toast.success('Welcome back!');
      
      return { success: true, user };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    try {
      const response = await api.post('/auth/register', data);
      const { token, user } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setAuthState({ user, loading: false, isAuthenticated: true });
      toast.success('Account created successfully!');
      
      return { success: true, user };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthState({ user: null, loading: false, isAuthenticated: false });
    toast.success('Logged out successfully');
  };

  return {
    user: authState.user,
    loading: authState.loading,
    isAuthenticated: authState.isAuthenticated,
    login,
    register,
    logout,
  };
};