// Client-side PDF -> plain text extractor using pdf.js.
// Used as an additional textual signal alongside the binary PDF
// when sending vouchers/e-tickets to the AI parser.
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - bundler import for the worker
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPdfText(file: File): Promise<string> {
  try {
    const buf = await file.arrayBuffer();
    const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
    const parts: string[] = [];
    const maxPages = Math.min(pdf.numPages, 15);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Reconstruct lines using item positions to preserve table structure.
      const items = (content.items as any[])
        .map((it) => ({
          str: (it.str || "").trim(),
          x: it.transform?.[4] ?? 0,
          y: Math.round((it.transform?.[5] ?? 0) * -1),
        }))
        .filter((it) => it.str.length > 0);

      // Group by Y (rows), then sort by X
      const rows = new Map<number, { x: number; str: string }[]>();
      for (const it of items) {
        const key = Math.round(it.y / 4) * 4; // tolerate small jitter
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key)!.push({ x: it.x, str: it.str });
      }
      const sortedKeys = Array.from(rows.keys()).sort((a, b) => a - b);
      const pageLines: string[] = [];
      for (const k of sortedKeys) {
        const row = rows.get(k)!.sort((a, b) => a.x - b.x);
        pageLines.push(row.map((r) => r.str).join("  "));
      }
      parts.push(`--- Página ${i} ---\n${pageLines.join("\n")}`);
    }
    return parts.join("\n\n").slice(0, 28000);
  } catch (e) {
    console.warn("[pdfText] extraction failed:", e);
    return "";
  }
}
