import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { canonicalAgencySiteRedirectUrl } from "@/lib/agencySlugRouting";

// React can crash with DOM NotFoundError when browser translation tools mutate
// text nodes that React later tries to remove. The platform is already PT-BR,
// so opt the SPA root out of automatic translation before React mounts.
(() => {
  if (typeof document === "undefined") return;

  document.documentElement.lang = "pt-BR";
  document.documentElement.setAttribute("translate", "no");
  document.documentElement.classList.add("notranslate");
  document.body?.setAttribute("translate", "no");
  document.body?.classList.add("notranslate");

  const root = document.getElementById("root");
  root?.setAttribute("translate", "no");
  root?.classList.add("notranslate");
})();

// =============================================================================
// Host canônico dos Sites ADS
// =============================================================================
// `vitrine.tur.br` é o endereço canônico. `www.vitrine.tur.br` continua
// funcionando e é redirecionado para a MESMA URL sem `www` antes do React
// montar. O destino não satisfaz mais a condição, então não há loop; nenhuma
// outra host é afetada e a sessão da plataforma vive em outro domínio.
// =============================================================================
(() => {
  if (typeof window === "undefined") return;
  const target = canonicalAgencySiteRedirectUrl(window.location);
  if (target) window.location.replace(target);
})();

// =============================================================================
// Instalação / Carteira Digital
// =============================================================================
// Mantém a carteira livre de PWA/WebAPK para evitar bloqueio do Android.
// Sem manifest e sem Service Worker, o "Adicionar à tela inicial" vira atalho
// da página atual, preservando a URL exata da carteira do cliente.
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

  // No domínio da carteira pública (produção): registra o Service Worker
  // para suporte offline. Em qualquer outro contexto (preview/iframe/app),
  // garante que NENHUM Service Worker fique registrado.
  if ("serviceWorker" in navigator) {
    if (isWalletPublicHost && !isInIframe && !isPreviewHost) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .catch(() => {});
      });
    } else {
      navigator.serviceWorker.getRegistrations?.().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => {});
    }
  }

  // Apenas no domínio da carteira digital pública: mantém a rota da carteira.
  if (!isWalletPublicHost || isInIframe || isPreviewHost) return;

  const head = document.head;

  // Para abrir a carteira correta após o launch, gravamos o caminho atual
  // no localStorage e redirecionamos a partir do start_url ("/").
  const path = window.location.pathname || "/";
  const isSpecificWallet = /^\/[^/]+\/[^/]+\/?$/.test(path);
  const cleanPath = path.replace(/\/+$/, "") || "/";

  // Salva a última carteira visitada para abrir após instalar como app.
  if (isSpecificWallet) {
    try {
      localStorage.setItem("wallet:last-path", cleanPath);
    } catch {}
  }

  // Se abriu via PWA (start_url=/?source=pwa) ou via raiz em modo standalone,
  // redireciona para a última carteira salva.
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const url = new URL(window.location.href);
  const launchedFromPwa = url.searchParams.get("source") === "pwa";
  if ((launchedFromPwa || (isStandalone && path === "/"))) {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("wallet:last-path");
    } catch {}
    if (saved && saved !== "/" && saved !== path) {
      window.location.replace(saved);
      return;
    }
  }

  const metas: Array<[string, string, "name" | "property"]> = [
    ["theme-color", "#0f766e", "name"],
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

})();

const root = document.getElementById("root");

const homeBrands: Record<string, { name: string; logo: string; logoBackground?: string }> = {
  "arenatravelgroup.com.br": { name: "Arena Travel Group", logo: "/arena-travel-group/logo.jpeg" },
  "innovati.tur.br": { name: "Innovati Travel", logo: "/innovati-travel/logo.png", logoBackground: "#fff" },
};
const homeBrand = homeBrands[window.location.hostname.replace(/^www\./, "")];

if (root && homeBrand && window.location.pathname === "/") {
  document.title = homeBrand.name;
  createRoot(root).render(
    <main style={{ minHeight: "100svh", display: "grid", placeContent: "center", justifyItems: "center", gap: "1.5rem", padding: "2rem", background: "#000", color: "#fff", textAlign: "center" }}>
      <h1 style={homeBrand.logoBackground ? { backgroundColor: homeBrand.logoBackground, padding: "1rem", borderRadius: "0.75rem" } : undefined}><img src={homeBrand.logo} alt={homeBrand.name} style={{ width: "min(72vw, 340px)", height: "auto" }} /></h1>
      <p>Nosso novo site está chegando.</p>
    </main>
  );
} else if (root) {
  createRoot(root).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
}
