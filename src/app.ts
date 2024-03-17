import path from "path";
import dotenv from "dotenv";

import express from "express";
import mongoose from "mongoose";

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
    res.redirect("/dashboard");
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
