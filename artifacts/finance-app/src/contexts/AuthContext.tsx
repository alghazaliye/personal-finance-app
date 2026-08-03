import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGetMe, setAuthTokenGetter, UserProfile, AuthResponse } from '@workspace/api-client-react';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (response: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Set the token getter for API client
  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem('accessToken'));
  }, []);

  const { data: userData, isLoading: isUserLoading, error } = useGetMe({ 
    query: { 
      enabled: !!token,
      retry: false
    } 
  });

  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData]);

  useEffect(() => {
    if (error && (error as any).status === 401) {
      handleLogout();
    }
  }, [error]);

  const handleLogin = (response: AuthResponse) => {
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    setToken(response.accessToken);
    setUser(response.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        isLoading: isUserLoading && !!token, 
        login: handleLogin, 
        logout: handleLogout 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
