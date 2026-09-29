import { describe, it, expect } from "vitest";
import {
  validateAdsPayload, buildAdsEmail, sha256Hex, ADS_TO, ADS_FROM, timingSafeEqualHex,
} from "../../supabase/functions/_shared/adsBriefingContract";

const png = btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0));
const base = () => ({
  schema: "ads-briefing-email-v1",
  job: { id: "briefing-7-v1", briefing_id: 7, agency_name: "Agência\nX <b>", is_test: false, briefing: { cidade: "SP", contato: "cliente@ex.com" } },
  attachments: [{ filename: "logo.png", content_type: "image/png", content: png }],
});

describe("ads-briefing contract", () => {
  it("aceita payload válido", () => expect(validateAdsPayload(base()).ok).toBe(true));
  it("rejeita chaves extras e schema errado", () => {
    expect(validateAdsPayload({ ...base(), extra: 1 }).ok).toBe(false);
    expect(validateAdsPayload({ ...base(), schema: "x" }).ok).toBe(false);
  });
  it("valida id e coerência is_test", () => {
    const a = base(); a.job.id = "briefing-8-v1"; expect(validateAdsPayload(a).ok).toBe(false);
    const b = base(); b.job.is_test = true; expect(validateAdsPayload(b).ok).toBe(false);
    const c = base(); c.job.id = "ads-email-test-v1"; c.job.is_test = true; expect(validateAdsPayload(c).ok).toBe(true);
    const d = base(); d.job.id = "../x"; expect(validateAdsPayload(d).ok).toBe(false);
  });
  it("rejeita campos de autenticação no briefing", () => {
    const a = base(); (a.job.briefing as any).edit_token_hash = "x"; expect(validateAdsPayload(a).ok).toBe(false);
    const b = base(); (b.job.briefing as any).n = { password: "x" }; expect(validateAdsPayload(b).ok).toBe(false);
  });
  it("valida anexos", () => {
    const a = base(); a.attachments[0].filename = "../a.png"; expect(validateAdsPayload(a).ok).toBe(false);
    const b = base(); b.attachments[0].content_type = "text/html"; expect(validateAdsPayload(b).ok).toBe(false);
    const c = base(); c.attachments[0].content = btoa("GIF89a"); expect(validateAdsPayload(c).ok).toBe(false);
    const d = base(); d.attachments[0].filename = "briefing.json"; expect(validateAdsPayload(d).ok).toBe(false);
    const e = base(); e.attachments = [0, 1, 2, 3].map((i) => ({ ...e.attachments[0], filename: `l${i}.png` })); expect(validateAdsPayload(e).ok).toBe(false);
    const f = base(); f.attachments = [{ filename: "l.svg", content_type: "image/svg+xml", content: btoa("<svg><script>1</script></svg>") }]; expect(validateAdsPayload(f).ok).toBe(false);
  });
  it("limita briefing a 200KB", () => {
    const a = base(); (a.job.briefing as any).big = "x".repeat(210 * 1024); expect(validateAdsPayload(a).ok).toBe(false);
  });
  it("e-mail com remetente/destinatário fixos, JSON exato e assunto sanitizado", async () => {
    const v = validateAdsPayload(base()); if (!v.ok) throw new Error();
    const h = await sha256Hex(v.jobJsonText);
    const m = buildAdsEmail(v.payload, v.jobJsonText, h);
    expect(m.from).toBe(ADS_FROM); expect(m.to).toEqual([ADS_TO]);
    expect(Object.keys(m)).not.toContain("cc"); expect(Object.keys(m)).not.toContain("reply_to");
    expect(m.subject).toBe("[Briefing ADS] briefing-7-v1 | Agência X b");
    expect(m.subject).not.toContain("cliente@ex.com");
    expect(m.text).toContain(`ADS_JOB_JSON_BEGIN\n${v.jobJsonText}\nADS_JOB_JSON_END`);
    expect(m.text).toContain(h);
    expect(m.attachments[0].filename).toBe("briefing.json");
    expect(new TextDecoder().decode(Uint8Array.from(atob(m.attachments[0].content), (c) => c.charCodeAt(0)))).toBe(v.jobJsonText);
  });
  it("assunto de teste e comparação de hash", () => {
    const c = base(); c.job.id = "ads-email-test-v1"; c.job.is_test = true;
    const v = validateAdsPayload(c); if (!v.ok) throw new Error();
    expect(buildAdsEmail(v.payload, v.jobJsonText, "h").subject.startsWith("[Briefing ADS] ads-email-test-v1 [TESTE] | ")).toBe(true);
    expect(timingSafeEqualHex("ab", "ab")).toBe(true); expect(timingSafeEqualHex("ab", "ac")).toBe(false);
  });
});
