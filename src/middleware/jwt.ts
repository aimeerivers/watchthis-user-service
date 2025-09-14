import type { NextFunction, Request, Response } from "express";

import { User } from "../models/user.js";
import { verifyToken } from "../utils/jwt.js";

export interface RequestWithUser extends Request {
  user?: {
    _id: string;
    username: string;
  };
}

/**
 * Middleware to authenticate JWT tokens from Authorization header
 * Sets req.user if token is valid, otherwise continues without user
 */
export const authenticateJWT = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);

    // Only allow access tokens for API authentication
    if (decoded.type !== "access") {
      return next();
    }

    // Find the user to ensure they still exist
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next();
    }

    req.user = {
      _id: decoded.userId,
      username: decoded.username,
    };

    next();
  } catch (error) {
    // Invalid token, continue without user
    next();
  }
};

/**
 * Middleware to require JWT authentication
 * Returns 401 if no valid token is provided
 */
export const requireJWT = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Valid JWT token required. Please provide a valid token in the Authorization header.",
      },
    });
    return;
  }
  next();
};
