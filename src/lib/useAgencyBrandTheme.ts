import { useEffect, useMemo } from "react";
import { brandThemeVars, type AgencyBrandInput } from "@/lib/brandTheme";

/**
 * Aplica o tema da agência na RAIZ do documento (`document.documentElement`)
 * e também no `body`.
 *
 * Motivo de aplicar na raiz e não apenas no container: dialogs, popovers,
 * selects, tooltips e calendários são renderizados em Portal (fora da árvore
 * da página) e, se o tema ficasse escopado no container, cairiam no azul
 * padrão da plataforma.
 *
 * O tema é removido no unmount, de modo que o app principal (plataforma)
 * volta imediatamente ao seu próprio design system — o isolamento por agência
 * e por hostname é preservado.
 */
export function useAgencyBrandTheme(input: AgencyBrandInput | null | undefined): void {
  const vars = useMemo(
    () => (input ? brandThemeVars(input) : null),
    // Serializa para evitar reaplicação a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      input?.primary,
      input?.secondary,
      input?.secondaryAuto,
      input?.tertiary,
      input?.tertiaryAuto,
    ],
  );

  useEffect(() => {
    if (typeof document === "undefined" || !vars) return;
    const targets = [document.documentElement, document.body].filter(Boolean) as HTMLElement[];
    const previous = targets.map((el) =>
      Object.keys(vars).map((k) => [k, el.style.getPropertyValue(k)] as const),
    );
    targets.forEach((el) => {
      Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
    });
    return () => {
      targets.forEach((el, i) => {
        previous[i].forEach(([k, v]) => {
          if (v) el.style.setProperty(k, v);
          else el.style.removeProperty(k);
        });
      });
    };
  }, [vars]);
}
