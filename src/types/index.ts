import { NextAuthOptions, Session } from "next-auth";

export interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  language: string | null;
  updated_at: string;
}

export interface CustomSession extends Session {
  accessToken?: string;
}

export interface CustomJWT {
  accessToken?: string;
  sub?: string;
  email?: string | null;
  name?: string | null;
}

export interface ApiResponse<T = any> {
  status: string;
  message?: string;
  data?: T;
  error?: string;
  details?: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  location: string | null;
  blog: string | null;
  company: string | null;
  twitter_username: string | null;
}
