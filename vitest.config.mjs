import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { transformWithEsbuild } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

// Next.js allows JSX in .js files (route handlers such as the share-card route); Vite only parses it in .jsx.
const jsxInJs = {
  name: "jsx-in-js",
  enforce: "pre",
  transform(code, id) {
    if (!/\/src\/.*\.js$/.test(id) || id.includes("/node_modules/")) return null;
    return transformWithEsbuild(code, id, { loader: "jsx", jsx: "automatic" });
  },
};

export default defineConfig({
  plugins: [jsxInJs, react()],
  resolve: {
    alias: {
      "@": `${root}src`,
      "next/font/google": `${root}test/mocks/next-font-google.js`,
      "next/image": `${root}test/mocks/next-image.jsx`,
    },
  },
  test: {
    environment: "jsdom",
    // Backend code runs in Lambda/Node, not a browser.
    environmentMatchGlobs: [["amplify/**", "node"]],
    setupFiles: ["./test/setup.js"],
    include: ["src/**/*.test.{js,jsx}", "amplify/**/*.test.ts"],
  },
});
