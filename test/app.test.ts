import assert from "node:assert";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { faker } from "@faker-js/faker";
import mongoose from "mongoose";

import { app } from "../src/app";
import { User } from "../src/models/user";

const port = 3001;
const baseUrl = `http://localhost:${port}`;
let server: Server;

describe("App", () => {
  before(() => {
    server = app.listen(port);
  });

  describe("Signup", () => {
    it("should render the signup page", async () => {
      const response = await fetch(baseUrl + "/signup");
      const body = await response.text();
      assert.ok(body.includes("form"));
    });

    it("should create a user", async () => {
      const response = await fetch(baseUrl + "/signup", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: faker.internet.userName(), password: faker.internet.password() }),
      });
      assert.equal(response.status, 200);
      assert.equal(response.url, baseUrl + "/dashboard");
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
