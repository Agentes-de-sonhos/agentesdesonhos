import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// =============================================================================
// PWA / Carteira Digital offline
// =============================================================================
// Habilita instalação como app + cache offline APENAS no domínio público da
// carteira digital do cliente final. Em todos os outros contextos (app dos
// agentes, preview do editor, iframe, lovableproject.com) o Service Worker
// e o manifest NÃO são ativados — evitando cache "preso" no editor.
// =============================================================================
(() => {
  if (typeof window === "undefined") return;

  const host = window.location.hostname.toLowerCase();

  const isWalletPublicHost =
    host === "carteiradigital.tur.br" || host === "www.carteiradigital.tur.br";

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovableproject-dev.com") ||
    host.includes("lovable.app");

  // Limpa qualquer SW residual em contextos onde ele NÃO deveria existir.
  if (!isWalletPublicHost || isInIframe || isPreviewHost) {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations?.().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => {});
    }
  }

  // Apenas no domínio da carteira digital pública: injeta manifest + meta tags
  // de instalação e registra o Service Worker (gerado pelo vite-plugin-pwa).
  if (!isWalletPublicHost || isInIframe || isPreviewHost) return;

  const head = document.head;

  const manifest = document.createElement("link");
  manifest.rel = "manifest";
  manifest.href = "/manifest.webmanifest";
  head.appendChild(manifest);

  const metas: Array<[string, string, "name" | "property"]> = [
    ["theme-color", "#0f766e", "name"],
    ["mobile-web-app-capable", "yes", "name"],
    ["apple-mobile-web-app-capable", "yes", "name"],
    ["apple-mobile-web-app-status-bar-style", "default", "name"],
    ["apple-mobile-web-app-title", "Carteira Digital", "name"],
  ];
  metas.forEach(([key, content, attr]) => {
    const m = document.createElement("meta");
    m.setAttribute(attr, key);
    m.content = content;
    head.appendChild(m);
  });

  // Registro do Service Worker em produção (gerado pelo vite-plugin-pwa).
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    });
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
