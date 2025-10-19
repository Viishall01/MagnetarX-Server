import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/github-repo-manager";

export const connectDatabase = async (): Promise<void> => {
  try {
    if (!MONGODB_URI) {
      throw new Error(
        "MongoDB URI is not defined. Please set MONGO_URI environment variable."
      );
    }

    await mongoose.connect(MONGODB_URI);
    console.log("✅ [Database] - Connected to MongoDB successfully");
    console.log(
      `📊 [Database] - Using URI: ${MONGODB_URI.replace(
        /\/\/.*@/,
        "//***:***@"
      )}`
    ); // Hide credentials in logs
  } catch (error) {
    console.error("[Database] - MongoDB connection error:", error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("✅ [Database] - Disconnected from MongoDB");
  } catch (error) {
    console.error("[Database] - MongoDB disconnection error:", error);
  }
};
