import { jsPDF } from "jspdf";
import type { BusinessCard, SocialLinks } from "@/hooks/useBusinessCard";

const PUBLIC_DOMAIN = "https://contato.tur.br";

// Page dimensions in mm (smartphone-like)
const W = 100;
const H = 178;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function formatWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function generateQrDataUrl(text: string, size: number, color: string): Promise<string> {
  // Use a canvas-based QR generation via the qrcode library dynamically
  // Fallback: render a placeholder
  try {
    const { default: QRCode } = await import("qrcode");
    const dataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: { dark: color, light: "#FFFFFF" },
    });
    return dataUrl;
  } catch {
    // Fallback: return empty
    return "";
  }
}

const SOCIAL_LABELS: Record<keyof SocialLinks, string> = {
  instagram: "IG",
  facebook: "FB",
  linkedin: "IN",
  twitter: "X",
  youtube: "YT",
  tiktok: "TK",
};

export async function generateBusinessCardPdf(card: BusinessCard): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: [W, H], orientation: "portrait" });

  const primaryColor = card.primary_color || "#0284c7";
  const secondaryColor = card.secondary_color || "#f97316";
  const [pr, pg, pb] = hexToRgb(primaryColor);
  const [sr, sg, sb] = hexToRgb(secondaryColor);
  const publicUrl = `${PUBLIC_DOMAIN}/${card.slug}`;

  let y = 0;

  // ── Cover / Header gradient ──
  const coverH = 42;
  // Draw gradient approximation with horizontal slices
  for (let i = 0; i < coverH; i++) {
    const t = i / coverH;
    const r = Math.round(pr + (sr - pr) * t);
    const g = Math.round(pg + (sg - pg) * t);
    const b = Math.round(pb + (sb - pb) * t);
    doc.setFillColor(r, g, b);
    doc.rect(0, i, W, 1.2, "F");
  }

  // ── Cover image (if exists) ──
  if (card.cover_url) {
    const coverImg = await loadImageAsBase64(card.cover_url);
    if (coverImg) {
      try {
        doc.addImage(coverImg, "JPEG", 0, 0, W, coverH);
      } catch { /* fallback to gradient */ }
    }
  }

  // ── Photo ──
  const photoSize = 26;
  const photoCx = W / 2;
  const photoCy = coverH - 2;

  // White circle border
  doc.setFillColor(255, 255, 255);
  doc.circle(photoCx, photoCy, photoSize / 2 + 2, "F");

  if (card.photo_url) {
    const photoImg = await loadImageAsBase64(card.photo_url);
    if (photoImg) {
      try {
        // Clip to circle by drawing circular image
        doc.addImage(
          photoImg, "JPEG",
          photoCx - photoSize / 2, photoCy - photoSize / 2,
          photoSize, photoSize
        );
      } catch { /* skip */ }
    }
  } else {
    // Placeholder circle with initial
    doc.setFillColor(pr, pg, pb);
    doc.circle(photoCx, photoCy, photoSize / 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const initial = card.name?.charAt(0)?.toUpperCase() || "?";
    doc.text(initial, photoCx, photoCy + 2, { align: "center" });
  }

  y = photoCy + photoSize / 2 + 6;

  // ── Name ──
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(card.name || "", W / 2, y, { align: "center" });
  y += 5;

  // ── Title ──
  if (card.title) {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(card.title, W / 2, y, { align: "center" });
    y += 4;
  }

  // ── Agency ──
  if (card.agency_name) {
    doc.setTextColor(pr, pg, pb);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(card.agency_name, W / 2, y, { align: "center" });
    y += 6;
  } else {
    y += 2;
  }

  // ── Quick contact circles ──
  const contacts: { label: string; url: string; color: [number, number, number] }[] = [];
  if (card.whatsapp) {
    contacts.push({ label: "WA", url: `https://wa.me/${formatWhatsapp(card.whatsapp)}`, color: [37, 211, 102] });
  }
  if (card.phone) {
    contacts.push({ label: "TEL", url: `tel:${card.phone}`, color: [pr, pg, pb] });
  }
  if (card.email) {
    contacts.push({ label: "@", url: `mailto:${card.email}`, color: [pr, pg, pb] });
  }
  if (card.website) {
    const siteUrl = card.website.startsWith("http") ? card.website : `https://${card.website}`;
    contacts.push({ label: "WEB", url: siteUrl, color: [pr, pg, pb] });
  }

  if (contacts.length > 0) {
    const circleR = 6;
    const gap = 4;
    const totalW = contacts.length * circleR * 2 + (contacts.length - 1) * gap;
    let cx = (W - totalW) / 2 + circleR;

    for (const c of contacts) {
      doc.setFillColor(c.color[0], c.color[1], c.color[2]);
      doc.circle(cx, y + circleR, circleR, "F");

      // Clickable link
      doc.link(cx - circleR, y, circleR * 2, circleR * 2, { url: c.url });

      // Label text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.text(c.label, cx, y + circleR + 1.5, { align: "center" });

      cx += circleR * 2 + gap;
    }
    y += circleR * 2 + 6;
  }

  // ── Save contact button ──
  const btnH = 9;
  const btnW = 70;
  const btnX = (W - btnW) / 2;
  doc.setFillColor(pr, pg, pb);
  doc.roundedRect(btnX, y, btnW, btnH, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Salvar Contato", W / 2, y + btnH / 2 + 1.5, { align: "center" });
  // Link to the public URL (vcard download happens on the web page)
  doc.link(btnX, y, btnW, btnH, { url: publicUrl });
  y += btnH + 5;

  // ── Action buttons ──
  if (card.buttons.length > 0) {
    for (const btn of card.buttons) {
      const abtnH = 8;
      const abtnW = 70;
      const abtnX = (W - abtnW) / 2;

      doc.setDrawColor(pr, pg, pb);
      doc.setLineWidth(0.5);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(abtnX, y, abtnW, abtnH, 3, 3, "FD");

      doc.setTextColor(pr, pg, pb);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const btnLabel = btn.text.length > 30 ? btn.text.substring(0, 30) + "..." : btn.text;
      doc.text(btnLabel, W / 2, y + abtnH / 2 + 1.2, { align: "center" });

      const btnUrl = btn.url.startsWith("http") ? btn.url : `https://${btn.url}`;
      doc.link(abtnX, y, abtnW, abtnH, { url: btnUrl });

      y += abtnH + 3;
    }
    y += 2;
  }

  // ── Social links ──
  const activeSocials = Object.entries(card.social_links || {}).filter(([, v]) => !!v) as [keyof SocialLinks, string][];
  if (activeSocials.length > 0) {
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("SIGA-ME NAS REDES", W / 2, y, { align: "center" });
    y += 4;

    const sCircleR = 5;
    const sGap = 3;
    const sTotalW = activeSocials.length * sCircleR * 2 + (activeSocials.length - 1) * sGap;
    let sx = (W - sTotalW) / 2 + sCircleR;

    for (const [key, url] of activeSocials) {
      doc.setFillColor(pr, pg, pb);
      doc.circle(sx, y + sCircleR, sCircleR, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5);
      doc.setFont("helvetica", "bold");
      doc.text(SOCIAL_LABELS[key] || "?", sx, y + sCircleR + 1.2, { align: "center" });

      const socialUrl = url.startsWith("http") ? url : `https://${url}`;
      doc.link(sx - sCircleR, y, sCircleR * 2, sCircleR * 2, { url: socialUrl });

      sx += sCircleR * 2 + sGap;
    }
    y += sCircleR * 2 + 5;
  }

  // ── Logos + QR Code section ──
  const remainingSpace = H - y - 5;
  const qrSectionY = Math.max(y, H - 45);

  // Logos on the left
  if (card.logos.length > 0) {
    const logoImg = await loadImageAsBase64(card.logos[0]);
    if (logoImg) {
      try {
        const logoMaxW = 35;
        const logoMaxH = 20;
        doc.addImage(logoImg, "PNG", 8, qrSectionY + 5, logoMaxW, logoMaxH);
      } catch { /* skip */ }
    }
  }

  // QR Code on the right
  const qrDataUrl = await generateQrDataUrl(publicUrl, 200, primaryColor);
  if (qrDataUrl) {
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text("ESCANEIE PARA SALVAR", W - 22, qrSectionY, { align: "center" });

    try {
      doc.addImage(qrDataUrl, "PNG", W - 35, qrSectionY + 2, 26, 26);
    } catch { /* skip */ }
  }

  // ── Save ──
  const fileName = `cartao-${card.slug || "virtual"}.pdf`;
  doc.save(fileName);
}
