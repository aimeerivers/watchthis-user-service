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
import { generateValidPassword, generateValidUsername } from "./helpers/testData.js";

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
        .send({ username: generateValidUsername(), password: generateValidPassword() });
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/dashboard");
    });

    it("should redirect to the callbackUrl if one is set", async () => {
      const callbackUrl = "/test";
      const res = await request(app)
        .post("/signup")
        .type("form")
        .send({ username: generateValidUsername(), password: generateValidPassword(), callbackUrl });
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, callbackUrl);
    });

    it("should redirect back to signup with validation errors for invalid password", async () => {
      const res = await request(app)
        .post("/signup")
        .type("form")
        .send({ username: generateValidUsername(), password: "weak" }); // Invalid password
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/signup");
    });

    it("should redirect back to signup with validation errors for invalid username", async () => {
      const res = await request(app)
        .post("/signup")
        .type("form")
        .send({ username: "ab", password: generateValidPassword() }); // Username too short
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/signup");
    });

    it("should show validation error messages on signup page after invalid submission", async () => {
      const agent = session(app);

      // First, submit invalid data
      const postRes = await agent.post("/signup").type("form").send({ username: "ab", password: "weak" }); // Both invalid
      assert.equal(postRes.statusCode, 302);
      assert.equal(postRes.headers.location, "/signup");

      // Then, get the signup page to see the error messages
      const getRes = await agent.get("/signup");
      assert.equal(getRes.statusCode, 200);
      assert.ok(getRes.text.includes("Username must be between 3 and 30 characters"));
      assert.ok(getRes.text.includes("Password must be at least 8 characters long"));
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
      username = generateValidUsername();
      password = generateValidPassword();

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

  describe("Health", () => {
    it("should respond with health status", async () => {
      const res = await request(app).get("/health");
      assert.equal(res.statusCode, 200);
      assert.equal(res.type, "application/json");
      const body = JSON.parse(res.text);
      assert.equal(body.status, "healthy");
      assert.equal(body.service, "watchthis-user-service");
      assert.equal(body.database, "connected");
      assert.ok(body.version);
      assert.ok(body.timestamp);
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

      it("should return user details when authenticated", async () => {
        const res = await testSession.get("/api/v1/session");
        assert.equal(res.statusCode, 200);
        const responseBody = JSON.parse(res.text);
        assert(responseBody.user);
        assert(responseBody.user._id);
        assert.equal(responseBody.user.username, username);
      });

      it("should return 401 when not authenticated", async () => {
        const res = await request(app).get("/api/v1/session");
        assert.equal(res.statusCode, 401);
        const responseBody = JSON.parse(res.text);
        assert.equal(responseBody.error, "Not authenticated");
      });

      it("should return 401 after user has logged out", async () => {
        await testSession.post("/logout");
        const res = await testSession.get("/api/v1/session");
        assert.equal(res.statusCode, 401);
        const responseBody = JSON.parse(res.text);
        assert.equal(responseBody.error, "Not authenticated");
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
