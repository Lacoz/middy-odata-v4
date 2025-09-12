import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "middy-odata-v4",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.mjs" : "index.cjs"),
    },
    sourcemap: true,
    target: "es2020",
    rollupOptions: {
      external: ["@middy/core"],
    },
    outDir: "dist",
    emptyOutDir: true,
  },
  plugins: [dts({ insertTypesEntry: true })],
});
