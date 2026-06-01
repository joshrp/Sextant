import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { getHighsVersion } from "./scripts/highsVersion";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

const __dirname = dirname(fileURLToPath(import.meta.url));
const setupDir = resolve(__dirname, "app/test/setup");

const base = process.env.GITHUB_PAGES ? "/sextant/" : "/";

// Single source of truth for the HiGHS wasm version: the installed version in
// package-lock.json (see scripts/highsVersion.ts). scripts/syncHighsWasm.ts
// fetches public/highs-<version>.wasm to match, and we inject the version into
// the solver worker via `define` below.
const highsVersion = getHighsVersion();
const highsWasmFile = `highs-${highsVersion}.wasm`;

export default defineConfig({
  base,
  plugins: [
    tailwindcss(), 
    !process.env.VITEST && mdx({
      remarkPlugins: [remarkGfm, remarkFrontmatter],
      rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
    }),
    !process.env.VITEST && reactRouter(),
    tsconfigPaths(),
    !process.env.VITEST && {
      name: "verify-highs-wasm",
      buildStart() {
        if (!existsSync(resolve(__dirname, "public", highsWasmFile))) {
          throw new Error(
            `Missing public/${highsWasmFile} for highs@${highsVersion}. ` +
              `Run \`npm run syncHighsWasm\` (normally done automatically by prebuild/predev).`,
          );
        }
      },
    },
  ],
  define: {
    __HIGHS_WASM_VERSION__: JSON.stringify(highsVersion),
  },
  test: {
    // Default test configuration for fast unit tests
    // No jsdom environment - runs in Node environment
    // Exclude component tests and e2e tests from default run
    exclude: ['**/*.component.test.{ts,tsx}', '**/node_modules/**', '**/e2e/**'],
    setupFiles: [resolve(setupDir, "indexeddb.ts")],
  },
});
