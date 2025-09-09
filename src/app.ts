import appRootPath from "app-root-path";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import path from "path";

import packageJson from "../package.json" with { type: "json" };
import { applyAuthenticationMiddleware, authenticate, ensureAuthenticated } from "./auth.js";
import { validateLogin, validateSignup } from "./middleware/validation.js";
import { User } from "./models/user.js";
import { asyncHandler } from "./utils/asyncHandler.js";

dotenv.config();

const mongoUrl = process.env.MONGO_URL ?? "mongodb://localhost:27017/user-service";
const mongoUserService = `${mongoUrl}${process.env.NODE_ENV === "test" ? "-test" : ""}`;

mongoose
  .connect(mongoUserService)
  .then(() => {
    console.log("Database connected!");
  })
  .catch((err) => {
    console.log(err);
  });

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for TailwindCSS
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'"],
      },
    },
  })
);

applyAuthenticationMiddleware(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "pug");
app.set("views", path.join(appRootPath.path, "views"));
app.use(express.static(path.join(appRootPath.path, "public")));

app.get("/signup", (req, res) => {
  const messages = req.flash("error");
  res.render("signup", { callbackUrl: req.query.callbackUrl, messages });
});

app.post(
  "/signup",
  validateSignup,
  asyncHandler(async (req, res) => {
    try {
      const user = new User({
        username: req.body.username,
        password: req.body.password,
      });
      await user.save();

      req.login(user, function (err) {
        if (err !== null && err !== undefined) {
          console.log(err);
          return res.status(500).send();
        }
        res.redirect(req.body.callbackUrl ?? "/dashboard");
      });
    } catch (error) {
      console.error("Signup error:", error);
      // Check for MongoDB duplicate key error (username already exists)
      if (error && typeof error === "object" && "code" in error && error.code === 11000) {
        req.flash("error", "Username already exists. Please choose a different username.");
        return res.redirect("/signup");
      }
      req.flash("error", "An error occurred during signup. Please try again.");
      res.redirect("/signup");
    }
  })
);

app.get("/login", (req, res) => {
  const messages = req.flash("error");
  res.render("login", { messages, callbackUrl: req.query.callbackUrl });
});

app.post("/login", validateLogin, authenticate);

app.get(
  "/dashboard",
  ensureAuthenticated,
  asyncHandler(async (req, res) => {
    const users = await User.find();
    res.render("dashboard", { users, currentUser: req.user });
  })
);

app.post("/logout", (req, res) => {
  req.logout({}, (err: unknown) => {
    if (err !== null && err !== undefined) {
      // Handle the error as needed, perhaps logging it or sending a different response
      console.error(err);
      return res.status(500).send("An error occurred while logging out");
    }
    // Redirect or respond as needed if logout is successful
    res.redirect(req.body?.callbackUrl ?? "/");
  });
});

app.get("/", (_req, res) => {
  res.render("welcome-page");
});

app.post("/andre", (_req, res) => {
  res.send("potato");
});

app.get("/hello/:name", (req, res) => {
  res.send(`Hello ${req.params.name}!`);
});

app.get("/ping", (_req, res) => {
  res.send(`${packageJson.name} ${packageJson.version}`);
});

// API endpoint for session validation (used by other services)
app.get("/api/v1/session", (req, res) => {
  if (req.user) {
    res.json({
      user: {
        _id: (req.user as any)._id || (req.user as any).id,
        username: (req.user as any).username,
      },
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

app.get(
  "/health",
  asyncHandler(async (_req, res) => {
    try {
      // Check database connection
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      } else {
        throw new Error("Database connection not established");
      }
      res.json({
        status: "healthy",
        service: packageJson.name,
        version: packageJson.version,
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({
        status: "unhealthy",
        service: packageJson.name,
        version: packageJson.version,
        database: "disconnected",
        timestamp: new Date().toISOString(),
      });
    }
  })
);

export { app };
