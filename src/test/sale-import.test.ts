import { describe, it, expect } from "vitest";
import {
  normalizeService, matchServices, detectDivergences, buildDraftFromPair,
  buildImportFingerprint, mapServiceTypeToProduct, normalizeDate,
} from "@/lib/saleImport";

const walletHotel = {
  id: "w1",
  service_type: "hotel",
  service_data: {
    hotel_name: "Hotel Riviera Beach",
    check_in: "2026-03-10",
    check_out: "2026-03-15",
    total_price: 4200,
    supplier_name: "CVC",
    confirmation_code: "ABC123",
  },
};

const quoteHotel = {
  id: "q1",
  service_type: "hotel",
  amount: 4500,
  service_data: {
    hotel_name: "Hotel Riviera Beach",
    check_in: "2026-03-10",
    confirmation_code: "ABC123",
  },
};

const quoteFlight = {
  id: "q2",
  service_type: "flight",
  amount: 3100,
  service_data: { airline: "LATAM", flight_number: "LA8020", departure_date: "09/03/2026" },
};

describe("saleImport – normalization", () => {
  it("maps service types to financial product types", () => {
    expect(mapServiceTypeToProduct("flight")).toBe("aereo");
    expect(mapServiceTypeToProduct("car_rental")).toBe("locacao");
    expect(mapServiceTypeToProduct("train")).toBe("outro");
  });

  it("normalizes BR and ISO dates without timezone drift", () => {
    expect(normalizeDate("09/03/2026")).toBe("2026-03-09");
    expect(normalizeDate("2026-03-09T12:00:00Z")).toBe("2026-03-09");
    expect(normalizeDate(null)).toBeNull();
  });

  it("reads price from amount for quotes and from service_data for wallets", () => {
    expect(normalizeService(walletHotel, "wallet").price).toBe(4200);
    expect(normalizeService(quoteHotel, "quote").price).toBe(4500);
  });
});

describe("saleImport – matching and divergences", () => {
  const w = [normalizeService(walletHotel, "wallet")];
  const q = [normalizeService(quoteHotel, "quote"), normalizeService(quoteFlight, "quote")];
  const pairs = matchServices(w, q);

  it("matches the same service across sources and keeps the extra one apart", () => {
    expect(pairs.filter((p) => p.kind === "both")).toHaveLength(1);
    expect(pairs.filter((p) => p.kind === "quote_only")).toHaveLength(1);
    expect(pairs.filter((p) => p.kind === "wallet_only")).toHaveLength(0);
  });

  it("flags price divergence and services present in a single source", () => {
    const d = detectDivergences(pairs);
    expect(d.some((x) => x.field === "price")).toBe(true);
    expect(d.some((x) => x.field === "missing")).toBe(true);
  });
});

describe("saleImport – precedence", () => {
  const pair = matchServices(
    [normalizeService(walletHotel, "wallet")],
    [normalizeService(quoteHotel, "quote")],
  )[0];

  it("takes commercial value from the quote and detail from the wallet", () => {
    const draft = buildDraftFromPair(pair);
    expect(draft.sale_price).toBe(4500);
    expect(draft.supplier_name).toBe("CVC");
    expect(draft.product_type).toBe("hotel");
    expect(draft.source_provenance).toMatchObject({ details_from: "wallet", values_from: "quote" });
  });

  it("honors an inverted precedence", () => {
    const draft = buildDraftFromPair(pair, { details: "quote", values: "wallet" });
    expect(draft.sale_price).toBe(4200);
  });

  it("falls back to the available source when one side is missing", () => {
    const only = matchServices([], [normalizeService(quoteFlight, "quote")])[0];
    const draft = buildDraftFromPair(only);
    expect(draft.sale_price).toBe(3100);
    expect(draft.product_type).toBe("aereo");
  });
});

describe("saleImport – fingerprint", () => {
  it("is deterministic for the same bundle", () => {
    const a = buildImportFingerprint({ opportunityId: "o1", tripId: "t1", quoteId: "q1" });
    const b = buildImportFingerprint({ opportunityId: "o1", tripId: "t1", quoteId: "q1", operationId: null });
    expect(a).toBe(b);
    expect(a).not.toBe(buildImportFingerprint({ opportunityId: "o1", tripId: "t2", quoteId: "q1" }));
  });
});