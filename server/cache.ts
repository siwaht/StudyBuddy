// Enhanced cache with Redis support fallback to in-memory
import { createClient } from 'redis';

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

// Redis client (optional)
let redisClient: ReturnType<typeof createClient> | null = null;

class Cache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: ReturnType<typeof setInterval>;
  private isRedisEnabled = false;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    
    // Try to initialize Redis if available
    this.initializeRedis().catch(err => {
      console.log('Redis unavailable, using in-memory cache:', err.message);
    });
  }

  private async initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
    
    if (!redisUrl) {
      return; // No Redis URL, use in-memory cache
    }

    try {
      redisClient = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
        },
      });

      redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isRedisEnabled = false;
      });

      redisClient.on('connect', () => {
        console.log('Redis connected successfully');
        this.isRedisEnabled = true;
      });

      await redisClient.connect();
      this.isRedisEnabled = true;
    } catch (error) {
      console.log('Redis initialization failed, using in-memory cache');
      this.isRedisEnabled = false;
    }
  }

  // Set data with TTL in seconds
  async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
    if (this.isRedisEnabled && redisClient) {
      try {
        await redisClient.setEx(`voice_agent:${key}`, ttlSeconds, JSON.stringify(data));
        return;
      } catch (error) {
        console.error('Redis set error, falling back to memory:', error);
        this.isRedisEnabled = false;
      }
    }

    // Fallback to in-memory cache
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  // Get data if not expired
  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisEnabled && redisClient) {
      try {
        const cached = await redisClient.get(`voice_agent:${key}`);
        return cached ? JSON.parse(cached) : null;
      } catch (error) {
        console.error('Redis get error, falling back to memory:', error);
        this.isRedisEnabled = false;
      }
    }

    // Fallback to in-memory cache
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  // Synchronous get for backward compatibility
  getSync<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  // Check if key exists and is valid
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  // Synchronous has for backward compatibility
  hasSync(key: string): boolean {
    const data = this.getSync(key);
    return data !== null;
  }

  // Invalidate specific key
  async invalidate(key: string): Promise<void> {
    if (this.isRedisEnabled && redisClient) {
      try {
        await redisClient.del(`voice_agent:${key}`);
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }
    this.cache.delete(key);
  }

  // Invalidate keys matching pattern
  async invalidatePattern(pattern: string): Promise<void> {
    if (this.isRedisEnabled && redisClient) {
      try {
        const keys = await redisClient.keys(`voice_agent:${pattern}`);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } catch (error) {
        console.error('Redis pattern invalidation error:', error);
      }
    }

    // Convert glob pattern to regex for in-memory cache
    const regexPattern = pattern
      .replace(/\*/g, '.*')  // Convert * to .*
      .replace(/\?/g, '.')   // Convert ? to .
      .replace(/\[/g, '\\[') // Escape [
      .replace(/\]/g, '\\]'); // Escape ]
    
    const regex = new RegExp(`^${regexPattern}$`);
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  // Clear all cache
  async clear(): Promise<void> {
    if (this.isRedisEnabled && redisClient) {
      try {
        await redisClient.flushDb();
      } catch (error) {
        console.error('Redis clear error:', error);
      }
    }
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
  async getStats(): Promise<{ 
    backend: 'redis' | 'memory'; 
    connected: boolean; 
    memorySize: number; 
    memoryKeys: string[];
    redisInfo?: any;
  }> {
    const memoryStats = {
      memorySize: this.cache.size,
      memoryKeys: Array.from(this.cache.keys())
    };

    if (this.isRedisEnabled && redisClient) {
      try {
        const keyCount = await redisClient.dbSize();
        const info = await redisClient.info('memory');
        return {
          backend: 'redis',
          connected: true,
          ...memoryStats,
          redisInfo: { keyCount, memoryInfo: info }
        };
      } catch (error) {
        return {
          backend: 'memory',
          connected: false,
          ...memoryStats
        };
      }
    }

    return {
      backend: 'memory',
      connected: false,
      ...memoryStats
    };
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    if (this.isRedisEnabled && redisClient) {
      try {
        const pong = await redisClient.ping();
        return pong === 'PONG';
      } catch (error) {
        return false;
      }
    }
    return true; // Memory cache is always healthy
  }

  // Destroy cache and cleanup
  async destroy(): Promise<void> {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
    
    if (redisClient) {
      try {
        await redisClient.quit();
      } catch (error) {
        console.error('Error closing Redis connection:', error);
      }
    }
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