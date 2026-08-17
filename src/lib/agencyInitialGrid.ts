/**
 * GRADE DO BLOCO INICIAL dos oito serviços dos sites white label.
 *
 * Uma única configuração compartilhada por qualquer white label (Sem Limites,
 * Paraíso e futuros): cada serviço declara o template de colunas do desktop
 * (>= 1024px) de forma determinística, garantindo que TODOS os campos visíveis
 * mais o CTA fiquem em UMA ÚNICA LINHA, sem overflow horizontal.
 *
 * Convenção de larguras:
 *  - numéricos (adultos, crianças, dias, noites): colunas compactas fixas;
 *  - tipo de viagem/transfer/modalidade: largura moderada;
 *  - origem/destino/local: largura média;
 *  - período/calendário: mais largura;
 *  - CTA: largura mínima confortável (última coluna).
 *
 * Todas as colunas usam `minmax(0, ...)` para impedir que inputs e
 * autocompletes estourem a largura do card.
 */

/** Colunas na ORDEM em que `ServiceInitialFields` renderiza + CTA no fim. */
export const INITIAL_GRID_TEMPLATES: Record<string, string> = {
  // tipo_viagem | origem | destino | período | adultos | crianças | CTA
  aereo:
    "lg:grid-cols-[minmax(0,9rem)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,4.5rem)_minmax(0,4.5rem)_minmax(0,7.5rem)]",
  // destino | período | adultos | crianças | CTA
  hospedagem:
    "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,4.5rem)_minmax(0,4.5rem)_minmax(0,7.5rem)]",
  // local de retirada | período | adultos | crianças | CTA
  carro:
    "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,4.5rem)_minmax(0,4.5rem)_minmax(0,7.5rem)]",
  // destino | tipo de transfer | período | adultos | crianças | CTA
  transfer:
    "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,9rem)_minmax(0,1.4fr)_minmax(0,4.5rem)_minmax(0,4.5rem)_minmax(0,7.5rem)]",
  // destino | atração | data | dias | adultos | crianças | CTA
  ingressos:
    "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,5rem)_minmax(0,4.5rem)_minmax(0,4.5rem)_minmax(0,7.5rem)]",
  // destino | período | adultos | crianças | tipo de viagem | CTA
  seguro:
    "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,4.5rem)_minmax(0,4.5rem)_minmax(0,9rem)_minmax(0,7.5rem)]",
  // região | data inicial | noites | adultos | crianças | porto | CTA
  cruzeiros:
    "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,5rem)_minmax(0,4.5rem)_minmax(0,4.5rem)_minmax(0,1.15fr)_minmax(0,7.5rem)]",
  // origem | destinos | data inicial | duração | adultos | crianças | CTA
  pacotes:
    "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.25fr)_minmax(0,5rem)_minmax(0,4.5rem)_minmax(0,4.5rem)_minmax(0,7.5rem)]",
};

/** Fallback compartilhado quando o serviço não declara template próprio. */
export const INITIAL_GRID_FALLBACK = "lg:grid-cols-[repeat(auto-fit,minmax(0,minmax(9rem,1fr)))]";

/** Classes de grade do bloco inicial: 1 coluna no mobile, 2 no tablet, template no desktop. */
export function initialGridClass(serviceKey: string): string {
  return `grid-cols-1 md:grid-cols-2 ${INITIAL_GRID_TEMPLATES[serviceKey] ?? INITIAL_GRID_FALLBACK}`;
}
