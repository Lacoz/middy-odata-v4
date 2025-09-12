import { defineConfig } from "vitest/config";
export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        include: ["__tests__/**/*.spec.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
        },
    },
});
