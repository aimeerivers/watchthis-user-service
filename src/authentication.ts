import flash from "connect-flash";
import MongoStore from "connect-mongo";
import crypto from "crypto";
import dotenv from "dotenv";
import type { RequestHandler } from "express";
import type express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

import type { IUser } from "./models/user";
import { User } from "./models/user";

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
        secure: baseUrl.protocol === "https:",
        sameSite: "lax",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
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

  app.get("/api/v1/session", (req, res) => {
    const connectSid = req.headers.cookie?.split(";").find((cookie) => cookie.includes("connect.sid"));
    if (!connectSid) {
      return res.status(400).json({ error: "Passport session cookie not found" });
    }

    const sessionId = decodeURIComponent(connectSid)
      .replace(/^connect\.sid=s:/, "")
      .split(".")[0];
    if (!sessionId) {
      return res.status(400).json({ error: "Passport session ID not found" });
    }

    mongoStore.get(sessionId, async (err, session) => {
      if (err || !session) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }

      const userId = (session as any).passport?.user;
      if (!userId) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }

      try {
        const user = await User.findById(userId).exec();
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json({
          sessionId: sessionId,
          domain: session.cookie.domain,
          path: session.cookie.path,
          expiresAt: session.cookie.expires,
          user: {
            _id: user._id,
            username: user.username,
          },
        });
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
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

export const authenticate: RequestHandler = passport.authenticate("local", {
  successRedirect: "/dashboard",
  failureRedirect: "/login",
  failureFlash: true,
});
