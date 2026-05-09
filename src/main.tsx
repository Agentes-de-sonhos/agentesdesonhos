import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Habilita instalação como app (manifest + meta tags) APENAS nos domínios
// públicos da carteira digital do cliente. No app dos agentes
// (app.agentesdesonhos.com.br) e demais domínios, a instalação fica desativada.
(() => {
  if (typeof window === "undefined") return;
  const host = window.location.hostname.toLowerCase();
  const isWalletPublicHost =
    host === "carteiradigital.tur.br" ||
    host === "www.carteiradigital.tur.br";

  if (!isWalletPublicHost) return;

  const head = document.head;

  const manifest = document.createElement("link");
  manifest.rel = "manifest";
  manifest.href = "/manifest.json";
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
})();

createRoot(document.getElementById("root")!).render(<App />);
