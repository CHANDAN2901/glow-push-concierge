import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
      },
      manifest: {
        name: "Glow Push",
        short_name: "GlowPush",
        description: "הליווי האישי שלך לאחר טיפול PMU",
        theme_color: "#D4AF37",
        background_color: "#1a1a1a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/client",
        scope: "/",
        categories: ["health", "beauty"],
        icons: [
          {
            src: "/app-icon.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/app-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query", "@radix-ui/react-tooltip", "@use-gesture/react"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query", "@use-gesture/react"],
  },
}));
