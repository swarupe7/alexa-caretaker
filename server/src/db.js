import mongoose from "mongoose";

export async function connectDb(uri) {
  if (!uri || !uri.trim()) {
    console.log("[db] No MONGO_URI — using in-memory store");
    return false;
  }
  await mongoose.connect(uri);
  console.log("[db] Connected to MongoDB");
  return true;
}

export function isMongoReady() {
  return mongoose.connection.readyState === 1;
}
