import express, { Application, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import githubRoutes from "./routes/github";

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

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", message: "Backend server is running" });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});
