import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  githubId: number;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string;
  htmlUrl: string;
  bio: string | null;
  blog: string | null;
  location: string | null;
  company: string | null;
  twitterUsername: string | null;
  publicRepos: number;
  publicGists: number;
  followers: number;
  following: number;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    githubId: {
      type: Number,
      required: true,
      unique: true,
    },
    login: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      default: null,
    },
    avatarUrl: {
      type: String,
      required: true,
    },
    htmlUrl: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      default: null,
    },
    blog: {
      type: String,
      default: null,
    },
    location: {
      type: String,
      default: null,
    },
    company: {
      type: String,
      default: null,
    },
    twitterUsername: {
      type: String,
      default: null,
    },
    publicRepos: {
      type: Number,
      default: 0,
    },
    publicGists: {
      type: Number,
      default: 0,
    },
    followers: {
      type: Number,
      default: 0,
    },
    following: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      required: true,
    },
    updatedAt: {
      type: Date,
      required: true,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // This adds createdAt and updatedAt automatically
  }
);

// Create additional indexes for better performance
// Note: githubId and login already have unique indexes from unique: true
UserSchema.index({ lastSyncedAt: 1 });

export default mongoose.model<IUser>("User", UserSchema);
