import 'dotenv/config';
import { defineConfig } from "drizzle-kit";
// console.log("DATABASE_URL:drizzle.config", process.env.DATABASE_URL);
export default defineConfig({
  schema: "./models/Db.schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
