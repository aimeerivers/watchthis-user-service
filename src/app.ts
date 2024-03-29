import path from "path";
import { path as appRootPath } from "app-root-path";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

import { applyAuthenticationMiddleware, authenticate, ensureAuthenticated } from "./authentication";
import { User } from "./models/user";

dotenv.config();

const mongoUri = process.env.MONGO_URI ?? "mongodb://localhost:27017";
const mongoDb = process.env.MONGO_DB_USER_SERVICE ?? "user-service";
const mongoUserService = `${mongoUri}/${mongoDb}${process.env.NODE_ENV === "test" ? "-test" : ""}`;

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
app.set("views", path.join(appRootPath, "views"));
app.use(express.static(path.join(appRootPath, "public")));

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
