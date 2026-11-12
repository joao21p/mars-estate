import { defineConfig } from "nitro/config";

export default defineConfig({
  routeRules: {
    // Include SSR redirects as well as successful responses in the privacy boundary.
    "/conta": { headers: { "cache-control": "private, no-store" } },
    "/minhas-reservas": { headers: { "cache-control": "private, no-store" } },
    "/_serverFn/**": { headers: { "cache-control": "private, no-store" } },
  },
});
