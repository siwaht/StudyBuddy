// Simple in-memory cache with TTL support
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class Cache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  // Set data with TTL in seconds
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  // Get data if not expired
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    const data = this.get(key);
    return data !== null;
  }

  // Invalidate specific key
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  // Invalidate keys matching pattern
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Destroy cache and cleanup
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Export singleton instance
export const cache = new Cache();

// Cache key generators
export const cacheKeys = {
  dashboardStats: (userId: string) => `dashboard:stats:${userId}`,
  analytics: (userId: string, agentId?: string, days?: number) => 
    `analytics:${userId}:${agentId || 'all'}:${days || 30}`,
  callSearch: (userId: string, query: string, page: number) => 
    `calls:search:${userId}:${query}:${page}`,
  userAgents: (userId: string) => `user:agents:${userId}`,
  performance: (agentId: string) => `performance:${agentId}`
};

// Cache TTL settings (in seconds)
export const cacheTTL = {
  dashboardStats: 300, // 5 minutes
  analytics: 900, // 15 minutes
  callSearch: 60, // 1 minute
  userAgents: 600, // 10 minutes
  performance: 180 // 3 minutes
};