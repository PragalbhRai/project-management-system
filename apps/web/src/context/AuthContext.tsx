import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  apiClient,
  getStoredToken,
  setStoredToken,
  setOnUnauthorizedCallback,
  type User,
  type LoginDto,
  type RegisterDto,
  ApiError,
} from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  const clearSession = useCallback((expired = false) => {
    setStoredToken(null);
    setTokenState(null);
    setUser(null);
    if (expired) {
      setSessionExpired(true);
    }
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  // Register unauthorized listener from api.ts
  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      clearSession(true);
    });
  }, [clearSession]);

  // Restore session on mount
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      const stored = getStoredToken();
      if (!stored) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const currentUser = await apiClient.auth.me();
        if (isMounted) {
          setUser(currentUser);
          setTokenState(stored);
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiError && err.statusCode === 401) {
            clearSession(true);
          } else {
            clearSession(false);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [clearSession]);

  const login = async (data: LoginDto) => {
    const res = await apiClient.auth.login(data);
    setStoredToken(res.accessToken);
    setTokenState(res.accessToken);
    setUser(res.user);
    setSessionExpired(false);
  };

  const register = async (data: RegisterDto) => {
    const res = await apiClient.auth.register(data);
    setStoredToken(res.accessToken);
    setTokenState(res.accessToken);
    setUser(res.user);
    setSessionExpired(false);
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient.auth.logout();
      }
    } catch {
      // ignore logout network errors
    } finally {
      clearSession(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        sessionExpired,
        clearSessionExpired,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
