import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// In development, /api is proxied to the backend; in containers Nginx (or the Ingress) does this.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": env.VITE_API_PROXY_TARGET || "http://localhost:8000",
      },
    },
  };
});
