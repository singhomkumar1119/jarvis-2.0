import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const base =
  process.env["BASE_PATH"] ||
  (process.env["GITHUB_PAGES"] || process.env["GITHUB_ACTIONS"] ? "/jarvis-2.0/" : "/");

export default defineConfig({
  base,
  define: {
    "import.meta.env.VITE_GEMINI_API_KEY": JSON.stringify(
      process.env["VITE_GEMINI_API_KEY"] || process.env["GEMINI_API_KEY"] || "",
    ),
  },
  server: {
    port: 3000,
    host: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
      prerender: {
        enabled: true,
      },
    }),
    viteReact(),
  ],
});
