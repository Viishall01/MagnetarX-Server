import { Router, Request, Response } from "express";
import { GitHubRepo, ApiResponse, StoredUser } from "../types";
import { UserService } from "../services/userService";

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

    // Store user data in MongoDB
    try {
      console.log("💾 [GitHub User Route] - Storing user data in MongoDB...");
      const storedUser = await UserService.upsertUser(userData);

      console.log("✅ [GitHub User Route] - User data stored successfully:", {
        storedUserId: storedUser._id,
        githubId: storedUser.githubId,
        login: storedUser.login,
        lastSyncedAt: storedUser.lastSyncedAt,
      });

      // Return the stored user data (cleaned up)
      const responseData: StoredUser = {
        _id: (storedUser._id as any).toString(),
        githubId: storedUser.githubId,
        login: storedUser.login,
        name: storedUser.name,
        email: storedUser.email,
        avatarUrl: storedUser.avatarUrl,
        htmlUrl: storedUser.htmlUrl,
        bio: storedUser.bio,
        blog: storedUser.blog,
        location: storedUser.location,
        company: storedUser.company,
        twitterUsername: storedUser.twitterUsername,
        publicRepos: storedUser.publicRepos,
        publicGists: storedUser.publicGists,
        followers: storedUser.followers,
        following: storedUser.following,
        createdAt: storedUser.createdAt,
        updatedAt: storedUser.updatedAt,
        lastSyncedAt: storedUser.lastSyncedAt,
      };

      res.json(responseData);
    } catch (dbError) {
      console.error("❌ [GitHub User Route] - Database error:", dbError);
      // Still return the GitHub data even if database storage fails
      res.json(userData);
    }
  } catch (error) {
    console.error("❌ [GitHub User Route] - Error:", error);
    const errorResponse: ApiResponse = {
      status: "error",
      error: "Internal server error",
    };
    res.status(500).json(errorResponse);
  }
});

// Get stored users endpoint
router.get("/users", async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    console.log("👥 [GitHub Users Route] - Request received:", {
      page,
      limit,
    });

    const result = await UserService.getAllUsers(page, limit);

    console.log("✅ [GitHub Users Route] - Users retrieved successfully:", {
      totalUsers: result.total,
      currentPage: result.page,
      totalPages: result.totalPages,
      usersInPage: result.users.length,
    });

    res.json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("❌ [GitHub Users Route] - Error:", error);
    const errorResponse: ApiResponse = {
      status: "error",
      error: "Internal server error",
    };
    res.status(500).json(errorResponse);
  }
});

export default router;
