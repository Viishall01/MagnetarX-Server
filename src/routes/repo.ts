import { Request, Response, Router } from "express";
import axios from "axios";
import { GitHubCodeProcessor } from "../services/repoProcessing";

const router: Router = Router();

// Main controller endpoint
router.post(
  "/process/:owner/:repo",
  async (req: Request, res: Response): Promise<void> => {
    const { owner, repo } = req.params;
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.replace("Bearer ", "") || authHeader?.replace("token ", "");

    if (!token) {
      res.status(401).json({
        success: false,
        message: "GitHub access token is required",
      });
      return;
    }

    try {
      const processor = new GitHubCodeProcessor(token, owner, repo);
      const result = await processor.processRepository();

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          chunksProcessed: result.chunksProcessed,
          repository: `${owner}/${repo}`,
          processedAt: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error: any) {
      console.error("Controller error:", error.message);
      res.status(500).json({
        success: false,
        message: `Internal server error: ${error.message}`,
      });
    }
  }
);

// Get repository data (existing endpoint)
router.get("/:owner/:repo", async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const authHeader = req.headers.authorization;
  const token =
    authHeader?.replace("Bearer ", "") || authHeader?.replace("token ", "");

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || "Failed to fetch repo",
    });
  }
});

export default router;
