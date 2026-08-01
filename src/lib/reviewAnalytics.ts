/**
 * Eventos de avaliação. Nunca registra texto de comentário nem dados pessoais —
 * apenas identificadores do fornecedor e a nota.
 */
export type ReviewAnalyticsEvent =
  | "review_modal_opened"
  | "review_submitted"
  | "review_updated"
  | "review_deleted"
  | "low_star_guidance_shown"
  | "review_comment_reported";

export interface ReviewAnalyticsPayload {
  supplier_source?: string;
  supplier_id?: string;
  rating?: number;
  has_comment?: boolean;
  surface?: "card" | "profile";
}

export function trackReviewEvent(event: ReviewAnalyticsEvent, payload: ReviewAnalyticsPayload = {}) {
  const safe: ReviewAnalyticsPayload = {
    supplier_source: payload.supplier_source,
    supplier_id: payload.supplier_id,
    rating: payload.rating,
    has_comment: payload.has_comment,
    surface: payload.surface,
  };

  try {
    const w = window as unknown as {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    if (typeof w.gtag === "function") {
      w.gtag("event", event, safe);
      return;
    }
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event, ...safe });
    }
  } catch {
    // analytics é best-effort — nunca deve quebrar a UI
  }
}