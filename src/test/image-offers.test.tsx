import { describe, expect, it } from "vitest";
import { campaignOfferFromPublic, filterCampaignOffers } from "@/components/campaign/novemberCampaignData";
import { offerWhatsappUrl } from "@/components/campaign/PlanChoiceDialog";
import { isValidOfferCtaUrl } from "@/lib/imageOffers";

const base = { slug: "punta-cana-ab12c", status: "published" as const, title: "Punta Cana", cover_url: "https://x/img.jpg", image_only: true };

describe("ofertas por imagem", () => {
  it("usa a categoria escolhida no filtro da página", () => {
    const o = campaignOfferFromPublic({ ...base, campaign_category: "praias" }, "fb");
    expect(filterCampaignOffers([o], "praias")).toHaveLength(1);
    expect(filterCampaignOffers([o], "europa")).toHaveLength(0);
  });
  it("sem link não tem compra online; com link guarda o link", () => {
    expect(campaignOfferFromPublic(base, "fb").ctaUrl).toBeUndefined();
    expect(campaignOfferFromPublic({ ...base, cta_url: "https://loja.com/x" }, "fb").ctaUrl).toBe("https://loja.com/x");
  });
  it("mensagem do WhatsApp identifica a oferta pelo nome e código", () => {
    const url = decodeURIComponent(offerWhatsappUrl(campaignOfferFromPublic(base, "fb")));
    expect(url).toContain('"Punta Cana" (código punta-cana-ab12c)');
  });
  it("aceita apenas links https", () => {
    expect(isValidOfferCtaUrl("https://a.com")).toBe(true);
    expect(isValidOfferCtaUrl("http://a.com")).toBe(false);
    expect(isValidOfferCtaUrl("javascript:alert(1)")).toBe(false);
  });
});
