export type FaqDestination = { kind: "whatsapp" | "email"; address: string };

function brWhatsApp(value?: string | null): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (/^55[1-9]\d{9,10}$/.test(digits)) return digits;
  if (/^[1-9]\d{9,10}$/.test(digits)) return `55${digits}`;
  return null;
}

/** Only resolves a direct, public business contact; never uses a group invite. */
export function resolveFaqDestination({ phone, contactUrl, email, whatsappHidden }: {
  phone?: string | null;
  contactUrl?: string | null;
  email?: string | null;
  whatsappHidden?: boolean;
}): FaqDestination | undefined {
  if (!whatsappHidden) {
    let direct: string | null = null;
    try {
      const url = contactUrl ? new URL(contactUrl) : null;
      if (url?.protocol === "https:" && url.hostname === "wa.me") {
        const candidate = url.pathname.slice(1).replace(/\/$/, "");
        if (/^\+?\d+$/.test(candidate)) direct = brWhatsApp(candidate);
      } else if (url?.protocol === "https:" && ["api.whatsapp.com", "web.whatsapp.com"].includes(url.hostname) && url.pathname === "/send") {
        direct = brWhatsApp(url.searchParams.get("phone"));
      }
    } catch { /* Fallback para o telefone público do perfil. */ }
    const address = direct ?? brWhatsApp(phone);
    if (address) return { kind: "whatsapp", address };
  }
  const address = email?.trim();
  if (address && /^[^\s@?,&#]+@[^\s@?,&#]+\.[^\s@?,&#]+$/.test(address)) return { kind: "email", address };
}
