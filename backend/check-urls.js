import "dotenv/config";
import db from "./db/connectDb.js";
import { documents } from "./models/Db.schema.js";

async function run() {
  const docs = await db.select().from(documents);
  console.log("URLs:");
  docs.forEach((d) => {
    console.log(d.filePath);
  });
  process.exit(0);
}

run();
