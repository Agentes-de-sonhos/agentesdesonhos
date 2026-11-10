export type HotelRefundPolicy = "" | "refundable" | "non_refundable";

/** Texto exibido ao cliente para a política de cancelamento do hotel. */
export function hotelRefundLabel(data: any): string | null {
  const policy = data?.refund_policy as HotelRefundPolicy | undefined;
  if (policy === "non_refundable") return "Tarifa não reembolsável";
  if (policy === "refundable") {
    const until = typeof data?.free_cancellation_until === "string" ? data.free_cancellation_until : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(until)) {
      const [y, m, d] = until.split("-");
      return `Cancelamento grátis até ${d}/${m}/${y}`;
    }
    return "Cancelamento grátis (reembolsável)";
  }
  return null;
}
