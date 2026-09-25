import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import userRoute from "./routes/user.route.js";
import classRoute from "./routes/class.route.js";
import errorMiddleware from "./middlewares/error.middleware.js";

const app = express();
app.set("trust proxy", 1);
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    maxAge: 86400, // 24 hours
  }),
);

const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Welcome to Api hub of Kimi No Na Wa");
});

//routes Routers
app.use("/api/v1/user", userRoute);
app.use("/api/v1/class", classRoute);
// app.use("/url", urlRoute);

//dynamic route put below all static routes
// app.get("/:shortCode", redirectToOriginalUrl);

// 404 Catch-All Middleware
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

app.use(errorMiddleware);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(
      `Server is running on port ${PORT} click http://localhost:${PORT}`,
    );
  });
}

export default app;
