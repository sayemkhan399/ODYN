import "server-only";
import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;

if (!uri) {
  throw new Error("MONGO_URI is required to connect ODYN to MongoDB.");
}

const clientKey = "__odynMongoClient";
const globalForMongo = globalThis;

export const mongoClient =
  globalForMongo[clientKey] ?? new MongoClient(uri);

if (process.env.NODE_ENV !== "production") {
  globalForMongo[clientKey] = mongoClient;
}

export const mongoDatabase = mongoClient.db();
