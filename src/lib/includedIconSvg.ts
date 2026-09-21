/**
 * Renderiza um ícone da allowlist como SVG inline, para uso no HTML do PDF.
 * Assim o PDF mostra exatamente o mesmo pictograma da web, sem depender de
 * fontes de emoji instaladas no sistema.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { includedIconComponent } from "@/lib/includedIcons";

export function includedIconSvgMarkup(id: unknown, size = 14, color = "currentColor"): string {
  try {
    const Icon = includedIconComponent(id);
    return renderToStaticMarkup(
      createElement(Icon, { width: size, height: size, color, strokeWidth: 2, "aria-hidden": true }),
    );
  } catch {
    return "";
  }
}
