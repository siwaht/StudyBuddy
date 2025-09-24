import rateLimit, { Options } from "express-rate-limit";
import { Request } from "express";

// Store for tracking per-user rates
const userRateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Custom key generator for authenticated users - properly handles IPv6
const getUserKey = (req: Request): string => {
  // For authenticated users, use user ID
  if (req.user?.id) {
    return `user_${req.user.id}`;
  }
  // For non-authenticated, use the default behavior
  return req.ip!; // Let express-rate-limit handle IP normalization
};

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(userRateLimitStore.entries());
  for (const [key, value] of entries) {
    if (now > value.resetTime) {
      userRateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Per-user rate limiter (for authenticated users)
export const userRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    // Admin users get higher limits
    if (req.user?.role === 'admin') {
      return 200; // 200 requests per minute for admins
    }
    // Regular users
    return 50; // 50 requests per minute for regular users
  },
  // Remove custom keyGenerator to use the default which properly handles IPv6
  // The default uses req.ip which is already properly normalized by Express
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    const isUser = req.user?.id ? true : false;
    res.status(429).json({
      message: `Too many requests. ${isUser ? 'User' : 'IP'} rate limit exceeded.`,
      retryAfter: 60 // seconds
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for static assets
    return req.path.startsWith('/assets/') || req.path.endsWith('.js') || req.path.endsWith('.css');
  }
});

// Strict rate limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many authentication attempts. Please try again later.",
      retryAfter: 900 // 15 minutes in seconds
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

// API endpoint specific rate limiters
export const analyticsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 analytics queries per minute
  message: "Too many analytics requests. Please wait before requesting more data.",
  standardHeaders: true,
  legacyHeaders: false
});

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 searches per minute
  message: "Too many search requests. Please wait before searching again.",
  standardHeaders: true,
  legacyHeaders: false
});

export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 webhook calls per minute
  message: "Too many webhook requests from this source.",
  standardHeaders: true,
  legacyHeaders: false
});

// Create/update operation rate limiter
export const mutationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 mutations per minute
  message: "Too many create/update operations. Please slow down.",
  standardHeaders: true,
  legacyHeaders: false
});

// File upload rate limiter
export const uploadRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 uploads per 10 minutes
  message: "Upload limit reached. Please wait before uploading more files.",
  standardHeaders: true,
  legacyHeaders: false
});

// Export rate limiter
export const exportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 exports per hour
  message: "Export limit reached. Please wait before exporting more data.",
  standardHeaders: true,
  legacyHeaders: false
});