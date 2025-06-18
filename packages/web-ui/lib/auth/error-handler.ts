export enum AuthErrorType {
  INVALID_EMAIL = 'INVALID_EMAIL',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  WRONG_PASSWORD = 'WRONG_PASSWORD',
  EMAIL_ALREADY_IN_USE = 'EMAIL_ALREADY_IN_USE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  CREDENTIAL_TOO_OLD = 'CREDENTIAL_TOO_OLD',
  ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL = 'ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  userMessage: string;
  originalError?: unknown;
  timestamp: Date;
  recoverable: boolean;
  retryAfter?: number; // seconds
  context?: Record<string, any>;
}

export interface ErrorRecoveryAction {
  type: 'retry' | 'redirect' | 'refresh' | 'manual';
  label: string;
  action: () => void | Promise<void>;
}

export class AuthErrorHandler {
  private static readonly ERROR_LOG_KEY = 'auth_error_log';
  private static readonly MAX_LOG_ENTRIES = 100;

  static handleFirebaseError(error: any, context?: Record<string, any>): AuthError {
    const timestamp = new Date();
    const baseError = {
      originalError: error,
      timestamp,
      context: context || {}
    };

    switch (error?.code) {
      case 'auth/user-not-found':
        return {
          ...baseError,
          type: AuthErrorType.USER_NOT_FOUND,
          message: 'User account not found',
          userMessage: 'アカウントが見つかりません。メールアドレスを確認するか、新規アカウントを作成してください。',
          recoverable: true
        };

      case 'auth/wrong-password':
        return {
          ...baseError,
          type: AuthErrorType.WRONG_PASSWORD,
          message: 'Incorrect password provided',
          userMessage: 'パスワードが正しくありません。再度入力してください。',
          recoverable: true
        };

      case 'auth/email-already-in-use':
        return {
          ...baseError,
          type: AuthErrorType.EMAIL_ALREADY_IN_USE,
          message: 'Email address is already registered',
          userMessage: 'このメールアドレスは既に使用されています。サインインするか、別のメールアドレスを使用してください。',
          recoverable: true
        };

      case 'auth/weak-password':
        return {
          ...baseError,
          type: AuthErrorType.WEAK_PASSWORD,
          message: 'Password is too weak',
          userMessage: 'パスワードが弱すぎます。より強力なパスワードを設定してください。',
          recoverable: true
        };

      case 'auth/invalid-email':
        return {
          ...baseError,
          type: AuthErrorType.INVALID_EMAIL,
          message: 'Invalid email address format',
          userMessage: 'メールアドレスの形式が正しくありません。',
          recoverable: true
        };

      case 'auth/network-request-failed':
        return {
          ...baseError,
          type: AuthErrorType.NETWORK_ERROR,
          message: 'Network connection failed',
          userMessage: 'ネットワークエラーが発生しました。インターネット接続を確認して再試行してください。',
          recoverable: true,
          retryAfter: 5
        };

      case 'auth/too-many-requests':
        return {
          ...baseError,
          type: AuthErrorType.TOO_MANY_REQUESTS,
          message: 'Too many failed login attempts',
          userMessage: 'ログイン試行回数が上限に達しました。しばらく待ってから再試行してください。',
          recoverable: true,
          retryAfter: 300 // 5 minutes
        };

      case 'auth/user-disabled':
        return {
          ...baseError,
          type: AuthErrorType.ACCOUNT_DISABLED,
          message: 'User account has been disabled',
          userMessage: 'このアカウントは無効化されています。サポートにお問い合わせください。',
          recoverable: false
        };

      case 'auth/operation-not-allowed':
        return {
          ...baseError,
          type: AuthErrorType.OPERATION_NOT_ALLOWED,
          message: 'Operation not allowed',
          userMessage: 'この操作は許可されていません。',
          recoverable: false
        };

      case 'auth/requires-recent-login':
        return {
          ...baseError,
          type: AuthErrorType.CREDENTIAL_TOO_OLD,
          message: 'Credential is too old, recent authentication required',
          userMessage: '認証情報が古くなっています。再度ログインしてください。',
          recoverable: true
        };

      case 'auth/account-exists-with-different-credential':
        return {
          ...baseError,
          type: AuthErrorType.ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL,
          message: 'Account exists with different sign-in method',
          userMessage: '異なるサインイン方法で登録されたアカウントが既に存在します。',
          recoverable: true
        };

      default:
        return {
          ...baseError,
          type: AuthErrorType.UNKNOWN_ERROR,
          message: error?.message || 'Unknown authentication error',
          userMessage: '予期しないエラーが発生しました。しばらく待ってから再試行してください。',
          recoverable: true,
          retryAfter: 10
        };
    }
  }

  static handleNetworkError(error: any, context?: Record<string, any>): AuthError {
    return {
      type: AuthErrorType.NETWORK_ERROR,
      message: 'Network connection failed',
      userMessage: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
      originalError: error,
      timestamp: new Date(),
      recoverable: true,
      retryAfter: 5,
      context: context || {}
    };
  }

