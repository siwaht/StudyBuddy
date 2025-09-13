import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { authenticate } from "./auth";

const app = express();

// Configure trust proxy for production (required when behind load balancer/proxy)
if (process.env.NODE_ENV === 'production') {
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

// Configure rate limiting to prevent abuse
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Apply general rate limiting to all routes
app.use('/api/', generalLimiter);

// Apply stricter rate limiting to authentication routes
app.use('/api/auth/', authLimiter);

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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
})();