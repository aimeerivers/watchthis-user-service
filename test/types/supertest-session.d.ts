declare module "supertest-session" {
  import type { Express } from "express";
  import type { SuperTest, Test } from "supertest";

  function session(_app: Express): SuperTest<Test>;

  export = session;
}
