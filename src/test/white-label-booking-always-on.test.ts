import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("White Label — solicitação de reserva sempre ativa", () => {
  const settings = read("src/components/quote/QuoteBookingRequestSettings.tsx");

  it("não expõe mais um toggle por orçamento", () => {
    expect(settings).not.toContain("@/components/ui/switch");
    expect(settings).not.toContain("booking_requests_enabled:");
    expect(settings).toContain("Sempre ativa");
  });

  it("mantém o gate de elegibilidade resolvido no servidor", () => {
    expect(settings).toContain("useBookingRequestCapability");
    expect(settings).toContain("if (loadingCapability || !allowed) return null;");
  });
});

describe("Admin — área White Label substitui o Pacote VIP", () => {
  const admin = read("src/components/admin/AdminUserManager.tsx");
  const dialog = read("src/components/admin/WhiteLabelAdminDialog.tsx");

  it("remove o diálogo de entitlements inertes", () => {
    expect(admin).not.toContain("AgencyEntitlementsDialog");
    expect(admin).toContain("WhiteLabelAdminDialog");
    expect(admin).toContain("White Label da agência");
  });

  it("usa apenas RPCs administrativas dedicadas", () => {
    for (const fn of [
      "admin_whitelabel_status",
      "admin_whitelabel_set_subscription",
      "admin_whitelabel_upsert_domain",
      "admin_whitelabel_set_primary_domain",
      "admin_whitelabel_set_domain_active",
    ]) {
      expect(dialog).toContain(fn);
    }
    expect(dialog).not.toContain("agency_entitlements");
  });
});
