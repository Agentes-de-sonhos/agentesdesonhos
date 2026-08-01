import { describe, it, expect } from "vitest";
import {
  isSelectableRating,
  allowsComment,
  ratingLabel,
  formatAverage,
  formatRatingSummary,
  reviewTargetKey,
  sanitizeReviewComment,
  normalizeReviewPayload,
  REVIEW_COMMENT_MAX_LENGTH,
} from "@/lib/communityReviews";

describe("escala pública 3 a 5 estrelas", () => {
  it("bloqueia notas 1 e 2", () => {
    expect(isSelectableRating(1)).toBe(false);
    expect(isSelectableRating(2)).toBe(false);
  });

  it("aceita 3, 4 e 5", () => {
    [3, 4, 5].forEach((r) => expect(isSelectableRating(r)).toBe(true));
  });

  it("rejeita valores fora da escala ou não inteiros", () => {
    expect(isSelectableRating(0)).toBe(false);
    expect(isSelectableRating(6)).toBe(false);
    expect(isSelectableRating(4.5)).toBe(false);
  });

  it("aplica rótulos semânticos", () => {
    expect(ratingLabel(3)).toBe("Bom");
    expect(ratingLabel(4)).toBe("Muito bom");
    expect(ratingLabel(5)).toBe("Excelente");
    expect(ratingLabel(2)).toBe("");
  });
});

describe("regras de comentário", () => {
  it("nota 3 nunca permite comentário", () => {
    expect(allowsComment(3)).toBe(false);
    expect(normalizeReviewPayload(3, "elogio").comment).toBeNull();
  });

  it("notas 4 e 5 permitem comentário opcional", () => {
    expect(allowsComment(4)).toBe(true);
    expect(allowsComment(5)).toBe(true);
    expect(normalizeReviewPayload(5, "Atendimento excelente").comment).toBe("Atendimento excelente");
    expect(normalizeReviewPayload(4, "   ").comment).toBeNull();
  });

  it("editar de 4/5 para 3 limpa o comentário", () => {
    const antes = normalizeReviewPayload(5, "Ótimo suporte");
    const depois = normalizeReviewPayload(3, antes.comment);
    expect(depois).toEqual({ rating: 3, comment: null });
  });

  it("sanitiza HTML e respeita o limite de caracteres", () => {
    expect(sanitizeReviewComment("<b>ótimo</b>")).toBe("ótimo");
    expect(sanitizeReviewComment("<script>alert(1)</script>")).toBe("alert(1)");
    const longo = "a".repeat(REVIEW_COMMENT_MAX_LENGTH + 50);
    expect(sanitizeReviewComment(longo)?.length).toBe(REVIEW_COMMENT_MAX_LENGTH);
  });
});

describe("agregados", () => {
  it("formata média com uma casa decimal em pt-BR", () => {
    expect(formatAverage(4.75)).toBe("4,8");
    expect(formatAverage(null)).toBeNull();
  });

  it("resume nota e quantidade nos cards", () => {
    expect(formatRatingSummary(4.8, 23)).toBe("4,8 (23)");
    expect(formatRatingSummary(4.8, 0)).toBeNull();
    expect(formatRatingSummary(null, 5)).toBeNull();
  });

  it("gera chave polimórfica por source", () => {
    expect(reviewTargetKey("operator", "abc")).toBe("operator:abc");
    expect(reviewTargetKey("cruise", "abc")).not.toBe(reviewTargetKey("guide", "abc"));
  });
});