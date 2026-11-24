/**
 * Opções de hospedagem para o cliente escolher (novo visual, prévia).
 * Fonte: grupo de escolha "alternative" com 2+ hotéis; sem grupo, 2+ hotéis
 * com o mesmo check-in/check-out (mesma estadia) também viram opções.
 */
type Svc = { id: string; service_type: string; amount?: number | null; choice_group_id?: string | null; service_data?: any };

export function findHotelOptions(services: Svc[] | null | undefined, groups: { id: string; group_type: string }[] = []): Svc[] {
  const hotels = (services || []).filter((s) => s.service_type === "hotel");
  if (hotels.length < 2) return [];
  for (const g of groups) {
    if (g.group_type !== "alternative") continue;
    const members = hotels.filter((h) => h.choice_group_id === g.id);
    if (members.length >= 2) return members;
  }
  if (hotels.some((h) => h.choice_group_id)) return [];
  const key = (h: Svc) => `${h.service_data?.check_in || ""}|${h.service_data?.check_out || ""}`;
  const k = key(hotels[0]);
  return k !== "|" && hotels.every((h) => key(h) === k) ? hotels : [];
}

/** Total com apenas o hotel escolhido somado entre as opções. */
export function totalWithHotelChoice(services: Svc[], options: Svc[], selectedId: string | null): number {
  const optionIds = new Set(options.map((o) => o.id));
  return services.reduce((sum, s) => {
    if (optionIds.has(s.id) && s.id !== selectedId) return sum;
    return sum + (Number(s.amount) || 0);
  }, 0);
}

/** Diferença de cada opção em relação à escolhida (positivo = mais caro). */
export function hotelPriceDelta(option: Svc, selected: Svc | undefined): number {
  return (Number(option.amount) || 0) - (Number(selected?.amount) || 0);
}
