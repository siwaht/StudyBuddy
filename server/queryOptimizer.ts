import { Request } from "express";

// Default pagination settings
export const PAGINATION_DEFAULTS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1
};

// Parse and validate pagination parameters
export function getPaginationParams(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string) || PAGINATION_DEFAULTS.DEFAULT_PAGE);
  const requestedLimit = parseInt(req.query.limit as string) || PAGINATION_DEFAULTS.DEFAULT_LIMIT;
  const limit = Math.min(requestedLimit, PAGINATION_DEFAULTS.MAX_LIMIT);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
    // For cursor-based pagination
    cursor: req.query.cursor as string || null
  };
}

// Generate pagination metadata
export function getPaginationMeta(
  total: number, 
  page: number, 
  limit: number, 
  baseUrl: string
) {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null,
    links: {
      first: `${baseUrl}?page=1&limit=${limit}`,
      last: `${baseUrl}?page=${totalPages}&limit=${limit}`,
      next: hasNext ? `${baseUrl}?page=${page + 1}&limit=${limit}` : null,
      prev: hasPrev ? `${baseUrl}?page=${page - 1}&limit=${limit}` : null
    }
  };
}

// Batch database operations
export class QueryBatcher<T> {
  private batch: Array<() => Promise<T>> = [];
  private batchSize: number;
  private results: T[] = [];

  constructor(batchSize: number = 10) {
    this.batchSize = batchSize;
  }

  add(operation: () => Promise<T>): void {
    this.batch.push(operation);
  }

  async execute(): Promise<T[]> {
    // Process in batches
    for (let i = 0; i < this.batch.length; i += this.batchSize) {
      const currentBatch = this.batch.slice(i, i + this.batchSize);
      const batchResults = await Promise.all(
        currentBatch.map(op => op().catch(err => {
          console.error('Batch operation error:', err);
          return null;
        }))
      );
      this.results.push(...batchResults.filter(r => r !== null) as T[]);
    }
    return this.results;
  }

  clear(): void {
    this.batch = [];
    this.results = [];
  }
}

// Query result cache with automatic invalidation
export class QueryCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  set(key: string, data: any, ttlSeconds: number = 60): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  invalidate(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      const keys = Array.from(this.cache.keys());
      keys.forEach(key => {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      });
    } else {
      this.cache.clear();
    }
  }
}

// Optimized query executor with retries
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 100
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors
      if (error.code && ['22P02', '23502', '23503'].includes(error.code)) {
        throw error;
      }
      
      // Exponential backoff
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}

// Connection pool health check
export async function checkPoolHealth(pool: any): Promise<{
  healthy: boolean;
  totalConnections: number;
  idleConnections: number;
  waitingConnections: number;
}> {
  try {
    const poolStats = {
      totalConnections: pool.totalCount || 0,
      idleConnections: pool.idleCount || 0,
      waitingConnections: pool.waitingCount || 0
    };
    
    return {
      healthy: poolStats.idleConnections > 0 || poolStats.totalConnections < (pool.options?.max || 20),
      ...poolStats
    };
  } catch (error) {
    return {
      healthy: false,
      totalConnections: 0,
      idleConnections: 0,
      waitingConnections: 0
    };
  }
}

// Export utilities
export const queryOptimizer = {
  getPaginationParams,
  getPaginationMeta,
  QueryBatcher,
  QueryCache,
  executeWithRetry,
  checkPoolHealth,
  PAGINATION_DEFAULTS
};