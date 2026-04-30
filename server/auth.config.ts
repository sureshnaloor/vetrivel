import Google from "@auth/express/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./lib/db";

function getBrowserOrigin() {
  return (
    process.env.AUTH_URL ||
    process.env.FRONTEND_ORIGIN ||
    "http://localhost:5173"
  );
}

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
      const origin = getBrowserOrigin();
      if (url.startsWith("/")) return `${origin}${url}`;
      try {
        if (new URL(url).origin === new URL(origin).origin) return url;
      } catch {
        /* invalid origin */
      }
      return baseUrl;
    }
  }
};
