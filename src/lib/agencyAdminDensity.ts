/**
 * Densidade responsiva do painel white label.
 *
 * O menu lateral e a barra de abas deixam de usar uma única configuração fixa
 * de alturas/espaçamentos: as dimensões REAIS dos componentes (altura de linha,
 * padding, tamanho de fonte e de ícone) mudam conforme a ALTURA e a LARGURA
 * disponíveis da viewport. Nada de `transform: scale()`.
 *
 * Somente apresentação: nenhuma rota, permissão ou regra de negócio depende
 * deste módulo.
 */
import { useEffect, useState } from "react";

export type Density = "comfortable" | "medium" | "dense";

/** Altura da viewport → modo de densidade do menu. */
export function densityForHeight(height: number): Density {
  if (height < 720) return "dense";
  if (height < 900) return "medium";
  return "comfortable";
}

/** Largura da viewport → modo de densidade da barra de abas. */
export function densityForWidth(width: number): Density {
  if (width < 1024) return "dense";
  if (width < 1440) return "medium";
  return "comfortable";
}

function readViewport() {
  if (typeof window === "undefined") return { width: 1440, height: 900 };
  return { width: window.innerWidth, height: window.innerHeight };
}

/** Observa a viewport (resize + zoom do navegador, que altera innerWidth/Height). */
export function useViewport() {
  const [vp, setVp] = useState(readViewport);
  useEffect(() => {
    const onResize = () => setVp(readViewport());
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    onResize();
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);
  return vp;
}

export interface SidebarDensityTokens {
  mode: Density;
  /** Cabeçalho da agência. */
  header: string;
  logo: string;
  logoCollapsed: string;
  agencyText: string;
  /** Botão "Criar novo". */
  createBtn: string;
  /** Linhas de navegação. */
  row: string;
  rowText: string;
  icon: string;
  navPadding: string;
  gap: string;
  sectionLabel: string;
  footer: string;
  avatar: string;
  /** Em telas baixas o texto secundário ("Administrador") é ocultado. */
  showRole: boolean;
}

/** Tokens reais (px) por modo de densidade — ver especificação do painel. */
export function sidebarDensity(mode: Density): SidebarDensityTokens {
  if (mode === "dense") {
    return {
      mode,
      header: "h-[52px]",
      logo: "h-7 max-w-[92px]",
      logoCollapsed: "h-7 w-7",
      agencyText: "text-[13px]",
      createBtn: "h-9",
      row: "h-8",
      rowText: "text-[12px]",
      icon: "h-4 w-4",
      navPadding: "py-1.5",
      gap: "space-y-0.5",
      sectionLabel: "px-3 pb-0.5 pt-2 text-[10px]",
      footer: "py-1.5",
      avatar: "h-7 w-7",
      showRole: false,
    };
  }
  if (mode === "medium") {
    return {
      mode,
      header: "h-[58px]",
      logo: "h-8 max-w-[98px]",
      logoCollapsed: "h-8 w-8",
      agencyText: "text-[14px]",
      createBtn: "h-[37px]",
      row: "h-[33px]",
      rowText: "text-[13px]",
      icon: "h-[17px] w-[17px]",
      navPadding: "py-2",
      gap: "space-y-0.5",
      sectionLabel: "px-3 pb-1 pt-2.5 text-[10px]",
      footer: "py-2",
      avatar: "h-8 w-8",
      showRole: true,
    };
  }
  return {
    mode,
    header: "h-[70px]",
    logo: "h-9 max-w-[104px]",
    logoCollapsed: "h-9 w-9",
    agencyText: "text-[15px]",
    createBtn: "h-[43px]",
    row: "h-[39px]",
    rowText: "text-sm",
    icon: "h-[18px] w-[18px]",
    navPadding: "py-3",
    gap: "space-y-1",
    sectionLabel: "px-3 pb-1 pt-4 text-[11px]",
    footer: "py-3",
    avatar: "h-9 w-9",
    showRole: true,
  };
}

export interface TabDensityTokens {
  mode: Density;
  bar: string;
  tabText: string;
  tabPadding: string;
  /** Largura mínima real de uma aba legível (usada para decidir quantas cabem). */
  minTabWidth: number;
  maxTabWidth: number;
}

export function tabDensity(mode: Density): TabDensityTokens {
  if (mode === "dense") {
    return {
      mode,
      bar: "h-[33px]",
      tabText: "text-[12px]",
      tabPadding: "px-2",
      minTabWidth: 84,
      maxTabWidth: 160,
    };
  }
  if (mode === "medium") {
    return {
      mode,
      bar: "h-[35px]",
      tabText: "text-[13px]",
      tabPadding: "px-2.5",
      minTabWidth: 100,
      maxTabWidth: 190,
    };
  }
  return {
    mode,
    bar: "h-[39px]",
    tabText: "text-[13.5px]",
    tabPadding: "px-3",
    minTabWidth: 116,
    maxTabWidth: 220,
  };
}
