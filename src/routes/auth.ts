import { Router } from "express";
import NextAuth from "next-auth";
import { authOptions } from "../config/auth";

const router: Router = Router();

// Create NextAuth handler
const handler = NextAuth(authOptions);

// Mount NextAuth routes
router.use("/", handler);

export default router;
