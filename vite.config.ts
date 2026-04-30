import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
const apiTarget = process.env.VITE_API_PROXY_TARGET || "http://localhost:3000";

export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    ...(process.env.VITE_DEV_PORT
      ? { port: Number(process.env.VITE_DEV_PORT) }
      : {}),
    // e.g. VITE_DEV_HOST=0.0.0.0 so the dev server is reachable from another machine
    ...(process.env.VITE_DEV_HOST
      ? {
          host:
            process.env.VITE_DEV_HOST === "all"
              ? true
              : process.env.VITE_DEV_HOST,
        }
      : {}),
    proxy: {
      '/api': apiTarget,
    },
  },
});
