// Enhanced cache with Redis support fallback to in-memory
import { createClient } from 'redis';
import { createHash } from 'crypto';

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
        // Attempt to reconnect after 10 seconds
        setTimeout(() => {
          if (!this.isRedisEnabled && redisClient) {
            console.log('Attempting to reconnect to Redis...');
            redisClient.connect().catch(e => {
              console.error('Redis reconnection failed:', e);
            });
          }
        }, 10000);
      });

      redisClient.on('connect', () => {
        console.log('Redis connected successfully');
        this.isRedisEnabled = true;
      });

      redisClient.on('ready', () => {
        console.log('Redis client ready');
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
    // Validate TTL
    if (ttlSeconds <= 0) {
      console.warn(`Invalid TTL ${ttlSeconds} for key ${key}, using default 300s`);
      ttlSeconds = 300;
    }

    if (this.isRedisEnabled && redisClient) {
      try {
        await redisClient.setEx(`voice_agent:${key}`, ttlSeconds, JSON.stringify(data));
        return;
      } catch (error) {
        console.error('Redis set error, falling back to memory:', error);
        // Don't permanently disable Redis, just fall back this time
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
        // Don't permanently disable Redis, just fall back this time
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
  // Core dashboard and user data
  dashboardStats: (userId: string) => `dashboard:stats:${userId}`,
  userAgents: (userId: string) => `user:agents:${userId}`,
  userCalls: (userId: string) => `user:calls:${userId}`,
  
  // Analytics and metrics
  analytics: (userId: string, agentId?: string, days?: number) => 
    `analytics:${userId}:${agentId || 'all'}:${days || 30}`,
  performanceMetrics: (userId: string, period: string) => `metrics:${userId}:${period}`,
  costAnalysis: (userId: string, agentId?: string) => 
    agentId ? `costs:${userId}:agent:${agentId}` : `costs:${userId}:total`,
  trendData: (userId: string, metric: string, period: string) => 
    `trends:${userId}:${metric}:${period}`,
  
  // Search and pagination
  callSearch: (userId: string, query: string, page: number) => {
    // Create collision-resistant hash of the full query parameters
    const hash = createHash('sha256').update(query).digest('hex').slice(0, 16);
    return `calls:search:${userId}:${hash}:${page}`;
  },
  paginatedCalls: (userId: string, page: number, limit: number) => 
    `calls:${userId}:page:${page}:limit:${limit}`,
  paginatedAgents: (userId: string, page: number, limit: number) => 
    `agents:${userId}:page:${page}:limit:${limit}`,
  
  // Real-time monitoring
  activeRooms: () => 'rooms:active',
  roomMetrics: (roomId: string) => `room:${roomId}:metrics`,
  liveCallStats: () => 'stats:live:calls',
  
  // Individual entities
  agent: (agentId: string) => `agent:${agentId}`,
  call: (callId: string) => `call:${callId}`,
  performance: (agentId: string) => `performance:${agentId}`,
  
  // Call management features
  callTranscript: (callId: string) => `call:${callId}:transcript`,
  callRating: (callId: string) => `call:${callId}:rating`,
  callCategories: (userId: string) => `user:${userId}:categories`,
  
  // Global caches
  allAgents: () => 'agents:all',
  allCalls: () => 'calls:all'
};

// Cache TTL settings (in seconds)
export const cacheTTL = {
  // Real-time data (short TTL)
  dashboardStats: 300, // 5 minutes
  liveCallStats: 60, // 1 minute
  activeRooms: 30, // 30 seconds for real-time monitoring
  roomMetrics: 120, // 2 minutes
  
  // User data (medium TTL)
  userAgents: 600, // 10 minutes
  userCalls: 300, // 5 minutes
  callSearch: 60, // 1 minute for search results
  paginatedCalls: 300, // 5 minutes
  paginatedAgents: 600, // 10 minutes
  
  // Analytics and metrics (longer TTL since less frequent changes)
  analytics: 900, // 15 minutes
  performanceMetrics: 600, // 10 minutes
  costAnalysis: 3600, // 1 hour (cost data changes less frequently)
  trendData: 1800, // 30 minutes
  performance: 180, // 3 minutes
  
  // Individual entities (medium-long TTL)
  agent: 1800, // 30 minutes
  call: 3600, // 1 hour (call data rarely changes after creation)
  
  // Call management features
  callTranscript: 86400, // 24 hours (transcripts don't change)
  callRating: 43200, // 12 hours (ratings change infrequently)
  callCategories: 21600, // 6 hours (categories change infrequently)
  
  // Global data (longer TTL)
  allAgents: 7200, // 2 hours
  allCalls: 3600 // 1 hour
};

// Cache invalidation patterns for bulk clearing
export const cacheInvalidation = {
  // User-specific patterns
  userPattern: (userId: string) => `*${userId}*`,
  userDashboard: (userId: string) => `dashboard:*${userId}*`,
  userAgents: (userId: string) => `*agents*${userId}*`,
  userCalls: (userId: string) => `*calls*${userId}*`,
  
  // Entity-specific patterns
  agentPattern: (agentId: string) => `*agent*${agentId}*`,
  callPattern: (callId: string) => `*call*${callId}*`,
  roomPattern: (roomId: string) => `*room*${roomId}*`,
  
  // Category patterns
  allAnalytics: () => 'analytics:*',
  allMetrics: () => 'metrics:*',
  allCosts: () => 'costs:*',
  allTrends: () => 'trends:*',
  allSearch: () => '*search*',
  
  // Real-time patterns
  liveStats: () => '*live*',
  activeRooms: () => 'rooms:*'
};

// Helper functions for cache management
export const cacheHelpers = {
  // Invalidate all user-related cache entries
  async invalidateUserCache(userId: string): Promise<void> {
    await cache.invalidatePattern(cacheInvalidation.userPattern(userId));
  },
  
  // Invalidate agent-related cache entries
  async invalidateAgentCache(agentId: string, userId?: string): Promise<void> {
    await cache.invalidatePattern(cacheInvalidation.agentPattern(agentId));
    if (userId) {
      await cache.invalidatePattern(cacheInvalidation.userAgents(userId));
      await cache.invalidatePattern(cacheInvalidation.userDashboard(userId));
    }
  },
  
  // Invalidate call-related cache entries
  async invalidateCallCache(callId: string, userId?: string): Promise<void> {
    await cache.invalidatePattern(cacheInvalidation.callPattern(callId));
    if (userId) {
      await cache.invalidatePattern(cacheInvalidation.userCalls(userId));
      await cache.invalidatePattern(cacheInvalidation.userDashboard(userId));
    }
  },
  
  // Invalidate analytics cache
  async invalidateAnalyticsCache(userId: string): Promise<void> {
    await cache.invalidatePattern(cacheInvalidation.allAnalytics());
    await cache.invalidatePattern(cacheInvalidation.allMetrics());
    await cache.invalidatePattern(cacheInvalidation.allCosts());
    await cache.invalidatePattern(cacheInvalidation.allTrends());
    await cache.invalidatePattern(cacheInvalidation.userDashboard(userId));
  },
  
  // Warm up cache for a user (preload frequently accessed data)
  async warmUserCache(userId: string): Promise<void> {
    // This would be called when a user logs in to preload their data
    // Implementation would depend on the storage layer calling cache.set()
    console.log(`Cache warming initiated for user: ${userId}`);
  },
  
  // Get cache health and statistics
  async getCacheHealth(): Promise<{
    healthy: boolean;
    backend: string;
    stats: any;
  }> {
    const healthy = await cache.isHealthy();
    const stats = await cache.getStats();
    return {
      healthy,
      backend: stats.backend,
      stats
    };
  }
};