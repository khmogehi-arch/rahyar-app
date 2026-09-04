import { createContext, useContext, useState, useCallback } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [username, setUsername] = useState(() => localStorage.getItem('rahyar_admin_username'));

  const login = useCallback(async (usernameInput, password) => {
    const { data } = await client.post('/auth/login', { username: usernameInput, password });
    localStorage.setItem('rahyar_admin_token', data.token);
    localStorage.setItem('rahyar_admin_username', data.username);
    setUsername(data.username);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('rahyar_admin_token');
    localStorage.removeItem('rahyar_admin_username');
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ username, login, logout, isAuthenticated: !!username }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
