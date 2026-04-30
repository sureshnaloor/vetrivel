import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ExpressAuth } from "@auth/express";
import { authConfig } from "./auth.config";
import { placesRouter } from "./routes/places";
import { customTemplesRouter } from "./routes/customTemples";
import { locationsRouter } from "./routes/locations";
import { templeContentRouter } from "./routes/templeContent";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Trust host is needed in Express
app.set('trust proxy', true);

// Enforce Auth.js to use the frontend's origin so it redirects back to Vite properly
process.env.AUTH_URL = "http://localhost:5173";

// Setup Auth.js v5 route
app.use("/api/auth", ExpressAuth(authConfig));

// Protected API Routes
app.use("/api/places", placesRouter);
app.use("/api/locations", locationsRouter);

// Public/Protected Custom Temples route
app.use("/api/custom-temples", customTemplesRouter);

// Temple Community Content (UGC) route
app.use("/api/temple-content", templeContentRouter);

// A test endpoint
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Express Server!" });
});

app.listen(PORT, () => {
  console.log(`Express server is running on http://localhost:${PORT}`);
});
