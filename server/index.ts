import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import compression from "compression";
import { pool, testDatabaseConnection } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { authenticate } from "./auth";
import { 
  userRateLimiter, 
  authRateLimiter, 
  analyticsRateLimiter, 
  searchRateLimiter, 
  webhookRateLimiter,
  mutationRateLimiter 
} from "./rateLimiter";

const app = express();

// Configure trust proxy for Replit environment and production
// Replit always runs apps behind a proxy, so we need to trust it
if (process.env.REPL_ID || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy
}

// Enable compression for all responses to reduce bandwidth usage
app.use(compression({
  filter: (req, res) => {
    // Don't compress responses with "x-no-compression" header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for JSON, text, and other compressible types
    return compression.filter(req, res);
  },
  level: 6, // Balance between compression ratio and speed
}));

// Apply per-user rate limiting to all API routes
app.use('/api/', userRateLimiter);

// Apply specific rate limiters to different endpoint types
app.use('/api/auth/', authRateLimiter);
app.use('/api/analytics/', analyticsRateLimiter);
app.use('/api/calls/search', searchRateLimiter);
app.use('/api/webhooks/', webhookRateLimiter);

// Apply mutation rate limiter to POST/PATCH/DELETE operations
app.use('/api/', (req, res, next) => {
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) {
    mutationRateLimiter(req, res, next);
  } else {
    next();
  }
});

// Capture raw body for webhook signature verification
app.use('/api/webhooks/elevenlabs', express.raw({ 
  type: 'application/json',
  limit: '10mb' // Limit webhook payload size
}));

// Parse JSON for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session middleware with PostgreSQL store for scalability
const PgSession = connectPgSimple(session);

// Ensure session secret is set
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }
  console.warn('WARNING: Using default session secret in development. Set SESSION_SECRET for production.');
}

// Use PostgreSQL for session storage to support horizontal scaling
app.use(session({
  secret: sessionSecret || 'dev-secret-only-for-development',
  resave: false,
  saveUninitialized: false,
  store: new PgSession({
    pool: pool,                // Use the existing database connection pool
    tableName: 'user_sessions', // Table to store sessions
    createTableIfMissing: true, // Auto-create the session table if it doesn't exist
    pruneSessionInterval: 60 * 60, // Clean up expired sessions every hour (in seconds)
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'sid'
}));

// Add authentication middleware to populate req.user
app.use(authenticate);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.error('\n❌ Failed to connect to database.');
    console.error('📋 Please provision a Supabase database and update your .env file with the correct DATABASE_URL.');
    console.error('💡 Once the database is ready, run: npm run db:push\n');
    process.exit(1);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error for debugging
    console.error(`Error ${status}:`, err.message);
    if (err.stack && process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }

    // Send error response to client
    res.status(status).json({ message });
    
    // Don't re-throw the error - this was causing the server to crash
    // Instead, let Express handle it gracefully
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Graceful shutdown handlers for deployment
  const gracefulShutdown = (signal: string) => {
    log(`Received ${signal}, starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(() => {
      log('HTTP server closed');
      
      // Close database connections
      pool.end(() => {
        log('Database connections closed');
        process.exit(0);
      });
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forcefully shutting down after timeout');
      process.exit(1);
    }, 30000);
  };

  // Handle deployment signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle unhandled promise rejections to prevent crashes
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
    // Log but don't exit - let the server continue running
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // For uncaught exceptions, we should restart cleanly
    gracefulShutdown('uncaughtException');
  });
})();