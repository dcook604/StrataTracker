import React, { createContext, useContext, useState, useCallback } from 'react';

interface LoadingState {
  [key: string]: {
    isLoading: boolean;
    message?: string;
  };
}

interface LoadingContextType {
  // State
  loadingStates: LoadingState;
  
  // Actions
  setLoading: (key: string, isLoading: boolean, message?: string) => void;
  clearLoading: (key: string) => void;
  clearAllLoading: () => void;
  
  // Helpers
  isLoading: (key: string) => boolean;
  isAnyLoading: () => boolean;
  getLoadingMessage: (key: string) => string | undefined;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  const setLoading = useCallback((key: string, isLoading: boolean, message?: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        isLoading,
        message: message || (isLoading ? 'Loading...' : undefined)
      }
    }));
  }, []);

  const clearLoading = useCallback((key: string) => {
    setLoadingStates(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllLoading = useCallback(() => {
    setLoadingStates({});
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key]?.isLoading ?? false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(state => state.isLoading);
  }, [loadingStates]);

  const getLoadingMessage = useCallback((key: string) => {
    return loadingStates[key]?.message;
  }, [loadingStates]);

  const value: LoadingContextType = {
    loadingStates,
    setLoading,
    clearLoading,
    clearAllLoading,
    isLoading,
    isAnyLoading,
    getLoadingMessage
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

// Custom hook for async operations with loading states
export function useAsyncLoading(key: string) {
  const { setLoading, isLoading, getLoadingMessage } = useLoading();

  const executeWithLoading = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    loadingMessage?: string
  ): Promise<T> => {
    try {
      setLoading(key, true, loadingMessage);
      const result = await asyncFn();
      return result;
    } finally {
      setLoading(key, false);
    }
  }, [key, setLoading]);

  return {
    executeWithLoading,
    isLoading: isLoading(key),
    loadingMessage: getLoadingMessage(key)
  };
} 