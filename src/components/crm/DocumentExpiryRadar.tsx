import { useMemo, useState } from "react";
import { Loader2, MessageCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDocumentExpiryRadar } from "@/hooks/useTravelerVisas";
import {
  DOCUMENT_STATUS,
  daysUntil,
  documentStatus,
  expiryWhatsappMessage,
  formatBrDate,
  whatsappLink,
  type DocumentStatusKey,
} from "@/lib/documentExpiry";

const FILTERS: { key: DocumentStatusKey | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "vencido", label: "Vencidos" },
  { key: "critico", label: "Até 30 dias" },
  { key: "atencao", label: "Até 3 meses" },
  { key: "oportunidade", label: "Até 6 meses" },
  { key: "em_dia", label: "Em dia" },
];

export function DocumentExpiryRadar() {
  const { data = [], isLoading } = useDocumentExpiryRadar();
  const [filter, setFilter] = useState<DocumentStatusKey | "todos">("todos");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((item) => {
      const status = documentStatus(item.data_vencimento);
      if (!status) return false;
      if (filter !== "todos" && status.key !== filter) return false;
      if (!term) return true;
      return (
        item.clientName.toLowerCase().includes(term) ||
        item.travelerName.toLowerCase().includes(term) ||
        item.documentLabel.toLowerCase().includes(term)
      );
    });
  }, [data, filter, search]);

  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const item of data) {
      const status = documentStatus(item.data_vencimento);
      if (status) acc[status.key] = (acc[status.key] ?? 0) + 1;
    }
    return acc;
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count = f.key === "todos" ? data.length : counts[f.key] ?? 0;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={
                filter === f.key
                  ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  : "rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              }
            >
              {f.label} ({count})
            </button>
          );
        })}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente, viajante ou documento..."
          className="h-9 w-full max-w-xs"
        />
      </div>

      {isLoading ? (
        <Card className="rounded-2xl">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p className="font-medium text-foreground">Nenhum documento neste filtro</p>
            <p className="mt-1 text-sm">
              Cadastre a validade do passaporte e os vistos dos viajantes para acompanhar os vencimentos aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((item) => {
            const status = documentStatus(item.data_vencimento) ?? DOCUMENT_STATUS.em_dia;
            const days = daysUntil(item.data_vencimento) ?? 0;
            const link = whatsappLink(
              item.clientPhone,
              expiryWhatsappMessage({
                clientName: item.clientName,
                travelerName: item.travelerName,
                documentLabel: item.documentLabel,
                dateValue: item.data_vencimento,
              })
            );
            return (
              <Card key={item.id} className="rounded-xl">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{item.documentLabel}</span>
                      <Badge variant="secondary" className={`text-[10px] ${status.className}`}>
                        {status.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {item.travelerName}
                      {item.travelerName !== item.clientName ? ` • cliente: ${item.clientName}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vence em {formatBrDate(item.data_vencimento)} ·{" "}
                      {days < 0 ? `vencido há ${Math.abs(days)} dias` : `faltam ${days} dias`}
                      {item.numero ? ` · nº ${item.numero}` : ""}
                    </p>
                  </div>
                  {link ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-1.5 h-4 w-4" /> Avisar no WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem WhatsApp cadastrado</span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
