import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // Read backend port from environment (set by start-dev.sh)
  // Default to 3001 if not set (for cases where script isn't used)
  const backendPort = process.env.VITE_BACKEND_PORT || process.env.PORT || '3001';
  const backendUrl = `http://localhost:${backendPort}`;

  console.log(`[Vite] Proxying /api requests to: ${backendUrl}`);

  return {
    plugins: [
      react({
        babel: {
          plugins: [
            // React development plugins
            "@babel/plugin-transform-react-display-name"
          ]
        }
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "#shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
}); 