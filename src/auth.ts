import flash from "connect-flash";
import MongoStore from "connect-mongo";
import crypto from "crypto";
import dotenv from "dotenv";
import type { RequestHandler } from "express";
import type express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

import type { IUser } from "./models/user.js";
import { User } from "./models/user.js";

dotenv.config();

const mongoUrl = process.env.MONGO_URL ?? "mongodb://localhost:27017/user-service";
const mongoSessionStore = `${mongoUrl}${process.env.NODE_ENV === "test" ? "-test" : ""}`;
export const mongoStore = MongoStore.create({ mongoUrl: mongoSessionStore });

const baseUrl = new URL(process.env.BASE_URL ?? "http://localhost:8583");
const sessionSecret = process.env.SESSION_SECRET ?? crypto.randomBytes(64).toString("hex");

export function applyAuthenticationMiddleware(app: express.Express): void {
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: mongoStore,
      cookie: {
        domain: baseUrl.hostname.split(".").slice(1).join("."),
      },
    })
  );

  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser(function (user, done) {
    done(null, (user as IUser).id);
  });

  passport.deserializeUser(function (id, done) {
    (async function () {
      try {
        const user = await User.findById(id);
        done(null, user);
      } catch (err) {
        done(err);
      }
    })();
  });

  passport.use(
    new LocalStrategy((username, password, done) => {
      (async () => {
        try {
          const user = await User.findOne({ username });

          if (user === null || user === undefined) {
            done(null, false, { message: "Incorrect username." });
            return;
          }

          const isMatch = await user.comparePassword(password);

          if (!isMatch) {
            done(null, false, { message: "Incorrect password." });
            return;
          }

          done(null, user);
        } catch (err) {
          done(err);
        }
      })();
    })
  );
}

export const ensureAuthenticated: RequestHandler = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (req.isAuthenticated()) {
    next();
    return;
  }
  res.redirect("/login");
};

export const authenticate: RequestHandler = (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      req.flash("error", info?.message || "Login failed");
      return res.redirect("/login");
    }
    
    req.logIn(user, (err: any) => {
      if (err) {
        return next(err);
      }
      
      // Force session save before redirect to prevent race conditions
      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return next(err);
        }
        
        // Use intermediate redirect to avoid CSP issues
        const callbackUrl = req.body.callbackUrl;
        if (callbackUrl && callbackUrl !== "/dashboard") {
          res.redirect(`/redirect?to=${encodeURIComponent(callbackUrl)}`);
        } else {
          res.redirect("/dashboard");
        }
      });
    });
  })(req, res, next);
};
