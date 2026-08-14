import { useState } from "react";
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
  Paperclip,
  Download,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SecureDocumentViewer } from "@/components/wallet/SecureDocumentViewer";
import { useSecureDocument } from "@/hooks/useSecureDocument";
import { toast } from "sonner";
import type { SecureDocumentSource } from "@/lib/secureDocumentFetch";
import {
  collectServiceDocuments,
  type ServiceDocument,
  type ServiceDocumentKind,
} from "@/lib/serviceDocuments";

const KIND_ICON: Record<ServiceDocumentKind, typeof FileText> = {
  pdf: FileText,
  image: FileImage,
  doc: FileText,
  sheet: FileSpreadsheet,
  file: FileIcon,
};

export interface ServiceDocumentsAccess {
  mode: "public" | "authenticated";
  slug?: string;
  shareToken?: string;
  password?: string;
}

interface Props {
  /** Serviço da viagem (qualquer tipo). Os anexos são normalizados internamente. */
  service: unknown;
  access: ServiceDocumentsAccess;
  /** Quando false, o bloco não é renderizado (respeita a config de exibição ao passageiro). */
  visible?: boolean;
  /** Quantos itens mostrar antes de recolher o restante. */
  initialVisible?: number;
  className?: string;
}

const INITIAL_LIMIT = 3;

function DocumentRow({
  doc,
  onOpen,
  onDownload,
  downloading,
}: {
  doc: ServiceDocument;
  onOpen: (doc: ServiceDocument) => void;
  onDownload: (doc: ServiceDocument) => void;
  downloading: boolean;
}) {
  const Icon = KIND_ICON[doc.kind];
  const meta = [doc.ext, doc.size].filter(Boolean).join(" · ");

  return (
    <li className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-foreground break-words [overflow-wrap:anywhere]">
            {doc.name}
          </p>
          {meta && (
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              {meta}
            </p>
          )}
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
        <button
          type="button"
          onClick={() => onOpen(doc)}
          aria-label={`Abrir arquivo ${doc.name}`}
          className={cn(
            "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-[12px] font-semibold text-primary-foreground sm:flex-none",
            "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          )}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden />
          Abrir arquivo
        </button>
        <button
          type="button"
          onClick={() => onDownload(doc)}
          disabled={downloading}
          aria-label={`Baixar arquivo ${doc.name}`}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground",
            "transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
          )}
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </li>
  );
}

export function ServiceDocumentsCard({
  service,
  access,
  visible = true,
  initialVisible = INITIAL_LIMIT,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ServiceDocument | null>(null);
  const viewer = useSecureDocument();
  if (!visible) return null;

  const docs = collectServiceDocuments(service);
  if (docs.length === 0) return null;

  const shown = expanded ? docs : docs.slice(0, initialVisible);
  const hidden = docs.length - shown.length;

  const toSource = (doc: ServiceDocument): SecureDocumentSource => ({
    filePath: doc.path,
    fileName: doc.name,
    mode: access.mode,
    slug: access.slug,
    shareToken: access.shareToken,
    password: access.password,
  });

  const handleDownload = (doc: ServiceDocument) => {
    void viewer.download(toSource(doc)).catch((err) =>
      toast.error(err instanceof Error ? err.message : "Não foi possível baixar este arquivo."),
    );
  };

  const openDocument = (doc: ServiceDocument) => {
    setSelectedDocument(doc);
    void viewer.openDocument(toSource(doc));
  };

  const closeViewer = () => {
    viewer.close();
    setSelectedDocument(null);
  };

  const selectedMeta = selectedDocument
    ? [selectedDocument.ext, selectedDocument.size].filter(Boolean).join(" · ") || null
    : null;

  return (
    <>
    <section
      className={cn(
        "mt-3 w-full min-w-0 rounded-2xl border border-border bg-background p-3.5",
        className,
      )}
      aria-label="Documentos do serviço"
    >
      <header className="mb-2.5 flex items-center gap-1.5">
        <Paperclip className="h-3.5 w-3.5 text-primary" aria-hidden />
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground">
          Documentos do serviço
        </h4>
        {docs.length > 1 && (
          <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            {docs.length}
          </span>
        )}
      </header>

      <ul className="space-y-2">
        {shown.map((doc) => (
          <DocumentRow
            key={doc.path}
            doc={doc}
            onOpen={openDocument}
            onDownload={handleDownload}
            downloading={viewer.downloading}
          />
        ))}
      </ul>

      {hidden > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(true)}
          className="mt-2 h-8 w-full rounded-full text-[12px] font-semibold text-primary hover:bg-primary/10"
        >
          Ver todos ({docs.length})
        </Button>
      )}
    </section>

    <SecureDocumentViewer
      open={viewer.open}
      loading={viewer.loading}
      downloading={viewer.downloading}
      error={viewer.error}
      doc={viewer.doc}
      fileName={selectedDocument?.name || "Documento"}
      fileMeta={selectedMeta}
      onClose={closeViewer}
      onRetry={() => {
        if (selectedDocument) void viewer.openDocument(toSource(selectedDocument));
      }}
      onDownload={() => {
        if (selectedDocument) handleDownload(selectedDocument);
      }}
    />
    </>
  );
}
