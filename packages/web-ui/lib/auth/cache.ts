interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  totalItems: number;
}

export class AuthCache {
  private static cache = new Map<string, CacheItem<any>>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 100;
  private static stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    totalItems: 0
  };

  private static readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute
  private static cleanupTimer: NodeJS.Timeout | null = null;

  static {
    // Start automatic cleanup
    this.startCleanup();
  }

  static set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): void {
    // Ensure cache size doesn't exceed limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLRU();
    }

    const now = Date.now();
    const item: CacheItem<T> = {
      value,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, item);
    this.stats.size = this.cache.size;
    this.stats.totalItems++;
  }

  static get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    
    // Check if item has expired
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      return null;
    }

    // Update access information
    item.accessCount++;
    item.lastAccessed = now;
    
    this.stats.hits++;
    return item.value;
  }

  static has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      return false;
    }

    return true;
  }

  static delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  static clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      totalItems: 0
    };
  }

  static getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size
    };
  }

  static getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : this.stats.hits / total;
  }

  private static evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private static startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  private static cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.stats.size = this.cache.size;
  }

  static stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Specialized cache for authentication data
export class AuthDataCache {
  private static readonly USER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private static readonly TOKEN_CACHE_TTL = 50 * 60 * 1000; // 50 minutes (tokens valid for 1 hour)
  private static readonly ACCOUNT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  static cacheUser(userId: string, userData: any): void {
    AuthCache.set(`user:${userId}`, userData, this.USER_CACHE_TTL);
  }

  static getCachedUser(userId: string): any | null {
    return AuthCache.get(`user:${userId}`);
  }

  static cacheToken(userId: string, token: string): void {
    AuthCache.set(`token:${userId}`, token, this.TOKEN_CACHE_TTL);
  }

  static getCachedToken(userId: string): string | null {
    return AuthCache.get(`token:${userId}`);
  }

  static cacheAccountData(accountId: string, data: any): void {
    AuthCache.set(`account:${accountId}`, data, this.ACCOUNT_CACHE_TTL);
  }

  static getCachedAccountData(accountId: string): any | null {
    return AuthCache.get(`account:${accountId}`);
  }

  static invalidateUser(userId: string): void {
    AuthCache.delete(`user:${userId}`);
    AuthCache.delete(`token:${userId}`);
  }

  static invalidateAccount(accountId: string): void {
    AuthCache.delete(`account:${accountId}`);
  }

  static invalidateAll(): void {
    AuthCache.clear();
  }
}

// Persistent cache for offline support
export class PersistentCache {
  private static readonly STORAGE_KEY = 'auth_persistent_cache';
  private static readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

  static async set(key: string, value: any, ttl: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const cache = this.getStorageCache();
      const now = Date.now();
      
      cache[key] = {
        value,
        timestamp: now,
        ttl,
        expires: now + ttl
      };

      // Check storage size and clean if necessary
      const serialized = JSON.stringify(cache);
      if (serialized.length > this.MAX_STORAGE_SIZE) {
        this.cleanupExpired(cache);
        
        // If still too large, remove oldest items
        if (JSON.stringify(cache).length > this.MAX_STORAGE_SIZE) {
          this.evictOldest(cache);
        }
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to set persistent cache:', error);
    }
  }

  static async get(key: string): Promise<any | null> {
    try {
      const cache = this.getStorageCache();
      const item = cache[key];
      
      if (!item) return null;
      
      const now = Date.now();
      if (now > item.expires) {
        delete cache[key];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
        return null;
      }
      
      return item.value;
    } catch (error) {
      console.warn('Failed to get from persistent cache:', error);
      return null;
    }
  }

  static async delete(key: string): Promise<void> {
    try {
      const cache = this.getStorageCache();
      delete cache[key];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to delete from persistent cache:', error);
    }
  }

  static async clear(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private static getStorageCache(): Record<string, any> {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  }

  private static cleanupExpired(cache: Record<string, any>): void {
    const now = Date.now();
    
    Object.keys(cache).forEach(key => {
      if (cache[key].expires < now) {
        delete cache[key];
      }
    });
  }

  private static evictOldest(cache: Record<string, any>): void {
    const entries = Object.entries(cache);
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    // Remove oldest 25% of entries
    const toRemoveCount = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemoveCount; i++) {
      delete cache[entries[i][0]];
    }
  }
}

// Memory usage monitoring
export class CacheMonitor {
  static getMemoryUsage(): {
    cacheSize: number;
    hitRate: number;
    stats: CacheStats;
    storageUsed: number;
  } {
    const stats = AuthCache.getStats();
    const hitRate = AuthCache.getHitRate();
    
    // Estimate storage usage
    let storageUsed = 0;
    try {
      const persistentData = localStorage.getItem(PersistentCache['STORAGE_KEY']);
      storageUsed = persistentData ? persistentData.length : 0;
    } catch {
      storageUsed = 0;
    }

    return {
      cacheSize: stats.size,
      hitRate,
      stats,
      storageUsed
    };
  }

  static optimizeCache(): {
    cleaned: number;
    optimized: boolean;
  } {
    const initialSize = AuthCache.getStats().size;
    
    // Force cleanup of expired items
    AuthCache['cleanup']();
    
    const finalSize = AuthCache.getStats().size;
    const cleaned = initialSize - finalSize;
    
    return {
      cleaned,
      optimized: cleaned > 0
    };
  }

  static getCacheHealth(): 'healthy' | 'warning' | 'critical' {
    const hitRate = AuthCache.getHitRate();
    const { cacheSize } = this.getMemoryUsage();
    
    if (hitRate > 0.8 && cacheSize < AuthCache['MAX_CACHE_SIZE'] * 0.8) {
      return 'healthy';
    } else if (hitRate > 0.6 && cacheSize < AuthCache['MAX_CACHE_SIZE'] * 0.9) {
      return 'warning';
    } else {
      return 'critical';
    }
  }
}