import jsPDF from "jspdf";

interface CertificateData {
  templateUrl: string;
  agentName: string;
  completionDate: string;
  certificateNumber: string;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function generateCertificatePdf(data: CertificateData): Promise<Blob> {
  const { templateUrl, agentName, completionDate, certificateNumber } = data;

  // Load template image
  const img = await loadImage(templateUrl);
  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;

  // Determine orientation based on image aspect ratio
  const isLandscape = imgWidth >= imgHeight;
  const orientation = isLandscape ? "landscape" : "portrait";

  // Create PDF with dimensions matching image aspect ratio
  // Use A4-ish dimensions scaled to aspect ratio
  const pdfWidth = isLandscape ? 297 : 210;
  const pdfHeight = isLandscape ? 210 : 297;

  // Scale image to fill the page maintaining aspect ratio
  const imgAspect = imgWidth / imgHeight;
  const pageAspect = pdfWidth / pdfHeight;

  let drawWidth = pdfWidth;
  let drawHeight = pdfHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (imgAspect > pageAspect) {
    drawHeight = pdfHeight;
    drawWidth = pdfHeight * imgAspect;
    offsetX = -(drawWidth - pdfWidth) / 2;
  } else {
    drawWidth = pdfWidth;
    drawHeight = pdfWidth / imgAspect;
    offsetY = -(drawHeight - pdfHeight) / 2;
  }

  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: [pdfWidth, pdfHeight],
  });

  // Draw template as background
  pdf.addImage(img, "JPEG", offsetX, offsetY, drawWidth, drawHeight);

  // Overlay text — positioned in the lower-center area of the certificate
  const centerX = pdfWidth / 2;

  // Agent name — large, centered, positioned at ~40% from top (above template description text)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26);
  pdf.setTextColor(30, 30, 30);
  pdf.text(agentName, centerX, pdfHeight * 0.415, { align: "center" });

  // Completion date — positioned to match template's date area (~62% from top)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Data de conclusão: ${completionDate}`, centerX, pdfHeight * 0.56, {
    align: "center",
  });

  // Certificate ID — bottom-left area (~90% from top)
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text(`Certificado Nº ${certificateNumber}`, centerX, pdfHeight * 0.905, {
    align: "center",
  });

  return pdf.output("blob");
}
