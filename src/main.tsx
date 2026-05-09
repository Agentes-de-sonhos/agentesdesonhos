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

  // Monta um manifest DINÂMICO por carteira: o start_url/scope/id apontam
  // para o caminho atual (ex.: /minha-agencia/ABC123), de modo que ao
  // instalar o site como app, o atalho abra exatamente a carteira digital
  // daquele cliente — e não a raiz do domínio.
  const path = window.location.pathname || "/";
  // Considera como "carteira específica" qualquer caminho /:slug/:code.
  const isSpecificWallet = /^\/[^/]+\/[^/]+\/?$/.test(path);
  const startUrl = isSpecificWallet ? path : "/";
  const scope = isSpecificWallet ? path : "/";
  // short_name: usa o código da carteira quando disponível.
  const codeFromPath = isSpecificWallet ? path.split("/").filter(Boolean)[1] : "";
  const shortName = codeFromPath ? `Carteira ${codeFromPath}` : "Carteira";

  const dynamicManifest = {
    name: "Carteira Digital",
    short_name: shortName.slice(0, 30),
    description:
      "Sua carteira digital de viagem — acesse documentos, roteiro e contatos da sua viagem.",
    id: startUrl,
    start_url: startUrl,
    scope,
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
  const manifestBlob = new Blob([JSON.stringify(dynamicManifest)], {
    type: "application/manifest+json",
  });
  const manifestUrl = URL.createObjectURL(manifestBlob);

  const manifest = document.createElement("link");
  manifest.rel = "manifest";
  manifest.href = manifestUrl;
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
