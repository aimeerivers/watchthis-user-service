import assert from "node:assert";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { faker } from "@faker-js/faker";
import mongoose from "mongoose";
import request from "supertest";

import { app } from "../src/app";
import { mongoStore } from "../src/authentication";
import { User } from "../src/models/user";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const session = require("supertest-session");

const port = 18583;
let server: Server;
describe("App", () => {
  before(() => {
    server = app.listen(port);
  });

  describe("Dashboard", () => {
    it("should require authentication", async () => {
      const res = await request(app).get("/dashboard");
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/login");
    });
  });

  describe("Sign up", () => {
    it("should render the signup page", async () => {
      const res = await request(app).get("/signup");
      assert.equal(res.statusCode, 200);
      assert.ok(res.text.includes("form"));
    });

    it("should create a user and redirect to the dashboard", async () => {
      const res = await request(app)
        .post("/signup")
        .type("form")
        .send({ username: faker.internet.userName(), password: faker.internet.password() });
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/dashboard");
    });
  });

  describe("Log in", () => {
    let username: string;
    let password: string;

    before(async () => {
      username = faker.internet.userName();
      password = faker.internet.password();

      const user = new User({
        username,
        password,
      });
      await user.save();
    });

    it("should be able to log in with known username and password", async () => {
      const res = await request(app).post("/login").type("form").send({ username, password });
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/dashboard");
    });

    it("should not be able to log in with incorrect password", async () => {
      const res = await request(app).post("/login").type("form").send({ username, password: "wrongpassword" });
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/");
    });

    it("should not be able to log in with invalid username", async () => {
      const res = await request(app).post("/login").type("form").send({ username: "invalidusername", password });
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/");
    });
  });

  describe("Log out", () => {
    let testSession: request.SuperTest<request.Test>;
    let username: string;
    let password: string;

    before(async () => {
      testSession = session(app);
      username = faker.internet.userName();
      password = faker.internet.password();

      const user = new User({
        username,
        password,
      });
      await user.save();
      await testSession.post("/login").type("form").send({ username, password });
    });

    it("should log out", async () => {
      let res: request.Response;

      // Ensure logged in
      res = await testSession.get("/dashboard");
      assert.ok(res.text.includes("Dashboard"));

      // Log out
      res = await testSession.post("/logout");
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/");

      // Ensure logged out
      res = await testSession.get("/dashboard");
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/login");
    });
  });

  it("should say hello world", async () => {
    const res = await request(app).get("/");
    assert.ok(res.text.includes("Welcome to watch this!"));
  });

  it("should give a 404 when a route is not found", async () => {
    const res = await request(app).get("/aaa");
    assert.equal(res.statusCode, 404);
  });

  it("should respond to /andre as a POST request", async () => {
    const res = await request(app).post("/andre");
    assert.ok(res.text.includes("potato"));
  });

  it("should say hello to aimee", async () => {
    const res = await request(app).get("/hello/aimee");
    assert.ok(res.text.includes("Hello aimee!"));
  });

  it("should say hello to zoe", async () => {
    const res = await request(app).get("/hello/zoe");
    assert.ok(res.text.includes("Hello zoe!"));
  });

  it("should serve static files from the public directory", async () => {
    const res = await request(app).get("/hello.txt");
    assert.ok(res.text.includes("Hello!"));
  });

  after(async () => {
    server.close();
    await User.deleteMany({});
    mongoose.connection.close();
    if (mongoStore !== undefined) {
      await mongoStore.close();
    }
  });
});
