// filepath: vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
    root: "src", // Set the root directory to "src"
    optimizeDeps: {
        include: ["dubins-js"], // Ensure dubins-js is pre-bundled
    },
});