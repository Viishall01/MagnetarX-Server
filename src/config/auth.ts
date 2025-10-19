import { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { CustomSession } from "../types";

const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: { scope: "read:user repo" }, // 'repo' gives access to private repos too
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // console.log("🔐 [JWT Callback] - Token received:", {
      //   tokenKeys: Object.keys(token),
      //   hasAccount: !!account,
      //   accountType: account?.type,
      //   accountProvider: account?.provider,
      //   tokenSub: token.sub,
      //   tokenEmail: token.email,
      //   tokenName: token.name,
      // });

      if (account) {
        // console.log("🔑 [JWT Callback] - Account access token received:", {
        //   accessToken: account.access_token
        //     ? `${account.access_token.substring(0, 10)}...`
        //     : "NO_TOKEN",
        //   tokenType: account.token_type,
        //   expiresAt: account.expires_at,
        //   refreshToken: account.refresh_token ? "PRESENT" : "NOT_PRESENT",
        // });

        token.accessToken = account.access_token;
        console.log("✅ [JWT Callback] - Access token stored in JWT token");
      } else {
        console.log(
          "ℹ️ [JWT Callback] - No account provided, using existing token"
        );
      }

      console.log("🔐 [JWT Callback] - Final token keys:", Object.keys(token));
      return token;
    },
    async session({ session, token }) {
      console.log("👤 [Session Callback] - Creating session:", {
        sessionUser: session.user
          ? {
              name: session.user.name,
              email: session.user.email,
              image: session.user.image ? "PRESENT" : "NOT_PRESENT",
            }
          : "NO_USER",
        tokenKeys: Object.keys(token),
        hasAccessToken: !!token.accessToken,
      });

      (session as CustomSession).accessToken = token.accessToken as string;

      console.log(
        "✅ [Session Callback] - Session created with access token:",
        {
          accessToken: (session as CustomSession).accessToken
            ? `${(session as CustomSession).accessToken!.substring(0, 10)}...`
            : "NO_TOKEN",
          user: session.user?.name || "NO_USER",
        }
      );

      return session;
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log("🎉 [SignIn Event] - User signed in:", {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        provider: account?.provider,
        accountType: account?.type,
        isNewUser,
        hasProfile: !!profile,
      });
    },
    async signOut({ token, session }) {
      console.log("👋 [SignOut Event] - User signed out:", {
        hadToken: !!token,
        hadSession: !!session,
        tokenKeys: token ? Object.keys(token) : "NO_TOKEN",
      });
    },
  },
  debug: true, // Enable NextAuth debug mode
};

export { authOptions };
