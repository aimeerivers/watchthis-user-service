import type { NextFunction, Request, Response } from "express";

import type { RequestWithUser } from "../middleware/jwt.js";
import { User } from "../models/user.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateTokenPair, verifyToken } from "../utils/jwt.js";

/**
 * POST /api/v1/auth/login
 * Authenticate user with username/password and return JWT tokens
 */
export const loginWithJWT = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  // Validate required fields
  if (!username || !password) {
    res.status(400).json({
      success: false,
      error: {
        code: "MISSING_CREDENTIALS",
        message: "Username and password are required",
      },
    });
    return;
  }

  try {
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid username or password",
        },
      });
      return;
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid username or password",
        },
      });
      return;
    }

    // Generate tokens
    const tokens = generateTokenPair(user);

    res.json({
      success: true,
      data: {
        user: {
          _id: user.id,
          username: user.username,
        },
        ...tokens,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An error occurred during authentication",
      },
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;

  if (!token) {
    res.status(400).json({
      success: false,
      error: {
        code: "MISSING_REFRESH_TOKEN",
        message: "Refresh token is required",
      },
    });
    return;
  }

  try {
    const decoded = verifyToken(token);

    // Only allow refresh tokens for token refresh
    if (decoded.type !== "refresh") {
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN_TYPE",
          message: "Invalid token type. Refresh token required.",
        },
      });
      return;
    }

    // Find the user to ensure they still exist
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User no longer exists",
        },
      });
      return;
    }

    // Generate new tokens
    const tokens = generateTokenPair(user);

    res.json({
      success: true,
      data: {
        user: {
          _id: user.id,
          username: user.username,
        },
        ...tokens,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({
      success: false,
      error: {
        code: "INVALID_REFRESH_TOKEN",
        message: "Invalid or expired refresh token",
      },
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user info from JWT token
 */
export const getCurrentUser = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  try {
    // User should be set by authenticateJWT middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};
