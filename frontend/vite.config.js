import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const proxy = {
  "/api": {
    target: process.env.SOURCING_API_TARGET || "http://127.0.0.1:8082",
    changeOrigin: true,
  },
};
export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5176, strictPort: true, proxy },
  preview: { host: "127.0.0.1", port: 4176, strictPort: true, proxy },
});
