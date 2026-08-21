/**
 * Coordenação entre a barra mobile "Minha Seleção" (orçamento público) e os
 * elementos flutuantes globais (botão de suporte WhatsApp).
 *
 * A barra marca o `document.body` enquanto está montada e publica sua altura
 * real em uma CSS var. Assim o WhatsApp sobe para ACIMA da barra em vez de
 * sobrepor cards/CTA, sem alterar seu comportamento nas outras páginas.
 */
import { useEffect, useState } from "react";

export const BOOKING_SELECTION_BAR_ATTR = "data-booking-selection-bar";
export const BOOKING_SELECTION_BAR_HEIGHT_VAR = "--booking-selection-bar-height";

/** Distância vertical do flutuante em relação ao topo da barra de seleção. */
export const BOOKING_FLOATING_GAP = "0.75rem";

/** `bottom` do flutuante quando a barra está ativa (inclui safe-area). */
export const BOOKING_FLOATING_BOTTOM = `calc(var(${BOOKING_SELECTION_BAR_HEIGHT_VAR}, 5rem) + ${BOOKING_FLOATING_GAP} + env(safe-area-inset-bottom, 0px))`;

/** Marca/desmarca a presença da barra e registra sua altura em px. */
export function setBookingSelectionBarActive(active: boolean, heightPx?: number): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (active) {
    document.body.setAttribute(BOOKING_SELECTION_BAR_ATTR, "true");
    if (typeof heightPx === "number" && heightPx > 0) {
      root.style.setProperty(BOOKING_SELECTION_BAR_HEIGHT_VAR, `${Math.round(heightPx)}px`);
    }
    return;
  }
  document.body.removeAttribute(BOOKING_SELECTION_BAR_ATTR);
  root.style.removeProperty(BOOKING_SELECTION_BAR_HEIGHT_VAR);
}

export function isBookingSelectionBarActive(): boolean {
  if (typeof document === "undefined") return false;
  return document.body.hasAttribute(BOOKING_SELECTION_BAR_ATTR);
}

/** Reage à presença da barra mobile de seleção. */
export function useBookingSelectionBar(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const read = () => setActive(isBookingSelectionBarActive());
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [BOOKING_SELECTION_BAR_ATTR],
    });
    return () => observer.disconnect();
  }, []);

  return active;
}
