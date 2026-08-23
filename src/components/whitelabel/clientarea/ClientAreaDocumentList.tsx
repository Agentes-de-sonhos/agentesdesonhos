import { Download, FileText, Loader2, MapPinned, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type ClientAreaDocument,
  DOCUMENT_UNAVAILABLE,
  documentActionLabel,
  documentCategoryLabel,
  formatAvailableAt,
  formatFileKind,
  formatFileSize,
  groupDocuments,
} from "@/lib/clientAreaDocuments";

/** Linha de metadados discreta: tipo · tamanho · data de disponibilização. */
function DocumentMeta({ doc }: { doc: ClientAreaDocument }) {
  const parts = [
    formatFileKind(doc.file_type, doc.name),
    formatFileSize(doc.file_size),
    formatAvailableAt(doc.available_at) ? `Disponível desde ${formatAvailableAt(doc.available_at)}` : null,
    doc.status_label,
  ].filter(Boolean) as string[];
  if (!parts.length) return null;
  return <p className="mt-1 text-xs text-muted-foreground">{parts.join(" · ")}</p>;
}

export interface DocumentActionState {
  pendingId: string | null;
  onOpen: (doc: ClientAreaDocument) => void;
}

function DocumentRow({ doc, actions }: { doc: ClientAreaDocument; actions: DocumentActionState }) {
  const busy = actions.pendingId === doc.id;
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/60 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <FileText className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium text-foreground">{doc.name}</p>
        <DocumentMeta doc={doc} />
      </div>
      <Button
        variant="outline"
        size="sm"
        className="min-h-10 shrink-0"
        disabled={busy}
        onClick={() => actions.onOpen(doc)}
        aria-label={documentActionLabel("view", doc)}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="ml-2 hidden sm:inline">Abrir</span>
      </Button>
    </li>
  );
}

/** Lista de documentos agrupada por categoria (usada dentro de uma viagem). */
export function DocumentCategoryList({
  documents,
  actions,
  emptyText,
}: {
  documents: ClientAreaDocument[];
  actions: DocumentActionState;
  emptyText: string;
}) {
  if (documents.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>;
  }
  const groups = groupDocuments(documents);
  return (
    <div className="mt-5 space-y-6">
      {groups[0]?.categories.map((entry) => (
        <div key={entry.category}>
          <h3 className="text-sm font-semibold text-foreground">{documentCategoryLabel(entry.category)}</h3>
          <ul className="mt-3 space-y-3">
            {entry.documents.map((doc) => (
              <DocumentRow key={`${doc.source}:${doc.id}`} doc={doc} actions={actions} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Central completa: agrupada por viagem e, dentro dela, por categoria. */
export function DocumentTripGroups({
  documents,
  actions,
  onOpenTrip,
}: {
  documents: ClientAreaDocument[];
  actions: DocumentActionState;
  onOpenTrip?: (tripId: string) => void;
}) {
  const groups = groupDocuments(documents);
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section
          key={group.trip_id}
          className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm md:p-8"
          aria-labelledby={`ca-doc-${group.trip_id}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={`ca-doc-${group.trip_id}`} className="text-lg font-semibold text-foreground">
              {group.trip_title}
            </h2>
            {onOpenTrip ? (
              <Button variant="ghost" size="sm" className="min-h-10" onClick={() => onOpenTrip(group.trip_id)}>
                Ver viagem
              </Button>
            ) : null}
          </div>
          {group.categories.map((entry) => (
            <div key={entry.category} className="mt-5">
              <h3 className="text-sm font-semibold text-foreground">
                {documentCategoryLabel(entry.category)}
              </h3>
              <ul className="mt-3 space-y-3">
                {entry.documents.map((doc) => (
                  <DocumentRow key={`${doc.source}:${doc.id}`} doc={doc} actions={actions} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/** Cartões de acesso: Carteira Digital (uso único) e Roteiro publicado. */
export function TripAccessCards({
  access,
  tripId,
  pendingId,
  onOpenWallet,
  walletEmpty,
  itineraryEmpty,
  className,
}: {
  access?: { wallet: { available: boolean; protected?: boolean }; itinerary: { available: boolean; url: string | null } };
  tripId: string;
  pendingId: string | null;
  onOpenWallet: (tripId: string) => void;
  walletEmpty: string;
  itineraryEmpty: string;
  className?: string;
}) {
  const walletBusy = pendingId === `wallet:${tripId}`;
  const wallet = access?.wallet;
  const itinerary = access?.itinerary;

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <article className="rounded-2xl border border-border/60 bg-background/60 p-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Wallet className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="mt-3 text-base font-semibold text-foreground">Carteira Digital</h3>
        {wallet?.available ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Abra a carteira desta viagem sem informar a senha novamente.
            </p>
            <Button
              className="mt-4 min-h-11"
              disabled={walletBusy}
              onClick={() => onOpenWallet(tripId)}
            >
              {walletBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Abrir Carteira Digital
            </Button>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{walletEmpty}</p>
        )}
      </article>

      <article className="rounded-2xl border border-border/60 bg-background/60 p-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <MapPinned className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="mt-3 text-base font-semibold text-foreground">Roteiro da viagem</h3>
        {itinerary?.available && itinerary.url ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Veja o roteiro dia a dia preparado pela sua agência.
            </p>
            <Button asChild variant="outline" className="mt-4 min-h-11">
              <a href={itinerary.url} target="_blank" rel="noopener noreferrer">
                Abrir roteiro
              </a>
            </Button>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{itineraryEmpty}</p>
        )}
      </article>
    </div>
  );
}

export { DOCUMENT_UNAVAILABLE };
