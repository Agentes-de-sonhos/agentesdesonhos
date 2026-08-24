import { useEffect } from "react";
import { siteThemeRootClass } from "@/lib/agencySiteTheme";

/**
 * Herança de tema para conteúdo renderizado em PORTAL (Dialog, Popover, Select,
 * Tooltip, Calendar…). Componentes Radix montam em `document.body`, fora da raiz
 * `.wl-editorial .wl-luxury`, então perdiam os tokens do tenant e caíam no tema
 * do template. Em vez de espalhar overrides, aplicamos a MESMA classe de tema no
 * `document.body` enquanto o site white label está montado — assim qualquer
 * portal atual ou futuro herda os tokens corretos.
 */
export function useAgencySiteThemeOnBody(hostname?: string | null): void {
  const themeClass = siteThemeRootClass(hostname);

  useEffect(() => {
    if (typeof document === "undefined" || !themeClass) return;
    const classes = themeClass.split(" ").filter(Boolean);
    const added = classes.filter((c) => !document.body.classList.contains(c));
    document.body.classList.add(...added);
    return () => {
      if (added.length) document.body.classList.remove(...added);
    };
  }, [themeClass]);
}

/**
 * Classe de tema aplicada diretamente no conteúdo do portal (defensiva, para o
 * caso do portal ser montado fora do `body` ou antes do efeito acima rodar).
 */
export function portalThemeClass(hostname?: string | null): string {
  if (hostname) return siteThemeRootClass(hostname);
  if (typeof window === "undefined") return "";
  return siteThemeRootClass(window.location.hostname);
}
