import { translateQuote } from "@/i18n/publicMaterials/quote";
import { formatPublicShortDate } from "@/i18n/publicMaterials/locale";

export type HotelRefundPolicy = "" | "refundable" | "non_refundable";

/** Texto exibido ao cliente para a política de cancelamento do hotel. */
export function hotelRefundLabel(data: any, locale?: string): string | null {
  const t = translateQuote(locale);
  const policy = data?.refund_policy as HotelRefundPolicy | undefined;
  if (policy === "non_refundable") return t("nonRefundableRate");
  if (policy === "refundable") {
    const until = typeof data?.free_cancellation_until === "string" ? data.free_cancellation_until : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(until)) {
      const [y, m, d] = until.split("-");
      return t("freeCancellationUntil", { date: formatPublicShortDate(until, locale) });
    }
    return t("freeCancellation");
  }
  return null;
}
