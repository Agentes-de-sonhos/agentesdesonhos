import { useEffect, useState } from "react";

const SIDEBAR_PREF_KEY = "wl-admin-sidebar-collapsed";

/**
 * Preferência do usuário (desktop) para menu recolhido. Em larguras muito
 * reduzidas o painel inicia recolhido sem apagar a preferência manual salva
 * para resoluções maiores.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const pref = localStorage.getItem(SIDEBAR_PREF_KEY);
      if (pref === "1") return true;
      if (pref === "0") return false;
      return typeof window !== "undefined" && window.innerWidth < 1280;
    } catch {
      return false;
    }
  });
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched) return;
    try {
      localStorage.setItem(SIDEBAR_PREF_KEY, collapsed ? "1" : "0");
    } catch {
      /* preferência é opcional */
    }
  }, [collapsed, touched]);
  return {
    collapsed,
    toggle: () => {
      setTouched(true);
      setCollapsed((v) => !v);
    },
  };
}
