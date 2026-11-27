import { describe, expect, it } from "vitest";
import { resolveFaqDestination } from "@/lib/agencyFaqContact";

describe("Canal de contato do FAQ da agência", () => {
  it("normaliza o telefone oficial e não confunde DDD 55 com código de país", () => {
    expect(resolveFaqDestination({ phone: "(55) 99999-1234" })).toEqual({ kind: "whatsapp", address: "5555999991234" });
    expect(resolveFaqDestination({ phone: "+55 11 99250-6672" })).toEqual({ kind: "whatsapp", address: "5511992506672" });
  });
  it("usa um contato direto publicado, nunca o link de grupo", () => {
    expect(resolveFaqDestination({ contactUrl: "https://api.whatsapp.com/send?phone=5521988559515&utm_medium=social" })).toEqual({ kind: "whatsapp", address: "5521988559515" });
    expect(resolveFaqDestination({ contactUrl: "https://chat.whatsapp.com/GrupoDaAgencia1" })).toBeUndefined();
  });
  it("preserva agências que desativaram o WhatsApp no FAQ e nunca inventa contato", () => {
    expect(resolveFaqDestination({ phone: "(11) 99250-6672", email: "atendimento@example.com", whatsappHidden: true })).toEqual({ kind: "email", address: "atendimento@example.com" });
    expect(resolveFaqDestination({ phone: "1234", email: "test@example.com?cc=x@y.com" })).toBeUndefined();
  });
});
