import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from './use-toast';

interface PublicUser {
  fullName: string;
  email: string;
  role: 'owner' | 'tenant';
  unitNumber: string;
}

interface PublicAuthContextType {
  publicUser: PublicUser | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  login: (sessionId: string, userInfo: PublicUser) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const PublicAuthContext = createContext<PublicAuthContextType | undefined>(undefined);

export function PublicAuthProvider({ children }: { children: ReactNode }) {
  const [publicUser, setPublicUser] = useState<PublicUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const isAuthenticated = !!(publicUser && sessionId);

  // Check for existing session on mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem('publicSessionId');
    const storedUserInfo = localStorage.getItem('publicUserInfo');

    if (storedSessionId && storedUserInfo) {
      try {
        const userInfo = JSON.parse(storedUserInfo);
        setSessionId(storedSessionId);
        setPublicUser(userInfo);
      } catch (error) {
        console.error('Error parsing stored user info:', error);
        localStorage.removeItem('publicSessionId');
        localStorage.removeItem('publicUserInfo');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newSessionId: string, userInfo: PublicUser) => {
    setSessionId(newSessionId);
    setPublicUser(userInfo);
    localStorage.setItem('publicSessionId', newSessionId);
    localStorage.setItem('publicUserInfo', JSON.stringify(userInfo));
  };

  const logout = async () => {
    if (sessionId) {
      try {
        await fetch('/public/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Public-Session-Id': sessionId,
          },
        });
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }

    setSessionId(null);
    setPublicUser(null);
    localStorage.removeItem('publicSessionId');
    localStorage.removeItem('publicUserInfo');
    
    toast({
      title: "Logged out",
      description: "Your session has been ended successfully.",
    });
  };

  return (
    <PublicAuthContext.Provider
      value={{
        publicUser,
        sessionId,
        isAuthenticated,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </PublicAuthContext.Provider>
  );
}

export function usePublicAuth() {
  const context = useContext(PublicAuthContext);
  if (context === undefined) {
    throw new Error('usePublicAuth must be used within a PublicAuthProvider');
  }
  return context;
}

// Custom hook for making authenticated requests
export function usePublicApiRequest() {
  const { sessionId } = usePublicAuth();

  const publicApiRequest = async (method: string, url: string, data?: any) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (sessionId) {
      headers['X-Public-Session-Id'] = sessionId;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    return response;
  };

  return publicApiRequest;
} 