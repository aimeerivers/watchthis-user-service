import assert from "node:assert";
import type { Server } from "node:http";
import { after, before, beforeEach, describe, it } from "node:test";

import mongoose from "mongoose";
import request from "supertest";

import { app } from "../src/app.js";
import { User } from "../src/models/user.js";
import { generateTokenPair } from "../src/utils/jwt.js";
import { generateValidPassword, generateValidUsername } from "./helpers/testData.js";

const port = 18585; // Different port to avoid conflicts
let server: Server;

describe("JWT Middleware", () => {
  before(async () => {
    server = app.listen(port);

    // Wait for database connection to be ready
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once("connected", resolve);
      });
    }

    // Clean up any existing test data
    await User.deleteMany({});
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await User.deleteMany({});
  });

  after(async () => {
    return new Promise<void>((resolve) => {
      server.close(async () => {
        try {
          // Clean up test data before closing connection
          if (mongoose.connection.readyState === 1) {
            await User.deleteMany({});
          }

          // Close the MongoDB connection to allow the test process to exit cleanly
          await mongoose.connection.close();
          console.log("JWT middleware test cleanup completed");
        } catch (error) {
          console.error("Error during JWT middleware test cleanup:", error);
        } finally {
          resolve();
        }
      });
    });
  });

  describe("authenticateJWT middleware", () => {
    it("should authenticate valid Bearer token", async () => {
      // Create a test user
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const tokens = generateTokenPair(user);

      // Test with valid token
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.username, username);
    });

    it("should continue without user for missing Authorization header", async () => {
      // This endpoint requires auth, so it should return 401
      const res = await request(app).get("/api/v1/auth/me").expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "AUTHENTICATION_REQUIRED");
    });

    it("should continue without user for malformed Authorization header", async () => {
      const res = await request(app).get("/api/v1/auth/me").set("Authorization", "NotBearer token123").expect(401);

      assert.equal(res.body.success, false);
    });

    it("should continue without user for invalid token", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid.jwt.token")
        .expect(401);

      assert.equal(res.body.success, false);
    });

    it("should continue without user when user no longer exists", async () => {
      // Create a test user and get token
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const tokens = generateTokenPair(user);

      // Delete the user
      await User.findByIdAndDelete(user.id);

      // Token should be invalid now
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .expect(401);

      assert.equal(res.body.success, false);
    });

    it("should reject refresh tokens in access token contexts", async () => {
      // Create a test user
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const tokens = generateTokenPair(user);

      // Try to use refresh token where access token is expected
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${tokens.refreshToken}`)
        .expect(401);

      assert.equal(res.body.success, false);
    });
  });

  describe("requireJWT middleware", () => {
    it("should allow access with valid JWT", async () => {
      // Create a test user
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const tokens = generateTokenPair(user);

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .expect(200);

      assert.equal(res.body.success, true);
    });

    it("should block access without JWT", async () => {
      const res = await request(app).get("/api/v1/auth/me").expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "AUTHENTICATION_REQUIRED");
      assert.equal(
        res.body.error.message,
        "Valid JWT token required. Please provide a valid token in the Authorization header."
      );
    });
  });

  describe("Token format validation", () => {
    it("should handle empty Authorization header", async () => {
      const res = await request(app).get("/api/v1/auth/me").set("Authorization", "").expect(401);

      assert.equal(res.body.success, false);
    });

    it("should handle Authorization header without Bearer prefix", async () => {
      const res = await request(app).get("/api/v1/auth/me").set("Authorization", "sometoken").expect(401);

      assert.equal(res.body.success, false);
    });

    it("should handle Bearer without token", async () => {
      const res = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer ").expect(401);

      assert.equal(res.body.success, false);
    });

    it("should handle Bearer with empty string token", async () => {
      const res = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer ").expect(401);

      assert.equal(res.body.success, false);
    });
  });

  describe("Integration with existing authentication", () => {
    it("should not interfere with session-based endpoints", async () => {
      // Test that session-based endpoints still work
      const res = await request(app).get("/login").expect(200);

      assert.ok(res.text.includes("form"));
    });

    it("should not interfere with public endpoints", async () => {
      const res = await request(app).get("/ping").expect(200);

      assert.ok(res.text.includes("watchthis-user-service"));
    });

    it("should not affect health check endpoint", async () => {
      const res = await request(app).get("/health").expect(200);

      assert.equal(res.body.status, "healthy");
    });
  });
});
