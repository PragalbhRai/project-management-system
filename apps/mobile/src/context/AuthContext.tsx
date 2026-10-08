import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  apiClient,
  setOnUnauthorizedCallback,
  type User,
  type LoginDto,
  type RegisterDto,
  ApiError,
} from '../lib/api';
import { getToken, saveToken, deleteToken } from '../lib/secureStore';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  sessionExpiredMessage: string | null;
  clearSessionExpiredMessage: () => void;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  const clearSession = useCallback(async (isExpired = false) => {
    await deleteToken();
    setToken(null);
    setUser(null);
    if (isExpired) {
      setSessionExpiredMessage('Your session has expired. Please log in again.');
    }
  }, []);

  const clearSessionExpiredMessage = useCallback(() => {
    setSessionExpiredMessage(null);
  }, []);

  // Handle 401 callbacks from ApiClient
  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      clearSession(true);
    });
  }, [clearSession]);

  // Restore session on mount
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const storedToken = await getToken();
        if (!storedToken) {
          if (isMounted) setIsLoading(false);
          return;
        }

        if (isMounted) setToken(storedToken);

        // Validate token against backend /api/auth/me
        const currentUser = await apiClient.auth.me();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiError && err.statusCode === 401) {
            await clearSession(true);
          } else {
            await clearSession(false);
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
    await saveToken(res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
    setSessionExpiredMessage(null);
  };

  const register = async (data: RegisterDto) => {
    const res = await apiClient.auth.register(data);
    await saveToken(res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
    setSessionExpiredMessage(null);
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient.auth.logout();
      }
    } catch {
      // ignore network errors on logout
    } finally {
      await clearSession(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        sessionExpiredMessage,
        clearSessionExpiredMessage,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
