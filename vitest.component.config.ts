import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), !process.env.VITEST && reactRouter(), tsconfigPaths()],
  test: {
    // Component test configuration with jsdom
    include: ['**/*.component.test.{ts,tsx}'],
    setupFiles: ['./app/test/setup/indexeddb.ts', './app/test/setup/componentTests.ts'],
    environment: 'jsdom',
  },
});
