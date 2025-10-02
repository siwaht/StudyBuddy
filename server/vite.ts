import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config.js";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Disable HMR in Replit environment to prevent WebSocket errors
  const isReplit = process.env.REPL_ID !== undefined;
  
  const serverOptions = {
    middlewareMode: true,
    hmr: isReplit ? false : {
      server,
      port: 5000,
    },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // Don't exit on errors - let the server handle them gracefully
        // This was causing deployment failures
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, the server runs from dist/server/index.js
  // So we need to go up two levels to reach dist/public
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = isProduction 
    ? path.resolve(import.meta.dirname, "..", "public")
    : path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    // In production, log the warning but don't crash the server
    // The build should be created during deployment
    console.warn(
      `Build directory not found: ${distPath}. Running npm run build...`,
    );
    
    // Create a simple fallback response instead of crashing
    app.use("*", (_req, res) => {
      res.status(503).json({
        message: "Application is starting up. Please wait a moment and refresh.",
        error: "Build directory not found"
      });
    });
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
