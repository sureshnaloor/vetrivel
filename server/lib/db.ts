import "dotenv/config";
import dns from "node:dns";
import { MongoClient, ServerApiVersion } from "mongodb";

// Prefer IPv4 for DNS — avoids some `querySrv ECONNREFUSED` / broken IPv6 setups with Atlas (mongodb+srv)
dns.setDefaultResultOrder("ipv4first");

if (!process.env.MONGODB_URL) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URL"');
}

const uri = process.env.MONGODB_URL;
const options = {
  family: 4 as const,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect().catch((err: Error) => {
      console.error("[MongoDB] Connection failed:", err.message);
      console.error(
        "If you see querySrv/DNS errors: try system DNS 8.8.8.8, disable VPN, or in Atlas use the non-SRV connection string (mongodb://… with host list)."
      );
      throw err;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect().catch((err: Error) => {
    console.error("[MongoDB] Connection failed:", err.message);
    console.error(
      "If you see querySrv/DNS errors: try system DNS 8.8.8.8, disable VPN, or in Atlas use the non-SRV connection string (mongodb://… with host list)."
    );
    throw err;
  });
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
