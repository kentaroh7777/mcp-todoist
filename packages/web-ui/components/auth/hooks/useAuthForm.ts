import { useState, useCallback } from 'react';
import { AuthError, AuthErrorHandler } from '@/lib/auth/error-handler';
import { SecurityManager } from '@/lib/auth/security';

export interface FormValidationError {
  field: string;
  message: string;
}

export interface FormState {
  loading: boolean;
  errors: Record<string, string>;
  fieldErrors: FormValidationError[];
  touched: Record<string, boolean>;
  submitCount: number;
  isValid: boolean;
}

export interface UseAuthFormOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
  maxRetries?: number;
}

export function useAuthForm(options: UseAuthFormOptions = {}) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300,
    maxRetries = 3
  } = options;

  const [formState, setFormState] = useState<FormState>({
    loading: false,
    errors: {},
    fieldErrors: [],
    touched: {},
    submitCount: 0,
    isValid: false
  });

  const [retryCount, setRetryCount] = useState(0);

  const validateField = useCallback((field: string, value: string): FormValidationError | null => {
    switch (field) {
      case 'email':
        if (!value) {
          return { field, message: 'メールアドレスを入力してください' };
        }
        const sanitizedEmail = SecurityManager.sanitizeEmail(value);
        if (sanitizedEmail !== value) {
          return { field, message: 'メールアドレスに無効な文字が含まれています' };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
          return { field, message: 'メールアドレスの形式が正しくありません' };
        }
        break;

      case 'password':
        if (!value) {
          return { field, message: 'パスワードを入力してください' };
        }
        const passwordValidation = SecurityManager.validatePasswordStrength(value);
        if (!passwordValidation.isValid) {
          return { field, message: passwordValidation.issues[0] };
        }
        break;

      case 'confirmPassword':
        // This requires the original password to be passed in somehow
        // For now, we'll handle this in the component
        if (!value) {
          return { field, message: 'パスワード確認を入力してください' };
        }
        break;

      default:
        if (!value) {
          return { field, message: 'この項目は必須です' };
        }
    }

    return null;
  }, []);

  const validateForm = useCallback((values: Record<string, string>): FormValidationError[] => {
    const errors: FormValidationError[] = [];

    Object.entries(values).forEach(([field, value]) => {
      const error = validateField(field, value);
      if (error) {
        errors.push(error);
      }
    });

    // Special case for password confirmation
    if (values.password && values.confirmPassword && values.password !== values.confirmPassword) {
      errors.push({
        field: 'confirmPassword',
        message: 'パスワードが一致しません'
      });
    }

    return errors;
  }, [validateField]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      touched: { ...prev.touched, [field]: true }
    }));

    if (validateOnChange) {
      const error = validateField(field, value);
      setFormState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [field]: error ? error.message : ''
        },
        fieldErrors: prev.fieldErrors.filter(e => e.field !== field).concat(error ? [error] : [])
      }));
    }
  }, [validateField, validateOnChange]);

  const handleFieldBlur = useCallback((field: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      touched: { ...prev.touched, [field]: true }
    }));

    if (validateOnBlur) {
      const error = validateField(field, value);
      setFormState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [field]: error ? error.message : ''
        },
        fieldErrors: prev.fieldErrors.filter(e => e.field !== field).concat(error ? [error] : [])
      }));
    }
  }, [validateField, validateOnBlur]);

  const handleSubmit = useCallback(async (
    values: Record<string, string>,
    submitFn: (values: Record<string, string>) => Promise<void>,
    onSuccess?: (result?: any) => void,
    onError?: (error: AuthError) => void
  ) => {
    setFormState(prev => ({
      ...prev,
      loading: true,
      errors: {},
      fieldErrors: [],
      submitCount: prev.submitCount + 1
    }));

    try {
      // Validate all fields
      const validationErrors = validateForm(values);
      if (validationErrors.length > 0) {
        const errorMap: Record<string, string> = {};
        validationErrors.forEach(error => {
          errorMap[error.field] = error.message;
        });

        setFormState(prev => ({
          ...prev,
          loading: false,
          errors: errorMap,
          fieldErrors: validationErrors,
          isValid: false
        }));
        return;
      }

      // Check rate limiting
      const rateLimitCheck = SecurityManager.checkRateLimiting(values.email || 'anonymous');
      if (!rateLimitCheck.allowed) {
        const error = AuthErrorHandler.handleValidationError('rate_limit', values.email, {
          remainingAttempts: rateLimitCheck.remainingAttempts,
          lockoutEnd: rateLimitCheck.lockoutEnd
        });
        
        AuthErrorHandler.logError(error);
        
        setFormState(prev => ({
          ...prev,
          loading: false,
          errors: { general: error.userMessage },
          isValid: false
        }));
        
        onError?.(error);
        return;
      }

      // Sanitize input values
      const sanitizedValues = Object.entries(values).reduce((acc, [key, value]) => {
        if (key === 'email') {
          acc[key] = SecurityManager.sanitizeEmail(value);
        } else {
          acc[key] = SecurityManager.sanitizeUserInput(value);
        }
        return acc;
      }, {} as Record<string, string>);

      // Execute submit function
      await submitFn(sanitizedValues);
      
      // Clear failed attempts on success
      if (values.email) {
        SecurityManager.clearFailedAttempts(values.email);
      }
      
      setFormState(prev => ({
        ...prev,
        loading: false,
        isValid: true
      }));
      
      setRetryCount(0);
      onSuccess?.();

    } catch (error) {
      const authError = AuthErrorHandler.handleFirebaseError(error, {
        submitCount: formState.submitCount + 1,
        retryCount
      });
      
      AuthErrorHandler.logError(authError);
      
      // Record failed attempt for rate limiting
      if (values.email) {
        SecurityManager.recordFailedAttempt(values.email);
      }

      setFormState(prev => ({
        ...prev,
        loading: false,
        errors: { general: authError.userMessage },
        isValid: false
      }));

      // Handle automatic retry for certain errors
      if (AuthErrorHandler.shouldRetryAutomatically(authError) && retryCount < maxRetries) {
        const retryDelay = AuthErrorHandler.getRetryDelay(authError, retryCount + 1);
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          handleSubmit(values, submitFn, onSuccess, onError);
        }, retryDelay);
      } else {
        onError?.(authError);
      }
    }
  }, [formState.submitCount, retryCount, maxRetries, validateForm]);

  const clearErrors = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      errors: {},
      fieldErrors: []
    }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFormState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: '' },
      fieldErrors: prev.fieldErrors.filter(e => e.field !== field)
    }));
  }, []);

  const reset = useCallback(() => {
    setFormState({
      loading: false,
      errors: {},
      fieldErrors: [],
      touched: {},
      submitCount: 0,
      isValid: false
    });
    setRetryCount(0);
  }, []);

  const getFieldProps = useCallback((field: string) => ({
    onChange: (value: string) => handleFieldChange(field, value),
    onBlur: (value: string) => handleFieldBlur(field, value),
    error: formState.errors[field],
    touched: formState.touched[field]
  }), [formState.errors, formState.touched, handleFieldChange, handleFieldBlur]);

  return {
    formState,
    handleSubmit,
    clearErrors,
    clearFieldError,
    reset,
    getFieldProps,
    retryCount,
    validateField,
    validateForm
  };
}