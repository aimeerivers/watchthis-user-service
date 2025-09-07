import type { NextFunction, Request, Response } from "express";

/**
 * Simple validation function for signup
 */
export const validateSignup = (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body;
  const errors: string[] = [];

  // Username validation
  if (!username || typeof username !== "string") {
    errors.push("Username is required");
  } else if (username.length < 3 || username.length > 30) {
    errors.push("Username must be between 3 and 30 characters");
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push("Username can only contain letters, numbers, and underscores");
  }

  // Password validation
  if (!password || typeof password !== "string") {
    errors.push("Password is required");
  } else if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push("Password must contain at least one lowercase letter, one uppercase letter, and one number");
  }

  if (errors.length > 0) {
    errors.forEach((error) => {
      req.flash("error", error);
    });
    return res.redirect("/signup");
  }

  next();
};

/**
 * Simple validation function for login
 */
export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body;
  const errors: string[] = [];

  if (!username || typeof username !== "string" || username.trim().length === 0) {
    errors.push("Username is required");
  }

  if (!password || typeof password !== "string" || password.length === 0) {
    errors.push("Password is required");
  }

  if (errors.length > 0) {
    errors.forEach((error) => {
      req.flash("error", error);
    });
    return res.redirect("/login");
  }

  next();
};
