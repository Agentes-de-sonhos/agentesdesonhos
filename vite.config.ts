import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// Manual release key used by the "new version available" modal.
// IMPORTANT: intentionally NOT generated per build. Routine deploys keep the
// same key, so no user ever sees the update prompt. Bump it (e.g.
// "2026.10.01-v1") only when we deliberately want everyone to refresh.
const BUILD_ID = "2026.10.03-v1";

function appVersionPlugin() {
  return {
    name: "app-version-json",
    apply: "build" as const,
    generateBundle() {
      // Emits /version.json alongside the built assets.
      (this as unknown as {
        emitFile: (opts: { type: "asset"; fileName: string; source: string }) => void;
      }).emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: BUILD_ID, builtAt: new Date().toISOString() }),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mcpPlugin(),
    appVersionPlugin(),
  ].filter(Boolean),
  define: {
    __APP_VERSION__: JSON.stringify(mode === "development" ? "dev" : BUILD_ID),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: [
      "@tanstack/react-query",
      "@radix-ui/react-tabs",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-avatar",
      "@radix-ui/react-label",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-switch",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-toast",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-slot",
      "@radix-ui/react-aspect-ratio",
    ],
  },
}));
