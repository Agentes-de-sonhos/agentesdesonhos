/**
 * Área do Cliente White Label — Etapa 5: documentos, contratos e acessos.
 *
 * Toda a REGRA DE APRESENTAÇÃO dos documentos vive aqui. O servidor decide o
 * que pode ser listado (somente arquivos marcados como disponíveis na Área do
 * Cliente, da própria agência e da própria viagem) e devolve apenas metadados
 * seguros: nunca caminho de storage, nome de bucket, URL permanente ou
 * identificador de operação/venda.
 */

export type ClientAreaDocumentSource = "contract" | "attachment";

export type ClientAreaDocumentCategory =
  | "contrato"
  | "voucher"
  | "passagem"
  | "hospedagem"
  | "seguro"
  | "ingresso"
  | "comprovante"
  | "outro";

export interface ClientAreaDocument {
  /** Identificador do documento (usado apenas para pedir a autorização). */
  id: string;
  source: ClientAreaDocumentSource;
  name: string;
  category: ClientAreaDocumentCategory;
  /** Viagem a que o documento pertence (id da viagem na Área do Cliente). */
  trip_id: string;
  trip_title: string | null;
  /** Data em que a agência disponibilizou o documento. */
  available_at: string | null;
  file_type: string | null;
  file_size: number | null;
  /** Situação do contrato, quando existir de forma confiável. */
  status_label?: string | null;
}

export const DOCUMENT_CATEGORY_LABELS: Record<ClientAreaDocumentCategory, string> = {
  contrato: "Contratos",
  voucher: "Vouchers",
  passagem: "Passagens e bilhetes",
  hospedagem: "Hospedagem",
  seguro: "Seguro viagem",
  ingresso: "Ingressos",
  comprovante: "Comprovantes",
  outro: "Outros documentos de viagem",
};

/** Ordem estável de exibição das categorias. */
export const DOCUMENT_CATEGORY_ORDER: ClientAreaDocumentCategory[] = [
  "contrato",
  "voucher",
  "passagem",
  "hospedagem",
  "seguro",
  "ingresso",
  "comprovante",
  "outro",
];

export function documentCategoryLabel(category: ClientAreaDocumentCategory): string {
  return DOCUMENT_CATEGORY_LABELS[category] ?? DOCUMENT_CATEGORY_LABELS.outro;
}

/** Normaliza a categoria livre cadastrada pela agência em uma das categorias exibíveis. */
export function normalizeDocumentCategory(raw?: string | null): ClientAreaDocumentCategory {
  const value = (raw || "").trim().toLowerCase();
  if (!value) return "outro";
  if (/contrat/.test(value)) return "contrato";
  if (/voucher|reserva/.test(value)) return "voucher";
  if (/passag|bilhet|aere|aéreo|ticket|e-?ticket|flight/.test(value)) return "passagem";
  if (/hotel|hosped|acomod/.test(value)) return "hospedagem";
  if (/seguro|apolice|apólice|insur/.test(value)) return "seguro";
  if (/ingress|atracao|atração|park|attraction/.test(value)) return "ingresso";
  if (/comprov|recibo|pagamento|receipt/.test(value)) return "comprovante";
  return "outro";
}

export interface DocumentTripGroup {
  trip_id: string;
  trip_title: string;
  categories: { category: ClientAreaDocumentCategory; label: string; documents: ClientAreaDocument[] }[];
  total: number;
}

/** Agrupa por viagem e, dentro dela, por categoria — mantendo a ordem canônica. */
export function groupDocuments(documents: ClientAreaDocument[]): DocumentTripGroup[] {
  const byTrip = new Map<string, ClientAreaDocument[]>();
  for (const doc of documents) {
    const list = byTrip.get(doc.trip_id) ?? [];
    list.push(doc);
    byTrip.set(doc.trip_id, list);
  }

  const groups: DocumentTripGroup[] = [];
  for (const [trip_id, docs] of byTrip) {
    const categories = DOCUMENT_CATEGORY_ORDER.map((category) => ({
      category,
      label: documentCategoryLabel(category),
      documents: docs
        .filter((d) => d.category === category)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    })).filter((entry) => entry.documents.length > 0);

    groups.push({
      trip_id,
      trip_title: (docs[0]?.trip_title || "").trim() || "Viagem",
      categories,
      total: docs.length,
    });
  }

  return groups.sort((a, b) => a.trip_title.localeCompare(b.trip_title, "pt-BR"));
}

/** Tamanho legível; null quando a agência não registrou o tamanho. */
export function formatFileSize(bytes?: number | null): string | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Tipo de arquivo em linguagem simples (nunca o mime cru). */
export function formatFileKind(fileType?: string | null, name?: string | null): string | null {
  const type = (fileType || "").toLowerCase();
  const ext = (name || "").toLowerCase().split(".").pop() || "";
  if (type.includes("pdf") || ext === "pdf") return "PDF";
  if (type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) return "Imagem";
  if (type.includes("word") || ["doc", "docx"].includes(ext)) return "Documento";
  if (type.includes("sheet") || ["xls", "xlsx", "csv"].includes(ext)) return "Planilha";
  return null;
}

export function formatAvailableAt(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Rótulo acessível do botão (o nome do arquivo entra no nome acessível). */
export function documentActionLabel(action: "view" | "download", doc: ClientAreaDocument): string {
  return `${action === "view" ? "Visualizar" : "Baixar"} ${doc.name}`;
}

export const DOCUMENTS_EMPTY = "Sua agência ainda não disponibilizou documentos nesta área.";
export const CONTRACTS_EMPTY = "Nenhum contrato foi disponibilizado para esta viagem.";
export const WALLET_EMPTY = "A Carteira Digital desta viagem ainda não foi criada pela agência.";
export const ITINERARY_EMPTY = "O roteiro desta viagem ainda não foi publicado pela agência.";
export const DOCUMENT_UNAVAILABLE =
  "Este documento não está disponível agora. Tente novamente ou fale com a agência.";
export const DOCUMENTS_INTRO =
  "Aqui ficam os arquivos que a sua agência disponibilizou para você, organizados por viagem.";

/** Contagem discreta para a página inicial. */
export function documentsCountLabel(total: number): string {
  if (total <= 0) return "Nenhum documento disponível";
  return total === 1 ? "1 documento disponível" : `${total} documentos disponíveis`;
}
