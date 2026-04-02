import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { BusinessCard, SocialLinks } from "@/hooks/useBusinessCard";

const PUBLIC_DOMAIN = "https://contato.tur.br";

function formatWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

/**
 * Build the same HTML structure as CartaoPublico.tsx,
 * render it off-screen, capture with html2canvas, then
 * produce a PDF with clickable link overlays.
 */
export async function generateBusinessCardPdf(card: BusinessCard): Promise<void> {
  const primaryColor = card.primary_color || "#0284c7";
  const secondaryColor = card.secondary_color || "#f97316";
  const publicUrl = `${PUBLIC_DOMAIN}/${card.slug}`;
  const activeSocials = Object.entries(card.social_links || {}).filter(([, v]) => !!v) as [keyof SocialLinks, string][];
  const activeButtons = card.buttons.filter((b) => b.text);

  const SOCIAL_ICONS: Record<string, string> = {
    instagram: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
    facebook: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
    linkedin: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>`,
    twitter: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>`,
    youtube: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>`,
    tiktok: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>`,
  };

  const CONTACT_ICONS: Record<string, string> = {
    whatsapp: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>`,
    phone: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    email: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    globe: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  };

  // --- Build HTML identical to CartaoPublico.tsx ---
  const coverStyle = card.cover_url
    ? `background: url(${card.cover_url}) center/cover no-repeat;`
    : `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});`;

  const photoHtml = card.photo_url
    ? `<img src="${card.photo_url}" alt="${card.name}" crossorigin="anonymous" style="height:112px;width:112px;border-radius:9999px;border:4px solid white;object-fit:cover;box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1);" />`
    : `<div style="height:112px;width:112px;border-radius:9999px;border:4px solid white;box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1);display:flex;align-items:center;justify-content:center;color:white;font-size:30px;font-weight:700;background-color:${primaryColor};">${card.name?.charAt(0)?.toUpperCase() || "?"}</div>`;

  // Quick contacts
  const contactItems: string[] = [];
  if (card.whatsapp) {
    contactItems.push(`<a href="https://wa.me/${formatWhatsapp(card.whatsapp)}" data-link="whatsapp" style="display:flex;align-items:center;justify-content:center;height:48px;width:48px;border-radius:9999px;color:white;background-color:#25D366;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);">${CONTACT_ICONS.whatsapp}</a>`);
  }
  if (card.phone) {
    contactItems.push(`<a href="tel:${card.phone}" data-link="phone" style="display:flex;align-items:center;justify-content:center;height:48px;width:48px;border-radius:9999px;color:white;background-color:${primaryColor};box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);">${CONTACT_ICONS.phone}</a>`);
  }
  if (card.email) {
    contactItems.push(`<a href="mailto:${card.email}" data-link="email" style="display:flex;align-items:center;justify-content:center;height:48px;width:48px;border-radius:9999px;color:white;background-color:${primaryColor};box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);">${CONTACT_ICONS.email}</a>`);
  }
  if (card.website) {
    const siteUrl = card.website.startsWith("http") ? card.website : `https://${card.website}`;
    contactItems.push(`<a href="${siteUrl}" data-link="website" style="display:flex;align-items:center;justify-content:center;height:48px;width:48px;border-radius:9999px;color:white;background-color:${primaryColor};box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);">${CONTACT_ICONS.globe}</a>`);
  }

  // Action buttons
  const buttonsHtml = activeButtons.map((btn) => {
    const btnUrl = btn.url.startsWith("http") ? btn.url : `https://${btn.url}`;
    return `<a href="${btnUrl}" data-link="button" style="display:block;width:100%;padding:12px 16px;border-radius:12px;font-weight:500;border:2px solid ${primaryColor};color:${primaryColor};text-align:center;text-decoration:none;box-sizing:border-box;">
      <span style="display:inline-flex;align-items:center;gap:8px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
        ${btn.text}
      </span>
    </a>`;
  }).join("");

  // Social links
  const socialsHtml = activeSocials.map(([key, url]) => {
    const socialUrl = url.startsWith("http") ? url : `https://${url}`;
    return `<a href="${socialUrl}" data-link="social" style="display:flex;align-items:center;justify-content:center;height:44px;width:44px;border-radius:9999px;color:white;background-color:${primaryColor};box-shadow:0 1px 2px 0 rgb(0 0 0 / 0.05);">${SOCIAL_ICONS[key] || ""}</a>`;
  }).join("");

  // Logos
  const logosHtml = card.logos.length > 0
    ? card.logos.map((url) => `<img src="${url}" alt="Logo" crossorigin="anonymous" style="max-height:120px;max-width:210px;object-fit:contain;" />`).join("")
    : "";

  // QR Code - generate via canvas
  let qrDataUrl = "";
  try {
    const { default: QRCode } = await import("qrcode");
    qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 240,
      margin: 1,
      color: { dark: primaryColor, light: "#FFFFFF" },
    });
  } catch { /* skip */ }

  const html = `
    <div id="pdf-card-root" style="width:390px;background:white;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;overflow:hidden;">
      <!-- Cover -->
      <div style="height:160px;position:relative;display:flex;align-items:flex-end;justify-content:center;${coverStyle}">
        <div style="position:absolute;bottom:-56px;left:50%;transform:translateX(-50%);">
          ${photoHtml}
        </div>
      </div>

      <!-- Body -->
      <div style="padding:64px 24px 32px;text-align:center;">
        <!-- Name & title -->
        <div style="margin-bottom:24px;">
          <h1 style="font-size:24px;font-weight:700;color:#111827;margin:0;">${card.name || ""}</h1>
          ${card.title ? `<p style="color:#6b7280;margin:4px 0 0;font-size:16px;">${card.title}</p>` : ""}
          ${card.agency_name ? `<p style="font-size:14px;font-weight:500;margin:4px 0 0;color:${primaryColor};">${card.agency_name}</p>` : ""}
        </div>

        <!-- Quick contacts -->
        ${contactItems.length > 0 ? `<div style="display:flex;justify-content:center;gap:12px;margin-bottom:24px;">${contactItems.join("")}</div>` : ""}

        <!-- Save contact button -->
        <button style="width:100%;padding:12px;border-radius:12px;font-weight:600;color:white;background-color:${primaryColor};border:none;font-size:16px;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);cursor:pointer;margin-bottom:24px;display:flex;align-items:center;justify-content:center;gap:8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          Salvar Contato
        </button>

        <!-- Action buttons -->
        ${activeButtons.length > 0 ? `<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">${buttonsHtml}</div>` : ""}

        <!-- Social links -->
        ${activeSocials.length > 0 ? `
          <div style="margin-bottom:24px;">
            <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Siga-me nas redes</p>
            <div style="display:flex;justify-content:center;gap:12px;">${socialsHtml}</div>
          </div>
        ` : ""}

        <!-- Logo + QR Code -->
        <div style="padding-top:16px;display:flex;align-items:center;justify-content:space-between;gap:16px;">
          <div style="flex:1;display:flex;align-items:center;justify-content:center;">
            ${logosHtml ? `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">${logosHtml}</div>` : "<span></span>"}
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Escaneie para salvar</p>
            <div style="background:white;padding:12px;border-radius:12px;box-shadow:inset 0 2px 4px 0 rgb(0 0 0 / 0.05);border:1px solid #e5e7eb;">
              ${qrDataUrl ? `<img src="${qrDataUrl}" width="120" height="120" style="display:block;" />` : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // --- Render off-screen ---
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  container.innerHTML = html;
  document.body.appendChild(container);

  const root = container.querySelector("#pdf-card-root") as HTMLElement;

  // Wait for all images to load
  const images = root.querySelectorAll("img");
  await Promise.all(
    Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );

  // Small delay for fonts
  await new Promise((r) => setTimeout(r, 300));

  // --- Capture with html2canvas ---
  const canvas = await html2canvas(root, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    width: 390,
    windowWidth: 390,
  });

  // --- Create PDF ---
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pxToMm = 0.264583;
  const pdfW = canvas.width * pxToMm / 2; // /2 because scale:2
  const pdfH = canvas.height * pxToMm / 2;

  const doc = new jsPDF({
    unit: "mm",
    format: [pdfW, pdfH],
    orientation: "portrait",
  });

  doc.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);

  // --- Add clickable link overlays ---
  // We need to map the positions of interactive elements from the HTML to PDF coordinates
  const scaleX = pdfW / 390;
  const scaleY = pdfH / root.scrollHeight;

  const allLinks = root.querySelectorAll("a[data-link], button");
  allLinks.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();

    const x = (rect.left - rootRect.left) * scaleX;
    const y = (rect.top - rootRect.top) * scaleY;
    const w = rect.width * scaleX;
    const h = rect.height * scaleY;

    const href = el.getAttribute("href");
    if (href && href !== "#") {
      doc.link(x, y, w, h, { url: href });
    } else if (el.tagName === "BUTTON") {
      // Save contact button links to public URL
      doc.link(x, y, w, h, { url: publicUrl });
    }
  });

  // Cleanup
  document.body.removeChild(container);

  // Save
  doc.save(`cartao-${card.slug || "virtual"}.pdf`);
}
