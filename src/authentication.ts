import crypto from "crypto";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import type { RequestHandler } from "express";
import type express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { IUser } from "./models/user";
import { User } from "./models/user";

dotenv.config();

const mongoUri = process.env.MONGO_URI ?? "mongodb://localhost:27017";
const mongoDb = process.env.MONGO_DB_SESSION_STORE ?? "session-store";
const mongoSessionStore = `${mongoUri}/${mongoDb}${process.env.NODE_ENV === "test" ? "-test" : ""}`;
export const mongoStore = MongoStore.create({ mongoUrl: mongoSessionStore });

const sessionSecret = process.env.SESSION_SECRET ?? crypto.randomBytes(64).toString("hex");

export function applyAuthenticationMiddleware(app: express.Express): void {
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: mongoStore,
    })
  );

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

export const authenticate: RequestHandler = passport.authenticate("local", {
  successRedirect: "/dashboard",
  failureRedirect: "/",
  failureFlash: false,
});
