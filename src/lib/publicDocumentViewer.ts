/**
 * Regras do visualizador de anexos da página pública do orçamento.
 *
 * O anexo abre dentro da própria página: o endereço visível continua sendo o do
 * orçamento (vitrine.tur.br ou domínio próprio) e o caminho de armazenamento
 * nunca aparece na navegação. O bucket permanece privado — o acesso usa um
 * endereço assinado de curta duração, usado apenas internamente.
 */

export type DocumentPreviewKind = "pdf" | "image" | "download";

/** Duração do endereço assinado (segundos). Curta por segurança. */
export const SIGNED_URL_TTL_SECONDS = 600;

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "avif", "heic", "bmp"];

function extensionOf(fileName?: string | null): string {
  if (!fileName) return "";
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].trim().toLowerCase();
}

/** Decide como o anexo deve ser apresentado ao cliente. */
export function resolveDocumentPreviewKind(
  fileType?: string | null,
  fileName?: string | null,
): DocumentPreviewKind {
  const type = (fileType || "").toLowerCase();
  const ext = extensionOf(fileName);
  if (type.includes("pdf") || ext === "pdf") return "pdf";
  if (type.startsWith("image/") || IMAGE_EXTENSIONS.includes(ext)) return "image";
  return "download";
}

/** `true` quando o formato pode ser exibido sem sair do orçamento. */
export function canPreviewInline(fileType?: string | null, fileName?: string | null): boolean {
  return resolveDocumentPreviewKind(fileType, fileName) !== "download";
}
