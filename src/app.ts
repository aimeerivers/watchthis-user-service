import crypto from "crypto";
import path from "path";
import dotenv from "dotenv";
import type { RequestHandler } from "express";
import express from "express";
import session from "express-session";
import mongoose from "mongoose";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

import type { IUser } from "./models/user";
import { User } from "./models/user";
dotenv.config();

const mongoUri = process.env.MONGO_URI ?? "mongodb://localhost:27017";
const mongoDb = process.env.MONGO_DB ?? "user-service";
const mongoConnectionString = `${mongoUri}/${mongoDb}${process.env.NODE_ENV === "test" ? "-test" : ""}`;
const sessionSecret = process.env.SESSION_SECRET ?? crypto.randomBytes(64).toString("hex");

mongoose
  .connect(mongoConnectionString)
  .then(() => {
    console.log("Database connected!");
  })
  .catch((err) => {
    console.log(err);
  });

const app = express();
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
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

const ensureAuthenticated: RequestHandler = (
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

const authenticate: RequestHandler = passport.authenticate("local", {
  successRedirect: "/dashboard",
  failureRedirect: "/",
  failureFlash: false,
});

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
// app.use(express.static(path.join(__dirname, 'public')));

app.get("/signup", (_req, res) => {
  res.render("signup");
});

app.post("/signup", (req, res) => {
  (async function () {
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
        res.redirect("/dashboard");
      });
    } catch {
      res.status(500).send("YOU IDIOT THATS TAKEN!");
    }
  })();
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", authenticate);

app.get("/dashboard", ensureAuthenticated, (req, res, next) => {
  (async () => {
    try {
      const users = await User.find();
      res.render("dashboard", { users, currentUser: req.user });
    } catch (err) {
      next(err);
    }
  })();
});

app.post("/logout", (req, res) => {
  req.logout({}, (err: unknown) => {
    if (err !== null && err !== undefined) {
      // Handle the error as needed, perhaps logging it or sending a different response
      console.error(err);
      return res.status(500).send("An error occurred while logging out");
    }
    // Redirect or respond as needed if logout is successful
    res.redirect("/");
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

export { app };