  static handleValidationError(field: string, value: any, context?: Record<string, any>): AuthError {
    let type: AuthErrorType;
    let message: string;
    let userMessage: string;

    switch (field) {
      case 'email':
        type = AuthErrorType.INVALID_EMAIL;
        message = 'Invalid email format';
        userMessage = 'メールアドレスの形式が正しくありません。';
        break;
      case 'password':
        type = AuthErrorType.WEAK_PASSWORD;
        message = 'Password does not meet requirements';
        userMessage = 'パスワードが要件を満たしていません。';
        break;
      default:
        type = AuthErrorType.UNKNOWN_ERROR;
        message = `Validation failed for field: ${field}`;
        userMessage = '入力内容に問題があります。';
    }

    return {
      type,
      message,
      userMessage,
      timestamp: new Date(),
      recoverable: true,
      context: { field, value, ...context }
    };
  }

  static logError(error: AuthError): void {
    // Log to console for development
    console.error('[Auth Error]', {
      type: error.type,
      message: error.message,
      timestamp: error.timestamp,
      recoverable: error.recoverable,
      context: error.context
    });

    // Store in localStorage for error tracking
    try {
      const existingLogs = this.getErrorLogs();
      const newLog = {
        type: error.type,
        message: error.message,
        userMessage: error.userMessage,
        timestamp: error.timestamp.toISOString(),
        recoverable: error.recoverable,
        retryAfter: error.retryAfter,
        context: error.context
      };

      existingLogs.push(newLog);

      // Keep only the most recent entries
      if (existingLogs.length > this.MAX_LOG_ENTRIES) {
        existingLogs.splice(0, existingLogs.length - this.MAX_LOG_ENTRIES);
      }

      localStorage.setItem(this.ERROR_LOG_KEY, JSON.stringify(existingLogs));
    } catch (storageError) {
      console.warn('Failed to store error log:', storageError);
    }
  }

  static getErrorLogs(): any[] {
    try {
      const logs = localStorage.getItem(this.ERROR_LOG_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  static clearErrorLogs(): void {
    localStorage.removeItem(this.ERROR_LOG_KEY);
  }

  static getRecoveryActions(error: AuthError): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    if (!error.recoverable) {
      return actions;
    }

    switch (error.type) {
      case AuthErrorType.NETWORK_ERROR:
        actions.push({
          type: 'retry',
          label: '再試行',
          action: () => window.location.reload()
        });
        break;

      case AuthErrorType.WRONG_PASSWORD:
      case AuthErrorType.USER_NOT_FOUND:
        actions.push({
          type: 'manual',
          label: 'パスワードリセット',
          action: () => {
            // Implement password reset logic
            console.log('Navigate to password reset');
          }
        });
        break;

      case AuthErrorType.EMAIL_ALREADY_IN_USE:
        actions.push({
          type: 'redirect',
          label: 'サインインページへ',
          action: () => {
            // Navigate to sign in page
            console.log('Navigate to sign in');
          }
        });
        break;

      case AuthErrorType.CREDENTIAL_TOO_OLD:
        actions.push({
          type: 'redirect',
          label: '再ログイン',
          action: () => {
            // Navigate to login page
            console.log('Navigate to login');
          }
        });
        break;

      case AuthErrorType.TOO_MANY_REQUESTS:
        if (error.retryAfter) {
          actions.push({
            type: 'retry',
            label: `${error.retryAfter}秒後に再試行`,
            action: async () => {
              await new Promise(resolve => setTimeout(resolve, error.retryAfter! * 1000));
              window.location.reload();
            }
          });
        }
        break;

      default:
        actions.push({
          type: 'retry',
          label: '再試行',
          action: () => window.location.reload()
        });
    }

    return actions;
  }

  static shouldRetryAutomatically(error: AuthError): boolean {
    const retryableTypes = [
      AuthErrorType.NETWORK_ERROR,
      AuthErrorType.UNKNOWN_ERROR
    ];

    return retryableTypes.includes(error.type) && error.recoverable;
  }

  static getRetryDelay(error: AuthError, attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = error.retryAfter || 1;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return Math.min(exponentialDelay * 1000 + jitter, 30000); // Cap at 30 seconds
  }

  static formatErrorForUser(error: AuthError): {
    title: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  } {
    let severity: 'error' | 'warning' | 'info' = 'error';

    if (error.recoverable) {
      severity = error.type === AuthErrorType.NETWORK_ERROR ? 'warning' : 'error';
    }

    const title = this.getErrorTitle(error.type);

    return {
      title,
      message: error.userMessage,
      severity
    };
  }

  private static getErrorTitle(type: AuthErrorType): string {
    switch (type) {
      case AuthErrorType.NETWORK_ERROR:
        return 'ネットワークエラー';
      case AuthErrorType.INVALID_EMAIL:
        return 'メールアドレスエラー';
      case AuthErrorType.WEAK_PASSWORD:
        return 'パスワードエラー';
      case AuthErrorType.USER_NOT_FOUND:
        return 'ユーザーが見つかりません';
      case AuthErrorType.WRONG_PASSWORD:
        return 'パスワードが正しくありません';
      case AuthErrorType.EMAIL_ALREADY_IN_USE:
        return 'メールアドレスが使用済みです';
      case AuthErrorType.TOO_MANY_REQUESTS:
        return 'アクセス制限';
      case AuthErrorType.ACCOUNT_DISABLED:
        return 'アカウントが無効です';
      default:
        return '認証エラー';
    }
  }
}