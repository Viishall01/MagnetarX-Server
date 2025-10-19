const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/github-manager";

async function testDatabase() {
  try {
    console.log("🔌 Testing MongoDB connection...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected successfully!");

    // Test basic operations
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(
      "📋 Available collections:",
      collections.map((c) => c.name)
    );

    // Test User collection
    const User = mongoose.model(
      "User",
      new mongoose.Schema({
        githubId: Number,
        login: String,
        name: String,
        email: String,
        avatarUrl: String,
        htmlUrl: String,
        bio: String,
        blog: String,
        location: String,
        company: String,
        twitterUsername: String,
        publicRepos: Number,
        publicGists: Number,
        followers: Number,
        following: Number,
        createdAt: Date,
        updatedAt: Date,
        lastSyncedAt: Date,
      })
    );

    const userCount = await User.countDocuments();
    console.log(`👥 Total users in database: ${userCount}`);

    if (userCount > 0) {
      const sampleUser = await User.findOne();
      console.log("📄 Sample user:", {
        githubId: sampleUser.githubId,
        login: sampleUser.login,
        name: sampleUser.name,
        lastSyncedAt: sampleUser.lastSyncedAt,
      });
    }

    console.log("✅ Database test completed successfully!");
  } catch (error) {
    console.error("❌ Database test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

testDatabase();
