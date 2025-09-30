import { Request, Response, NextFunction } from "express";

// Helper to ensure req.user exists and is typed
export function ensureUser(req: Request, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return false;
  }
  return true;
}

// Helper to validate required fields in request body
export function validateRequired(
  req: Request,
  res: Response,
  fields: string[]
): boolean {
  const missing = fields.filter(field => !req.body[field]);
  if (missing.length > 0) {
    res.status(400).json({
      message: `Missing required fields: ${missing.join(", ")}`
    });
    return false;
  }
  return true;
}

// Helper to validate email format
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper to validate pagination params
export function validatePagination(page?: number, limit?: number): {
  page: number;
  limit: number;
} {
  const validPage = page && page > 0 ? Math.floor(page) : 1;
  const validLimit = limit && limit > 0 && limit <= 100 ? Math.floor(limit) : 20;
  return { page: validPage, limit: validLimit };
}

// Helper to sanitize search query
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  // Remove potentially dangerous characters
  return query.trim().slice(0, 200); // Limit length
}

// Helper to validate date range
export function validateDateRange(dateFrom?: string, dateTo?: string): {
  valid: boolean;
  from?: Date;
  to?: Date;
  error?: string;
} {
  if (!dateFrom && !dateTo) {
    return { valid: true };
  }

  try {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    if (from && isNaN(from.getTime())) {
      return { valid: false, error: "Invalid dateFrom format" };
    }

    if (to && isNaN(to.getTime())) {
      return { valid: false, error: "Invalid dateTo format" };
    }

    if (from && to && from > to) {
      return { valid: false, error: "dateFrom cannot be after dateTo" };
    }

    return { valid: true, from, to };
  } catch (error) {
    return { valid: false, error: "Invalid date format" };
  }
}

// Error response helper
export function sendError(
  res: Response,
  status: number,
  message: string,
  details?: any
): void {
  const response: any = { message };
  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }
  res.status(status).json(response);
}
