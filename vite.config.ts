import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { labContent } from "./scripts/vite-lab-content.mjs";
import { cardData } from "./scripts/vite-card-data.mjs";

export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    // Lab content in pieces: summaries for lists, one lazy lesson per lab.
    labContent(),
    // Photo cards and case summaries for list pages.
    cardData(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: "vercel",
            // Registers server/middleware/* (security headers) on deploys.
            serverDir: "./server",
          }),
        ]
      : []),
    viteReact(),
  ],
}));
