import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { type User } from "@shared/schema";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Extend express-session's SessionData
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Authentication middleware - verifies session and attaches user to request
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user && user.isActive) {
        req.user = user;
        // Update last active time in background (don't await to avoid blocking)
        storage.updateUser(user.id, { lastActive: new Date() }).catch(err => {
          console.error('Failed to update last active time:', err);
        });
      } else {
        delete req.session.userId;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      delete req.session.userId;
    }
  }
  next();
}

// Require authentication - returns 401 if not authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Require admin role - returns 403 if not admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Validate a password
export async function validatePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}