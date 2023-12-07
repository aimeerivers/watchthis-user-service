import assert from "node:assert";
import { after, before, describe, it } from "node:test";
import { Server } from "node:http";
import { app } from "../src/app";

const port = 3001;
const baseUrl = `http://localhost:${port}`;
let server: Server;

describe("App", () => {
  before(() => {
    server = app.listen(port);
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

  after(() => {
    server.close();
  });
});
