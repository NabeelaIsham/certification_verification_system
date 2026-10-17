import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authService } from '../services/auth';
import { notify } from '../services/notifications';

export const AuthContext = createContext();
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionVersion = useRef(0);
  const acceptUser = userData => {
    sessionVersion.current += 1;
    setUser(userData);
    setLoading(false);
    if (userData) localStorage.setItem('user', JSON.stringify(userData));
    else localStorage.removeItem('user');
  };
  const checkAuthStatus = async () => {
    const version = sessionVersion.current;
    try {
      const current = await authService.getCurrentUser();
      if (version === sessionVersion.current) acceptUser(current);
    }
    catch { if (version === sessionVersion.current) acceptUser(null); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    localStorage.removeItem('token'); // Remove credentials left by older releases.
    checkAuthStatus();
    const expired = () => acceptUser(null);
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, []);
  const login = async (email, password) => {
    try {
      const response = await authService.login({ email, password });
      if (!response.requiresTwoFactor) acceptUser(response.user);
      return response;
    } catch (error) { return { success: false, error: error.userMessage || error.message }; }
  };
  const logout = async () => {
    try {
      await authService.logout();
      acceptUser(null);
      return true;
    } catch {
      notify('Unable to sign out. Check your connection and try again.');
      return false;
    }
  };
  const register = async data => authService.register(data);
  return <AuthContext.Provider value={{ user, loading, isAuthenticated: Boolean(user), login, register, logout, checkAuthStatus, acceptUser }}>{children}</AuthContext.Provider>;
};
