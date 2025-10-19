import { Router, Request, Response } from "express";
import { GitHubRepo, ApiResponse } from "../types";

const router: Router = Router();

// GitHub repos endpoint
router.get("/repos", async (req: Request, res: Response): Promise<void> => {
  try {
    // Get access token from Authorization header
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.replace("Bearer ", "") || authHeader?.replace("token ", "");

    console.log("👤 [GitHub API Route] - Request received:", {
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 10)}...` : "NO_TOKEN",
    });

    if (!token) {
      console.log("No access token found, returning 401");
      const errorResponse: ApiResponse = {
        status: "error",
        error: "Unauthorized",
      };
      res.status(401).json(errorResponse);
      return;
    }

    console.log(
      "🔑 [GitHub API Route] - Access token found, calling GitHub API..."
    );
    console.log(
      "📡 [GitHub API Route] - Making request to: https://api.github.com/user/repos"
    );

    const githubRes = await fetch("https://api.github.com/user/repos", {
      headers: { Authorization: `token ${token}` },
    });

    console.log("📊 [GitHub API Route] - GitHub API response:", {
      status: githubRes.status,
      statusText: githubRes.statusText,
      ok: githubRes.ok,
      headers: Object.fromEntries(
        Array.from((githubRes.headers as any).entries()) as [string, string][]
      ),
    });

    if (!githubRes.ok) {
      const errorText = await githubRes.text();
      console.log("❌ [GitHub API Route] - GitHub API error:", errorText);
      const errorResponse: ApiResponse = {
        status: "error",
        error: "GitHub API error",
        details: errorText,
      };
      res.status(githubRes.status).json(errorResponse);
      return;
    }

    const data: GitHubRepo[] = await githubRes.json();

    console.log("✅ [GitHub API Route] - GitHub API success:", {
      repoCount: Array.isArray(data) ? data.length : "NOT_ARRAY",
      firstRepo:
        Array.isArray(data) && data.length > 0
          ? {
              id: data[0].id,
              name: data[0].name,
              private: data[0].private,
              language: data[0].language,
            }
          : "NO_REPOS",
    });

    res.json(data);
  } catch (error) {
    console.error("❌ [GitHub API Route] - Error:", error);
    const errorResponse: ApiResponse = {
      status: "error",
      error: "Internal server error",
    };
    res.status(500).json(errorResponse);
  }
});

// GitHub user details endpoint
router.get("/user", async (req: Request, res: Response): Promise<void> => {
  try {
    // Get access token from Authorization header
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.replace("Bearer ", "") || authHeader?.replace("token ", "");

    console.log("👤 [GitHub User Route] - Request received:", {
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 10)}...` : "NO_TOKEN",
    });

    if (!token) {
      console.log("No access token found, returning 401");
      const errorResponse: ApiResponse = {
        status: "error",
        error: "Unauthorized",
      };
      res.status(401).json(errorResponse);
      return;
    }

    console.log(
      "🔑 [GitHub User Route] - Access token found, calling GitHub API..."
    );
    console.log(
      "📡 [GitHub User Route] - Making request to: https://api.github.com/user"
    );

    const githubRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${token}` },
    });

    console.log("📊 [GitHub User Route] - GitHub API response:", {
      status: githubRes.status,
      statusText: githubRes.statusText,
      ok: githubRes.ok,
      headers: Object.fromEntries(
        Array.from((githubRes.headers as any).entries()) as [string, string][]
      ),
    });

    if (!githubRes.ok) {
      const errorText = await githubRes.text();
      console.log("❌ [GitHub User Route] - GitHub API error:", errorText);
      const errorResponse: ApiResponse = {
        status: "error",
        error: "GitHub API error",
        details: errorText,
      };
      res.status(githubRes.status).json(errorResponse);
      return;
    }

    const userData = await githubRes.json();

    console.log("✅ [GitHub User Route] - GitHub API success:", {
      userId: userData.id,
      username: userData.login,
      name: userData.name,
      email: userData.email,
      publicRepos: userData.public_repos,
      followers: userData.followers,
      following: userData.following,
    });

    res.json(userData);
  } catch (error) {
    console.error("❌ [GitHub User Route] - Error:", error);
    const errorResponse: ApiResponse = {
      status: "error",
      error: "Internal server error",
    };
    res.status(500).json(errorResponse);
  }
});

export default router;
