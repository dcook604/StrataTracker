import LogRocket from 'logrocket';
// @ts-expect-error - Type declarations for logrocket-react are not available
import setupLogRocketReact from 'logrocket-react';

// Initialize LogRocket only if we have an app ID and we're not in test environment
const LOGROCKET_APP_ID = import.meta.env.VITE_LOGROCKET_APP_ID;
const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEVELOPMENT = import.meta.env.DEV;

let isInitialized = false;

interface UserData {
  id: string;
  email?: string;
}

export const initializeLogRocket = () => {
  // Only initialize in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  // Don't initialize multiple times
  if (isInitialized) {
    return;
  }

  // Only initialize if we have an app ID
  if (!LOGROCKET_APP_ID) {
    if (IS_DEVELOPMENT) {
      console.warn('LogRocket: VITE_LOGROCKET_APP_ID environment variable not set');
    }
    return;
  }

  try {
    // Initialize LogRocket
    LogRocket.init(LOGROCKET_APP_ID, {
      // Configure based on environment
      console: {
        isEnabled: {
          log: IS_DEVELOPMENT,
          info: IS_DEVELOPMENT,
          warn: true,
          error: true,
        }
      },
      network: {
        isEnabled: true,
        // Sanitize sensitive data
        requestSanitizer: (request) => {
          // Remove sensitive headers
          if (request.headers?.authorization) {
            request.headers.authorization = '[REDACTED]';
          }
          if (request.headers?.cookie) {
            request.headers.cookie = '[REDACTED]';
          }
          return request;
        },
        responseSanitizer: (response) => {
          // Remove sensitive response data
          if (response.headers?.['set-cookie']) {
            response.headers['set-cookie'] = '[REDACTED]';
          }
          return response;
        }
      }
    });

    // Setup React plugin for component tracking
    setupLogRocketReact(LogRocket);

    isInitialized = true;
    
    if (IS_DEVELOPMENT) {
      console.log('LogRocket initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize LogRocket:', error);
  }
};

// User identification helper
export const identifyUser = (user: UserData) => {
  if (!isInitialized) {
    return;
  }

  try {
    LogRocket.identify(user.id, {
      email: user.email,
    });

    if (IS_DEVELOPMENT) {
      console.log('LogRocket user identified:', user.email);
    }
  } catch (error) {
    console.error('Failed to identify user in LogRocket:', error);
  }
};

// Custom error tracking
export const captureException = (error: Error, extra?: Record<string, any>) => {
  if (!isInitialized) {
    return;
  }

  try {
    LogRocket.captureException(error, {
      extra: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...extra
      }
    });
  } catch (err) {
    console.error('Failed to capture exception in LogRocket:', err);
  }
};

// Track custom events
export const track = (eventName: string, properties?: Record<string, any>) => {
  if (!isInitialized) {
    return;
  }

  try {
    LogRocket.track(eventName, {
      timestamp: new Date().toISOString(),
      ...properties
    });
  } catch (error) {
    console.error('Failed to track event in LogRocket:', error);
  }
};

// Get session URL for support
export const getSessionURL = (): string | null => {
  if (!isInitialized) {
    return null;
  }

  try {
    return LogRocket.sessionURL || null;
  } catch (error) {
    console.error('Failed to get LogRocket session URL:', error);
    return null;
  }
};

export default {
  initialize: initializeLogRocket,
  identifyUser,
  captureException,
  track,
  getSessionURL
}; 