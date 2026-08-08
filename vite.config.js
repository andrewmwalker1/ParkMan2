import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

function gitShortSha() {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig(({ command }) => ({
  // Served at github.io/ParkMan2/ (a subpath), not a custom domain at
  // root like Hub/Maintenance -- "/" here (copied from those) made the
  // built JS request the wrong path and 404, leaving a blank page.
  // Only applied to production builds so local `npm run dev` stays at
  // the plain root, not /ParkMan2/, for convenience.
  base: command === "build" ? "/ParkMan2/" : "/",
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __GIT_SHA__: JSON.stringify(gitShortSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react()],
}));
