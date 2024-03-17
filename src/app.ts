import path from "path";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

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
    secret: "ABC123!@#",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
  done(null, (user as IUser).id);
});

passport.deserializeUser(async function (id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

passport.use(
  new LocalStrategy(function (username, password, done) {
    User.findOne({ username }, function (err: unknown, user: IUser) {
      if (err !== null && err !== undefined) {
        done(err);
        return;
      }
      if (user === null || user === undefined) {
        done(null, false);
        return;
      }
      bcrypt.compare(password, user.password, function (err, result) {
        if (err !== null && err !== undefined) {
          done(err);
          return;
        }
        if (result === null || result === undefined) {
          done(null, false);
          return;
        }
        done(null, user);
      });
    });
  })
);

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
// app.use(express.static(path.join(__dirname, 'public')));

app.get("/signup", (_req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
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
    res.status(500).send();
  }
});

app.get("/dashboard", async (_req, res) => {
  const users = await User.find();
  res.render("dashboard", { users });
});

app.get("/", (_req, res) => {
  res.send("Hello World!");
});

app.post("/andre", (_req, res) => {
  res.send("potato");
});

app.get("/hello/:name", (req, res) => {
  res.send(`Hello ${req.params.name}!`);
});

export { app };
