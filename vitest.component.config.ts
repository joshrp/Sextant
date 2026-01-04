import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

export default defineConfig({
  plugins: [tailwindcss(), tsconfigPaths(), !process.env.VITEST && mdx({
    remarkPlugins: [remarkGfm, remarkFrontmatter],
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
  })],
  test: {
    // Component test configuration with jsdom
    include: ['**/*.component.test.{ts,tsx}'],
    setupFiles: ['./app/test/setup/indexeddb.ts', './app/test/setup/componentTests.ts'],
    environment: 'jsdom',
  },
});
