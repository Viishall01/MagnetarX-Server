import dotenv from "dotenv";

// Load environment variables FIRST, before any other imports
dotenv.config();

import express, { Application, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import githubRoutes from "./routes/github";
import repoRoutes from "./routes/repo";
import { connectDatabase } from "./config/database";

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || "3001", 10);

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Frontend URL
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/repo", repoRoutes);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", message: "Backend server is running" });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
