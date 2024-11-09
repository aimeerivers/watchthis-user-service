import appRootPath from "app-root-path";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import path from "path";

import packageJson from "../package.json" with { type: "json" };
import { applyAuthenticationMiddleware, authenticate, ensureAuthenticated } from "./auth.js";
import { User } from "./models/user.js";

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

applyAuthenticationMiddleware(app);

app.use(express.urlencoded({ extended: true }));

app.set("view engine", "pug");
app.set("views", path.join(appRootPath.path, "views"));
app.use(express.static(path.join(appRootPath.path, "public")));

app.get("/signup", (req, res) => {
  res.render("signup", { callbackUrl: req.query.callbackUrl });
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
        res.redirect(req.body.callbackUrl ?? "/dashboard");
      });
    } catch {
      res.status(500).send("YOU IDIOT THATS TAKEN!");
    }
  })();
});

app.get("/login", (req, res) => {
  const messages = req.flash("error");
  res.render("login", { messages, callbackUrl: req.query.callbackUrl });
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
    res.redirect(req.body.callbackUrl ?? "/");
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

export { app };
