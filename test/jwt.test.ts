import assert from "node:assert";
import type { Server } from "node:http";
import { after, before, beforeEach, describe, it } from "node:test";

import mongoose from "mongoose";
import request from "supertest";

import { app } from "../src/app.js";
import { User } from "../src/models/user.js";
import { generateTokenPair, verifyToken } from "../src/utils/jwt.js";
import { generateValidPassword, generateValidUsername } from "./helpers/testData.js";

const port = 18584; // Different port to avoid conflicts
let server: Server;

describe("JWT Authentication API", () => {
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
    return new Promise<void>((resolve, reject) => {
      const cleanup = async () => {
        try {
          // Clean up test data before closing connection
          if (mongoose.connection.readyState === 1) {
            await User.deleteMany({});
          }

          // Close the MongoDB connection to allow the test process to exit cleanly
          await mongoose.connection.close();
          console.log("JWT test cleanup completed");
          resolve();
        } catch (error) {
          console.error("Error during JWT test cleanup:", error);
          reject(error);
        }
      };

      server.close(cleanup);

      // Force cleanup after 5 seconds if server doesn't close properly
      setTimeout(() => {
        console.log("Force closing JWT test");
        cleanup();
      }, 5000);
    });
  });

  describe("POST /api/v1/auth/login - JWT Login", () => {
    it("should authenticate user with valid credentials and return JWT tokens", async () => {
      // Create a test user
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const res = await request(app).post("/api/v1/auth/login").send({ username, password }).expect(200);

      assert.equal(res.body.success, true);
      assert.ok(res.body.data);
      assert.ok(res.body.data.accessToken);
      assert.ok(res.body.data.refreshToken);
      assert.equal(res.body.data.expiresIn, "24h");
      assert.equal(res.body.data.user.username, username);
      assert.ok(res.body.data.user._id);

      // Verify the access token is valid
      const decoded = verifyToken(res.body.data.accessToken);
      assert.equal(decoded.type, "access");
      assert.equal(decoded.username, username);
      assert.equal(decoded.userId, user.id);
    });

    it("should fail with missing username", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({ password: "password123" }).expect(400);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "MISSING_CREDENTIALS");
      assert.equal(res.body.error.message, "Username and password are required");
    });

    it("should fail with missing password", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({ username: "testuser" }).expect(400);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "MISSING_CREDENTIALS");
    });

    it("should fail with invalid username", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ username: "nonexistent", password: "password123" })
        .expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "INVALID_CREDENTIALS");
      assert.equal(res.body.error.message, "Invalid username or password");
    });

    it("should fail with invalid password", async () => {
      // Create a test user
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ username, password: "wrongpassword" })
        .expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "INVALID_CREDENTIALS");
    });
  });

  describe("POST /api/v1/auth/refresh - Token Refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      // Create a test user and get tokens
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const loginRes = await request(app).post("/api/v1/auth/login").send({ username, password }).expect(200);

      const { refreshToken } = loginRes.body.data;

      // Use refresh token to get new access token
      const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken }).expect(200);

      assert.equal(res.body.success, true);
      assert.ok(res.body.data.accessToken);
      assert.ok(res.body.data.refreshToken);
      assert.equal(res.body.data.user.username, username);

      // Verify the new access token is valid
      const decoded = verifyToken(res.body.data.accessToken);
      assert.equal(decoded.type, "access");
      assert.equal(decoded.username, username);

      // The tokens might be the same if generated at the exact same time
      // What's important is that the refresh endpoint works
      assert.ok(res.body.data.accessToken);
      assert.ok(res.body.data.refreshToken);
    });

    it("should fail with missing refresh token", async () => {
      const res = await request(app).post("/api/v1/auth/refresh").send({}).expect(400);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "MISSING_REFRESH_TOKEN");
    });

    it("should fail with invalid refresh token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: "invalid.token.here" })
        .expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "INVALID_REFRESH_TOKEN");
    });

    it("should fail when using access token as refresh token", async () => {
      // Create a test user and get tokens
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const loginRes = await request(app).post("/api/v1/auth/login").send({ username, password }).expect(200);

      const { accessToken } = loginRes.body.data;

      // Try to use access token as refresh token
      const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: accessToken }).expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "INVALID_TOKEN_TYPE");
    });

    it("should fail when user no longer exists", async () => {
      // Create a test user and get tokens
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const tokens = generateTokenPair(user);

      // Delete the user
      await User.findByIdAndDelete(user.id);

      // Try to refresh token
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "USER_NOT_FOUND");
    });
  });

  describe("GET /api/v1/auth/me - Get Current User", () => {
    it("should return user info with valid JWT token", async () => {
      // Create a test user and get token
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const loginRes = await request(app).post("/api/v1/auth/login").send({ username, password }).expect(200);

      const { accessToken } = loginRes.body.data;

      // Get current user info
      const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${accessToken}`).expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.username, username);
      assert.equal(res.body.data.user._id, user.id);
    });

    it("should fail without authorization header", async () => {
      const res = await request(app).get("/api/v1/auth/me").expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "AUTHENTICATION_REQUIRED");
    });

    it("should fail with invalid token", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid.token.here")
        .expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "AUTHENTICATION_REQUIRED");
    });

    it("should fail with malformed authorization header", async () => {
      const res = await request(app).get("/api/v1/auth/me").set("Authorization", "InvalidFormat token").expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "AUTHENTICATION_REQUIRED");
    });

    it("should fail when user no longer exists", async () => {
      // Create a test user and get token
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const tokens = generateTokenPair(user);

      // Delete the user
      await User.findByIdAndDelete(user.id);

      // Try to get current user
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "AUTHENTICATION_REQUIRED");
    });

    it("should fail when using refresh token instead of access token", async () => {
      // Create a test user and get tokens
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const tokens = generateTokenPair(user);

      // Try to use refresh token for authenticated endpoint
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${tokens.refreshToken}`)
        .expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "AUTHENTICATION_REQUIRED");
    });
  });

  describe("JWT Middleware Integration", () => {
    it("should work with existing session endpoint", async () => {
      // Test that the existing /api/v1/session endpoint still works
      // This should continue to work for session-based authentication
      const res = await request(app).get("/api/v1/session").expect(401);

      assert.equal(res.body.error, "Not authenticated");
    });

    it("should allow both session and JWT auth to coexist", async () => {
      // Create a test user
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      // Test JWT auth works
      const jwtRes = await request(app).post("/api/v1/auth/login").send({ username, password }).expect(200);

      assert.ok(jwtRes.body.data.accessToken);

      // Test session auth endpoints still exist
      const sessionRes = await request(app).get("/login").expect(200);

      assert.ok(sessionRes.text.includes("form"));
    });
  });

  describe("JWT Utility Functions", () => {
    it("should generate valid token pairs", async () => {
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const tokens = generateTokenPair(user);

      assert.ok(tokens.accessToken);
      assert.ok(tokens.refreshToken);
      assert.equal(tokens.expiresIn, "24h");

      // Verify both tokens
      const accessDecoded = verifyToken(tokens.accessToken);
      const refreshDecoded = verifyToken(tokens.refreshToken);

      assert.equal(accessDecoded.type, "access");
      assert.equal(refreshDecoded.type, "refresh");
      assert.equal(accessDecoded.userId, user.id);
      assert.equal(refreshDecoded.userId, user.id);
      assert.equal(accessDecoded.username, username);
      assert.equal(refreshDecoded.username, username);
    });

    it("should verify tokens correctly", async () => {
      const username = generateValidUsername();
      const password = generateValidPassword();
      const user = new User({ username, password });
      await user.save();

      const tokens = generateTokenPair(user);
      const decoded = verifyToken(tokens.accessToken);

      assert.equal(decoded.userId, user.id);
      assert.equal(decoded.username, username);
      assert.equal(decoded.type, "access");
    });

    it("should throw error for invalid tokens", () => {
      assert.throws(() => {
        verifyToken("invalid.token.here");
      });
    });
  });
});
