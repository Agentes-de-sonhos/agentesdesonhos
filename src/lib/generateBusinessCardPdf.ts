import { jsPDF } from "jspdf";
import type { BusinessCard, SocialLinks } from "@/hooks/useBusinessCard";

const PUBLIC_DOMAIN = "https://contato.tur.br";

// Page dimensions in mm — proportional to 375x812 mobile viewport
// Using 90mm width (≈375px scaled) with dynamic height
const W = 90;
const MARGIN_X = 6;
const CONTENT_X = MARGIN_X;
const CONTENT_W = W - MARGIN_X * 2;

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
  try {
    const { default: QRCode } = await import("qrcode");
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: { dark: color, light: "#FFFFFF" },
    });
  } catch {
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

/**
 * Calculates the total page height dynamically based on card content,
 * then renders each section matching the public CartaoPublico.tsx layout.
 */
export async function generateBusinessCardPdf(card: BusinessCard): Promise<void> {
  const primaryColor = card.primary_color || "#0284c7";
  const secondaryColor = card.secondary_color || "#f97316";
  const [pr, pg, pb] = hexToRgb(primaryColor);
  const [sr, sg, sb] = hexToRgb(secondaryColor);
  const publicUrl = `${PUBLIC_DOMAIN}/${card.slug}`;
  const activeSocials = Object.entries(card.social_links || {}).filter(([, v]) => !!v) as [keyof SocialLinks, string][];
  const activeButtons = card.buttons.filter(b => b.text);

  // ─── Pre-calculate total height ───
  let totalH = 0;
  const COVER_H = 38; // cover area
  const PHOTO_R = 13; // photo radius in mm
  const PHOTO_OVERLAP = 7; // how much photo overlaps below cover
  totalH += COVER_H + PHOTO_OVERLAP + PHOTO_R + 4; // cover + photo bottom + gap

  // Name block
  totalH += 7; // name
  if (card.title) totalH += 4;
  if (card.agency_name) totalH += 4;
  totalH += 4; // gap

  // Quick contacts
  const contacts: { label: string; url: string; bgColor: [number, number, number] }[] = [];
  if (card.whatsapp) contacts.push({ label: "WA", url: `https://wa.me/${formatWhatsapp(card.whatsapp)}`, bgColor: [37, 211, 102] });
  if (card.phone) contacts.push({ label: "TEL", url: `tel:${card.phone}`, bgColor: [pr, pg, pb] });
  if (card.email) contacts.push({ label: "@", url: `mailto:${card.email}`, bgColor: [pr, pg, pb] });
  if (card.website) {
    const siteUrl = card.website.startsWith("http") ? card.website : `https://${card.website}`;
    contacts.push({ label: "WEB", url: siteUrl, bgColor: [pr, pg, pb] });
  }
  if (contacts.length > 0) totalH += 14; // contact circles + gap

  // Save contact button
  totalH += 12; // button height + gap

  // Action buttons
  if (activeButtons.length > 0) {
    totalH += activeButtons.length * 12 + 4;
  }

  // Social links
  if (activeSocials.length > 0) {
    totalH += 20; // label + icons + gap
  }

  // Logo + QR section
  totalH += 45;

  // Bottom padding
  totalH += 6;

  const H = Math.max(totalH, 120);

  // ─── Create PDF ───
  const doc = new jsPDF({ unit: "mm", format: [W, H], orientation: "portrait" });

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  let y = 0;

  // ═══════════════════════════════════════════
  // COVER (h-40 ≈ 160px → 38mm)
  // ═══════════════════════════════════════════
  if (card.cover_url) {
    const coverImg = await loadImageAsBase64(card.cover_url);
    if (coverImg) {
      try {
        doc.addImage(coverImg, "JPEG", 0, 0, W, COVER_H);
      } catch {
        drawGradientCover(doc, pr, pg, pb, sr, sg, sb, COVER_H);
      }
    } else {
      drawGradientCover(doc, pr, pg, pb, sr, sg, sb, COVER_H);
    }
  } else {
    drawGradientCover(doc, pr, pg, pb, sr, sg, sb, COVER_H);
  }

  // ═══════════════════════════════════════════
  // PHOTO (h-28 w-28 ≈ 112px → 26mm diameter, centered, overlapping cover)
  // ═══════════════════════════════════════════
  const photoDiameter = PHOTO_R * 2;
  const photoCx = W / 2;
  const photoCy = COVER_H + PHOTO_OVERLAP; // center of photo

  // White border (border-4 ≈ 1.5mm)
  doc.setFillColor(255, 255, 255);
  doc.circle(photoCx, photoCy, PHOTO_R + 1.5, "F");

  if (card.photo_url) {
    const photoImg = await loadImageAsBase64(card.photo_url);
    if (photoImg) {
      try {
        doc.addImage(
          photoImg, "JPEG",
          photoCx - PHOTO_R, photoCy - PHOTO_R,
          photoDiameter, photoDiameter,
        );
      } catch { /* skip */ }
    }
  } else {
    doc.setFillColor(pr, pg, pb);
    doc.circle(photoCx, photoCy, PHOTO_R, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    const initial = card.name?.charAt(0)?.toUpperCase() || "?";
    doc.text(initial, photoCx, photoCy + 3, { align: "center" });
  }

  y = photoCy + PHOTO_R + 5;

  // ═══════════════════════════════════════════
  // NAME & TITLE (matching text-2xl bold + text-gray-500 + text-sm primary)
  // ═══════════════════════════════════════════
  doc.setTextColor(17, 24, 39); // gray-900
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(card.name || "", W / 2, y, { align: "center" });
  y += 5;

  if (card.title) {
    doc.setTextColor(107, 114, 128); // gray-500
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(card.title, W / 2, y, { align: "center" });
    y += 4;
  }

  if (card.agency_name) {
    doc.setTextColor(pr, pg, pb);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(card.agency_name, W / 2, y, { align: "center" });
    y += 4;
  }

  y += 3;

  // ═══════════════════════════════════════════
  // QUICK CONTACT CIRCLES (h-12 w-12 ≈ 48px → 11mm)
  // ═══════════════════════════════════════════
  if (contacts.length > 0) {
    const circleR = 5.5;
    const gap = 3;
    const totalW = contacts.length * circleR * 2 + (contacts.length - 1) * gap;
    let cx = (W - totalW) / 2 + circleR;

    for (const c of contacts) {
      // Shadow effect (subtle)
      doc.setFillColor(200, 200, 200);
      doc.circle(cx + 0.3, y + circleR + 0.3, circleR, "F");

      // Circle
      doc.setFillColor(c.bgColor[0], c.bgColor[1], c.bgColor[2]);
      doc.circle(cx, y + circleR, circleR, "F");

      // Link
      doc.link(cx - circleR, y, circleR * 2, circleR * 2, { url: c.url });

      // Label
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.text(c.label, cx, y + circleR + 1.5, { align: "center" });

      cx += circleR * 2 + gap;
    }
    y += circleR * 2 + 5;
  }

  // ═══════════════════════════════════════════
  // SAVE CONTACT BUTTON (w-full py-3 rounded-xl)
  // ═══════════════════════════════════════════
  const saveBtnH = 9;
  const saveBtnX = CONTENT_X;
  const saveBtnW = CONTENT_W;

  // Shadow
  doc.setFillColor(180, 180, 180);
  doc.roundedRect(saveBtnX + 0.3, y + 0.5, saveBtnW, saveBtnH, 3, 3, "F");

  // Button
  doc.setFillColor(pr, pg, pb);
  doc.roundedRect(saveBtnX, y, saveBtnW, saveBtnH, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("⬇  Salvar Contato", W / 2, y + saveBtnH / 2 + 1.5, { align: "center" });
  doc.link(saveBtnX, y, saveBtnW, saveBtnH, { url: publicUrl });
  y += saveBtnH + 5;

  // ═══════════════════════════════════════════
  // ACTION BUTTONS (w-full py-3 rounded-xl border-2)
  // ═══════════════════════════════════════════
  if (activeButtons.length > 0) {
    for (const btn of activeButtons) {
      const abtnH = 9;
      const abtnX = CONTENT_X;
      const abtnW = CONTENT_W;

      // Outlined button
      doc.setDrawColor(pr, pg, pb);
      doc.setLineWidth(0.6);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(abtnX, y, abtnW, abtnH, 3, 3, "FD");

      doc.setTextColor(pr, pg, pb);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const label = btn.text.length > 35 ? btn.text.substring(0, 35) + "…" : btn.text;
      doc.text(`↗  ${label}`, W / 2, y + abtnH / 2 + 1.2, { align: "center" });

      const btnUrl = btn.url.startsWith("http") ? btn.url : `https://${btn.url}`;
      doc.link(abtnX, y, abtnW, abtnH, { url: btnUrl });

      y += abtnH + 3;
    }
    y += 2;
  }

  // ═══════════════════════════════════════════
  // SOCIAL LINKS (h-11 w-11 ≈ 44px → 10mm)
  // ═══════════════════════════════════════════
  if (activeSocials.length > 0) {
    doc.setTextColor(156, 163, 175); // gray-400
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text("SIGA-ME NAS REDES", W / 2, y, { align: "center" });
    y += 4;

    const sCircleR = 5;
    const sGap = 3;
    const sTotalW = activeSocials.length * sCircleR * 2 + (activeSocials.length - 1) * sGap;
    let sx = (W - sTotalW) / 2 + sCircleR;

    for (const [key, url] of activeSocials) {
      // Shadow
      doc.setFillColor(210, 210, 210);
      doc.circle(sx + 0.2, y + sCircleR + 0.2, sCircleR, "F");

      // Circle
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
    y += sCircleR * 2 + 6;
  }

  // ═══════════════════════════════════════════
  // LOGO + QR CODE (flex items-center justify-between)
  // ═══════════════════════════════════════════
  const sectionY = y + 2;
  const qrSize = 28;
  const qrX = W - MARGIN_X - qrSize - 4;
  const logoMaxW = W / 2 - MARGIN_X - 4;

  // Logo on the left
  if (card.logos.length > 0) {
    const logoImg = await loadImageAsBase64(card.logos[0]);
    if (logoImg) {
      try {
        // Maintain aspect ratio within bounds
        const logoMaxH = 28;
        doc.addImage(logoImg, "PNG", CONTENT_X + 2, sectionY + 2, logoMaxW, logoMaxH);
      } catch { /* skip */ }
    }
  }

  // QR Code on the right
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(4.5);
  doc.setFont("helvetica", "normal");
  doc.text("ESCANEIE PARA SALVAR", qrX + qrSize / 2, sectionY, { align: "center" });

  const qrDataUrl = await generateQrDataUrl(publicUrl, 300, primaryColor);
  if (qrDataUrl) {
    // QR border/shadow (bg-white p-3 rounded-xl shadow-inner border)
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(qrX - 2, sectionY + 2, qrSize + 4, qrSize + 4, 2, 2, "FD");

    try {
      doc.addImage(qrDataUrl, "PNG", qrX, sectionY + 4, qrSize, qrSize);
    } catch { /* skip */ }
  }

  // ─── Save ───
  const fileName = `cartao-${card.slug || "virtual"}.pdf`;
  doc.save(fileName);
}

/** Draw a 135deg gradient from primaryColor to secondaryColor */
function drawGradientCover(
  doc: jsPDF,
  pr: number, pg: number, pb: number,
  sr: number, sg: number, sb: number,
  coverH: number,
) {
  // Diagonal gradient approximation using thin horizontal strips with color interpolation
  for (let i = 0; i < coverH; i++) {
    const t = i / coverH;
    const r = Math.round(pr + (sr - pr) * t);
    const g = Math.round(pg + (sg - pg) * t);
    const b = Math.round(pb + (sb - pb) * t);
    doc.setFillColor(r, g, b);
    doc.rect(0, i, W, 1.2, "F");
  }
}
