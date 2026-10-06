import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": `${root}src`,
      "next/font/google": `${root}test/mocks/next-font-google.js`,
      "next/image": `${root}test/mocks/next-image.jsx`,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
  },
});
