// Main auth module exports
export { AuthManager } from './auth-manager';
export { AccountManager } from './account-manager';
export { SecurityManager } from './security';
export { AuthErrorHandler, AuthErrorType } from './error-handler';
export { AuthCache, AuthDataCache, PersistentCache, CacheMonitor } from './cache';
export * from './types';
export type { AuthError } from './error-handler';

// Re-export hooks and components
export { useAuthForm } from '../../components/auth/hooks/useAuthForm';
export { default as AuthErrorBoundary } from '../../components/auth/ErrorBoundary';
export { default as LoadingSpinner, ButtonSpinner, FormSkeleton } from '../../components/auth/LoadingSpinner';

// Convenience re-exports
export type { 
  FormValidationError, 
  FormState, 
  UseAuthFormOptions 
} from '../../components/auth/hooks/useAuthForm';