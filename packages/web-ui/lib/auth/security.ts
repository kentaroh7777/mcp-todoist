export class SecurityManager {
  private static readonly MIN_PASSWORD_LENGTH = 8;
  private static readonly PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  static validatePasswordStrength(password: string): {
    isValid: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 0;

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      issues.push(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters`);
    } else {
      score += 20;
    }

    if (!/[a-z]/.test(password)) {
      issues.push('Password must contain at least one lowercase letter');
    } else {
      score += 20;
    }

    if (!/[A-Z]/.test(password)) {
      issues.push('Password must contain at least one uppercase letter');
    } else {
      score += 20;
    }

    if (!/\d/.test(password)) {
      issues.push('Password must contain at least one number');
    } else {
      score += 20;
    }

    if (!/[@$!%*?&]/.test(password)) {
      issues.push('Password must contain at least one special character (@$!%*?&)');
    } else {
      score += 20;
    }

    // Bonus points for length
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.min(100, score)
    };
  }

  static encryptSensitiveData(data: string, key?: string): string {
    // Simple XOR encryption (in production, use proper encryption library)
    const encryptionKey = key || 'mcp-todoist-default-key';
    let encrypted = '';
    
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length);
      encrypted += String.fromCharCode(charCode);
    }
    
    return btoa(encrypted);
  }

  static decryptSensitiveData(encryptedData: string, key?: string): string {
    try {
      const encryptionKey = key || 'mcp-todoist-default-key';
      const decoded = atob(encryptedData);
      let decrypted = '';
      
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length);
        decrypted += String.fromCharCode(charCode);
      }
      
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt data');
    }
  }

  static sanitizeUserInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential XSS characters
      .substring(0, 255); // Limit length
  }

  static sanitizeEmail(email: string): string {
    return email
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9@._-]/g, ''); // Only allow valid email characters
  }

  static validateSessionToken(token: string, issuedAt: Date): boolean {
    const now = new Date();
    const sessionAge = now.getTime() - issuedAt.getTime();
    
    return sessionAge < this.SESSION_TIMEOUT;
  }

  static generateSecureId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static checkRateLimiting(identifier: string): {
    allowed: boolean;
    remainingAttempts: number;
    lockoutEnd?: Date;
  } {
    const key = `rate_limit_${identifier}`;
    const attemptKey = `attempts_${identifier}`;
    const lockoutKey = `lockout_${identifier}`;
    
    // Check if currently locked out
    const lockoutData = localStorage.getItem(lockoutKey);
    if (lockoutData) {
      const lockoutEnd = new Date(lockoutData);
      if (new Date() < lockoutEnd) {
        return {
          allowed: false,
          remainingAttempts: 0,
          lockoutEnd
        };
      } else {
        // Lockout expired, clear it
        localStorage.removeItem(lockoutKey);
        localStorage.removeItem(attemptKey);
      }
    }

    // Get current attempt count
    const attemptData = localStorage.getItem(attemptKey);
    const attempts = attemptData ? JSON.parse(attemptData) : { count: 0, firstAttempt: new Date() };

    // Reset if more than 1 hour has passed since first attempt
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (new Date(attempts.firstAttempt) < hourAgo) {
      attempts.count = 0;
      attempts.firstAttempt = new Date();
    }

    if (attempts.count >= this.MAX_LOGIN_ATTEMPTS) {
      // Create lockout
      const lockoutEnd = new Date(Date.now() + this.LOCKOUT_DURATION);
      localStorage.setItem(lockoutKey, lockoutEnd.toISOString());
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutEnd
      };
    }

    return {
      allowed: true,
      remainingAttempts: this.MAX_LOGIN_ATTEMPTS - attempts.count
    };
  }

  static recordFailedAttempt(identifier: string): void {
    const attemptKey = `attempts_${identifier}`;
    const attemptData = localStorage.getItem(attemptKey);
    const attempts = attemptData ? JSON.parse(attemptData) : { count: 0, firstAttempt: new Date() };
    
    attempts.count += 1;
    if (attempts.count === 1) {
      attempts.firstAttempt = new Date();
    }
    
    localStorage.setItem(attemptKey, JSON.stringify(attempts));
  }

  static clearFailedAttempts(identifier: string): void {
    const attemptKey = `attempts_${identifier}`;
    const lockoutKey = `lockout_${identifier}`;
    localStorage.removeItem(attemptKey);
    localStorage.removeItem(lockoutKey);
  }

  static detectSuspiciousActivity(events: Array<{
    type: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>): {
    isSuspicious: boolean;
    reasons: string[];
    riskScore: number;
  } {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check for rapid successive login attempts
    const recentLogins = events.filter(e => 
      e.type === 'login_attempt' && 
      new Date().getTime() - e.timestamp.getTime() < 5 * 60 * 1000 // 5 minutes
    );

    if (recentLogins.length > 10) {
      reasons.push('Excessive login attempts in short time period');
      riskScore += 50;
    }

    // Check for failed login patterns
    const recentFailures = events.filter(e => 
      e.type === 'login_failure' && 
      new Date().getTime() - e.timestamp.getTime() < 30 * 60 * 1000 // 30 minutes
    );

    if (recentFailures.length > 5) {
      reasons.push('Multiple failed login attempts');
      riskScore += 30;
    }

    // Check for unusual access patterns
    const accessTimes = events
      .filter(e => e.type === 'login_success')
      .map(e => e.timestamp.getHours());

    if (accessTimes.length > 0) {
      const averageHour = accessTimes.reduce((a, b) => a + b, 0) / accessTimes.length;
      const currentHour = new Date().getHours();
      
      // Flag if accessing at unusual hours (more than 6 hours from average)
      if (Math.abs(currentHour - averageHour) > 6) {
        reasons.push('Access at unusual time');
        riskScore += 20;
      }
    }

    return {
      isSuspicious: riskScore >= 50,
      reasons,
      riskScore: Math.min(100, riskScore)
    };
  }

  static generateCSRFToken(): string {
    return this.generateSecureId();
  }

  static validateCSRFToken(token: string, expectedToken: string): boolean {
    return token === expectedToken && token.length === 32;
  }

  static secureLocalStorageWrite(key: string, value: any, encrypt = false): void {
    try {
      const data = JSON.stringify(value);
      const finalData = encrypt ? this.encryptSensitiveData(data) : data;
      localStorage.setItem(key, finalData);
    } catch (error) {
      console.error('Failed to write to localStorage:', error);
      throw new Error('Failed to save data securely');
    }
  }

  static secureLocalStorageRead(key: string, decrypt = false): any {
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;
      
      const finalData = decrypt ? this.decryptSensitiveData(data) : data;
      return JSON.parse(finalData);
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return null;
    }
  }
}