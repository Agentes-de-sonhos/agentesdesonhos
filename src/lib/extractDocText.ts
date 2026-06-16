import mammoth from "mammoth";
import { extractPdfText } from "@/lib/pdfText";

export interface ExtractedDoc {
  filename: string;
  text: string;
  bytes: number;
  kind: "pdf" | "docx" | "txt" | "unknown";
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB per file

function guessKind(file: File): ExtractedDoc["kind"] {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (name.endsWith(".docx") || file.type.includes("officedocument.wordprocessingml")) return "docx";
  if (name.endsWith(".txt") || file.type.startsWith("text/")) return "txt";
  return "unknown";
}

export async function extractFileText(file: File): Promise<ExtractedDoc> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`O arquivo "${file.name}" excede o limite de 10MB.`);
  }
  const kind = guessKind(file);
  let text = "";
  try {
    if (kind === "pdf") {
      text = await extractPdfText(file);
    } else if (kind === "docx") {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      text = result.value || "";
    } else if (kind === "txt") {
      text = await file.text();
    } else {
      throw new Error(
        `Formato não suportado: "${file.name}". Use PDF, DOCX ou TXT.`
      );
    }
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(`Falha ao ler o arquivo "${file.name}".`);
  }
  return {
    filename: file.name,
    text: text.trim(),
    bytes: file.size,
    kind,
  };
}

export function buildConsolidatedText(
  docs: ExtractedDoc[],
  pastedText?: string
): string {
  const parts: string[] = [];
  docs.forEach((d, i) => {
    if (!d.text) return;
    parts.push(
      `===== ARQUIVO ${i + 1}: ${d.filename} (${d.kind.toUpperCase()}) =====\n${d.text}`
    );
  });
  if (pastedText && pastedText.trim().length > 0) {
    parts.push(`===== TEXTO COLADO PELO AGENTE =====\n${pastedText.trim()}`);
  }
  return parts.join("\n\n");
}