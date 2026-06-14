import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { initSentry } from "./config/sentry.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import { courseRoutes } from "./routes/course.routes.js";
import { examRoutes } from "./routes/exam.routes.js";
import { contentRoutes } from "./routes/content.routes.js";
import { gradeRoutes } from "./routes/grade.routes.js";
import { userRoutes } from "./routes/user.routes.js";
import { sessionRoutes, sessionDetailRoutes, summaryRoutes } from "./routes/session.routes.js";
import { configRoutes } from "./routes/config.routes.js";
import { substitutionRoutes } from "./routes/substitution.routes.js";
import { getReadinessStatus } from "./services/health.service.js";

export const app = express();

initSentry();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/health/ready", async (_req, res, next) => {
  try {
    const readiness = await getReadinessStatus();
    res.status(readiness.status === "ready" ? 200 : 503).json(readiness);
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/courses/:id/sessions", sessionRoutes);
app.use("/api/sessions", sessionDetailRoutes);
app.use("/api/summaries", summaryRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/config", configRoutes);
app.use("/api/substitutions", substitutionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
