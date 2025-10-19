import User, { IUser } from "../models/User";

export interface GitHubUserData {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  blog: string | null;
  location: string | null;
  company: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export class UserService {
  /**
   * Create or update a user in the database
   */
  static async upsertUser(githubUserData: GitHubUserData): Promise<IUser> {
    try {
      const userData = {
        githubId: githubUserData.id,
        login: githubUserData.login,
        name: githubUserData.name,
        email: githubUserData.email,
        avatarUrl: githubUserData.avatar_url,
        htmlUrl: githubUserData.html_url,
        bio: githubUserData.bio,
        blog: githubUserData.blog,
        location: githubUserData.location,
        company: githubUserData.company,
        twitterUsername: githubUserData.twitter_username,
        publicRepos: githubUserData.public_repos,
        publicGists: githubUserData.public_gists,
        followers: githubUserData.followers,
        following: githubUserData.following,
        createdAt: new Date(githubUserData.created_at),
        updatedAt: new Date(githubUserData.updated_at),
        lastSyncedAt: new Date(),
      };

      const user = await User.findOneAndUpdate(
        { githubId: githubUserData.id },
        userData,
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      console.log("✅ [UserService] - User upserted successfully:", {
        githubId: user.githubId,
        login: user.login,
        name: user.name,
        isNewUser: user.isNew,
      });

      return user;
    } catch (error) {
      console.error("❌ [UserService] - Error upserting user:", error);
      throw error;
    }
  }

  /**
   * Get user by GitHub ID
   */
  static async getUserByGitHubId(githubId: number): Promise<IUser | null> {
    try {
      const user = await User.findOne({ githubId });
      return user;
    } catch (error) {
      console.error(
        "❌ [UserService] - Error getting user by GitHub ID:",
        error
      );
      throw error;
    }
  }

  /**
   * Get user by login
   */
  static async getUserByLogin(login: string): Promise<IUser | null> {
    try {
      const user = await User.findOne({ login });
      return user;
    } catch (error) {
      console.error("❌ [UserService] - Error getting user by login:", error);
      throw error;
    }
  }

  /**
   * Get all users with pagination
   */
  static async getAllUsers(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    users: IUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find().sort({ lastSyncedAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(),
      ]);

      return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error("❌ [UserService] - Error getting all users:", error);
      throw error;
    }
  }

  /**
   * Delete user by GitHub ID
   */
  static async deleteUserByGitHubId(githubId: number): Promise<boolean> {
    try {
      const result = await User.deleteOne({ githubId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error("❌ [UserService] - Error deleting user:", error);
      throw error;
    }
  }
}
