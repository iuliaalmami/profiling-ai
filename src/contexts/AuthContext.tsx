import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// Helper function to decode JWT token
const decodeJWT = (token: string): User | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name || payload.email?.split('@')[0] || 'User'
    };
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
};

interface User {
  id?: number;
  email?: string;
  name?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth token on app load
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      const userData = decodeJWT(savedToken);
      setToken(savedToken);
      setUser(userData);
      setIsAuthenticated(true);
    }
    setIsLoading(false); // Done checking
  }, []);

  const login = (newToken: string) => {
    const userData = decodeJWT(newToken);
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};