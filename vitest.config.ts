import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Everything under test (crypto, fs, the Web Request) is Node-side — no jsdom
    // needed, which keeps the run fast. Add an environment override later if we
    // start testing React components.
    environment: "node",
  },
});
