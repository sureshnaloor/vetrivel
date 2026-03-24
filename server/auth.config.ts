import Google from "@auth/express/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./lib/db";

export const authConfig = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  callbacks: {
    redirect(params: { url: string; baseUrl: string }) {
      const { url, baseUrl } = params;
      if (url.startsWith("/")) return `http://localhost:5173${url}`;
      else if (new URL(url).origin === "http://localhost:5173") return url;
      return baseUrl;
    }
  }
};
