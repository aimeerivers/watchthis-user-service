import assert from "node:assert";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { faker } from "@faker-js/faker";
import mongoose from "mongoose";
import request, { SuperTest, Test } from "supertest";
import session from "supertest-session";

import { app } from "../src/app.js";
import { mongoStore } from "../src/auth.js";
import { User } from "../src/models/user.js";

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

  describe("Sign up page", () => {
    it("should render the signup page", async () => {
      const res = await request(app).get("/signup");
      assert.equal(res.statusCode, 200);
      assert.ok(res.text.includes("form"));
    });

    it("should include a callbackUrl if one is set", async () => {
      const callbackUrl = "/test";
      const res = await request(app).get("/signup").query({ callbackUrl });
      assert.equal(res.statusCode, 200);
      assert.ok(res.text.includes(`<input type="hidden" name="callbackUrl" value="${callbackUrl}">`));
    });
  });

  describe("Sign up", () => {
    it("should create a user and redirect to the dashboard", async () => {
      const res = await request(app)
        .post("/signup")
        .type("form")
        .send({ username: faker.internet.username(), password: faker.internet.password() });
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/dashboard");
    });

    it("should redirect to the callbackUrl if one is set", async () => {
      const callbackUrl = "/test";
      const res = await request(app)
        .post("/signup")
        .type("form")
        .send({ username: faker.internet.username(), password: faker.internet.password(), callbackUrl });
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, callbackUrl);
    });
  });

  describe("Log in page", () => {
    it("should render the login page", async () => {
      const res = await request(app).get("/login");
      assert.equal(res.statusCode, 200);
      assert.ok(res.text.includes("form"));
    });

    it("should include a callbackUrl if one is set", async () => {
      const callbackUrl = "/test";
      const res = await request(app).get("/login").query({ callbackUrl });
      assert.equal(res.statusCode, 200);
      assert.ok(res.text.includes(`<input type="hidden" name="callbackUrl" value="${callbackUrl}">`));
    });
  });

  describe("Log in", () => {
    let username: string;
    let password: string;

    before(async () => {
      username = faker.internet.username();
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

    it("should redirect to the callbackUrl if one is set", async () => {
      const callbackUrl = "/test";
      const res = await request(app).post("/login").type("form").send({ username, password, callbackUrl });
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, callbackUrl);
    });

    it("should not be able to log in with incorrect password", async () => {
      const res = await request(app).post("/login").type("form").send({ username, password: "wrongpassword" });
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/login");
    });

    it("should not be able to log in with invalid username", async () => {
      const res = await request(app).post("/login").type("form").send({ username: "invalidusername", password });
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/login");
    });
  });

  describe("Log out", () => {
    let testSession: SuperTest<Test>;
    let username: string;
    let password: string;

    before(async () => {
      testSession = session(app);
      username = faker.internet.username();
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

    it("should redirect to the callbackUrl if one is set", async () => {
      const callbackUrl = "/test";
      const res = await testSession.post("/logout").type("form").send({ callbackUrl });
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, callbackUrl);
    });
  });

  describe("Ping", () => {
    it("should respond to a ping", async () => {
      const res = await request(app).get("/ping");
      assert.equal(res.statusCode, 200);
    });
  });

  it("should show the welcome page", async () => {
    const res = await request(app).get("/");
    assert.ok(res.text.includes("Welcome to Watch This!"));
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

  describe("API", () => {
    describe("Session", () => {
      let testSession: SuperTest<Test>;
      let username: string;
      let password: string;

      before(async () => {
        testSession = session(app);
        username = faker.internet.username();
        password = faker.internet.password();

        const user = new User({
          username,
          password,
        });
        await user.save();
        await testSession.post("/login").type("form").send({ username, password });
      });

      it("should report session details", async () => {
        const res = await testSession.get("/api/v1/session");
        assert.equal(res.statusCode, 200);
        const responseBody = JSON.parse(res.text);
        assert(responseBody.sessionId);
        assert(responseBody.user);
        assert.equal(responseBody.user.username, username);
      });

      it("should not report session details after user has logged out", async () => {
        await testSession.post("/logout");
        const res = await testSession.get("/api/v1/session");
        assert.equal(res.statusCode, 401);
        const responseBody = JSON.parse(res.text);
        assert.equal(responseBody.error, "Invalid or expired session");
      });
    });
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
