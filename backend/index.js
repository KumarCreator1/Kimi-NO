import 'dotenv/config';
import express from "express";
import cookieParser from "cookie-parser";

import userRoute from "./routes/user.route.js";

const app = express();

const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(cookieParser())

app.get("/", (req, res) => {
  res.end("Welcome to Api hub of Kimi No Na Wa");
});

//routes Routers
app.use("/api/v1/user", userRoute);
// app.use("/url", urlRoute);

//dynamic route put below all static routes
// app.get("/:shortCode", redirectToOriginalUrl);

app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT} click http://localhost:${PORT}`,
  );
});