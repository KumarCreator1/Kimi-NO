import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index.js";
import db from "../db/connectDb.js";
import { users } from "../models/Db.schema.js";
import { eq } from "drizzle-orm";

describe("Auth Endpoints", () => {
  const testUser = {
    firstName: "Test",
    lastName: "User",
    email: `test_${Date.now()}@example.com`,
    password: "Password123!",
  };

  // Helper to extract cookies from supertest response
  const getCookies = (res) => {
    const cookies = res.headers["set-cookie"];
    return cookies ? cookies.map(c => c.split(';')[0]).join('; ') : "";
  };

  afterAll(async () => {
    // Cleanup: Remove the test user we just created to keep the DB clean
    await db.delete(users).where(eq(users.email, testUser.email));
  });

  it("should register a new user", async () => {
    const res = await request(app)
      .post("/api/v1/user/register")
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    // Should NOT return password
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("should not allow duplicate registration", async () => {
    const res = await request(app)
      .post("/api/v1/user/register")
      .send(testUser);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("already exists");
  });

  let authCookies = "";

  it("should login successfully and set cookies", async () => {
    const res = await request(app)
      .post("/api/v1/user/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    authCookies = getCookies(res);
    expect(authCookies).toContain("accessToken");
    expect(authCookies).toContain("refreshToken");
  });

  it("should fail login with wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/user/login")
      .send({
        email: testUser.email,
        password: "WrongPassword123!",
      });

    expect(res.status).toBe(401);
  });

  it("should refresh access token", async () => {
    const res = await request(app)
      .post("/api/v1/user/refresh")
      .set("Cookie", authCookies);

    expect(res.status).toBe(200);
    
    // Grab the new cookies for the next tests
    const newCookies = getCookies(res);
    expect(newCookies).toContain("accessToken");
  });

  it("should logout successfully and clear cookies", async () => {
    const res = await request(app)
      .post("/api/v1/user/logout")
      .set("Cookie", authCookies);

    expect(res.status).toBe(200);
    
    const clearedCookies = res.headers["set-cookie"].join(";");
    // Express clearCookie sets the value to empty and expires in the past
    expect(clearedCookies).toContain("accessToken=;");
    expect(clearedCookies).toContain("refreshToken=;");
  });
});
