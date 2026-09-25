import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index.js";
import db from "../db/connectDb.js";
import { users, classes } from "../models/Db.schema.js";
import { eq } from "drizzle-orm";

describe("Class & Subject Endpoints", () => {
  const testUser = {
    firstName: "Professor",
    email: `prof_${Date.now()}@example.com`,
    password: "Password123!",
  };

  let authCookies = "";
  let classId = "";
  let subjectId = "";

  beforeAll(async () => {
    // Register & Login to get cookies
    await request(app).post("/api/v1/user/register").send(testUser);
    const res = await request(app).post("/api/v1/user/login").send({
      email: testUser.email,
      password: testUser.password,
    });
    const cookies = res.headers["set-cookie"];
    authCookies = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : "";
  });

  afterAll(async () => {
    // Cleanup: Remove the test user.
    const [user] = await db.select().from(users).where(eq(users.email, testUser.email)).limit(1);
    if (user) {
      // delete classes first to satisfy restrict constraint
      await db.delete(classes).where(eq(classes.userId, user.id));
      await db.delete(users).where(eq(users.email, testUser.email));
    }
  });

  it("should create a new class", async () => {
    const res = await request(app)
      .post("/api/v1/class")
      .set("Cookie", authCookies)
      .send({
        className: "Advanced Physics",
        description: "A hard class",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.class.className).toBe("Advanced Physics");
    
    classId = res.body.data.class.id;
  });

  it("should list user's classes", async () => {
    const res = await request(app)
      .get("/api/v1/class")
      .set("Cookie", authCookies);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.classes)).toBe(true);
    expect(res.body.data.classes.length).toBeGreaterThan(0);
  });

  it("should create a new subject in the class", async () => {
    const res = await request(app)
      .post(`/api/v1/class/${classId}/subject`)
      .set("Cookie", authCookies)
      .send({
        subjectName: "Quantum Mechanics",
        description: "Schrodinger's cat",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.subject.subjectName).toBe("Quantum Mechanics");
    
    subjectId = res.body.data.subject.id;
  });

  it("should prevent creating a duplicate subject", async () => {
    const res = await request(app)
      .post(`/api/v1/class/${classId}/subject`)
      .set("Cookie", authCookies)
      .send({
        subjectName: "Quantum Mechanics", // Same name
      });

    expect(res.status).toBe(400);
  });
  
  it("should fetch subject details", async () => {
    const res = await request(app)
      .get(`/api/v1/class/${classId}/subject/${subjectId}`)
      .set("Cookie", authCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.subject.id).toBe(subjectId);
  });
});
