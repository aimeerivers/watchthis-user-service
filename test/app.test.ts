import assert from "node:assert";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { faker } from "@faker-js/faker";
import mongoose from "mongoose";
import request from "supertest";

import { app } from "../src/app";
import { User } from "../src/models/user";

const port = 3001;
const baseUrl = `http://localhost:${port}`;
let server: Server;

describe("App", () => {
  before(() => {
    server = app.listen(port);
  });

  describe("Dashboard", () => {
    it("should require authentication", async () => {
      const res = await request(app).get("/dashboard");
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, "/signup");
    });
  });

  describe("Signup", () => {
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

  it("should say hello world", async () => {
    const response = await fetch(baseUrl + "/");
    const body = await response.text();
    assert.ok(body.includes("Hello World!"));
  });

  it("should give a 404 when a route is not found", async () => {
    const response = await fetch(baseUrl + "/aaa");
    assert.equal(response.status, 404);
  });

  it("should respond to /andre as a POST request", async () => {
    const response = await fetch(baseUrl + "/andre", { method: "POST" });
    const body = await response.text();
    assert.ok(body.includes("potato"));
  });

  it("should say hello to aimee", async () => {
    const response = await fetch(baseUrl + "/hello/aimee");
    const body = await response.text();
    assert.ok(body.includes("Hello aimee!"));
  });

  it("should say hello to zoe", async () => {
    const response = await fetch(baseUrl + "/hello/zoe");
    const body = await response.text();
    assert.ok(body.includes("Hello zoe!"));
  });

  after(async () => {
    server.close();
    await User.deleteMany({});
    mongoose.connection.close();
  });
});
