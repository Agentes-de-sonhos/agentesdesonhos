import { useState, useEffect } from "react";
import { PUBLIC_DOMAIN } from "@/lib/platform-version";
import { buildCarteiraLink } from "@/lib/carteira-domain";
import { useAgencyCustomDomain } from "@/hooks/useAgencyCustomDomain";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { useNavigate } from "react-router-dom";
import { format, isAfter, isBefore, isWithinInterval, startOfDay } from "date-fns";

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
import { ptBR } from "date-fns/locale";
import {
  Wallet, Plus, MapPin, Calendar, ExternalLink, Copy, Trash2, Eye, Pencil, Lock, Loader2, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTrips } from "@/hooks/useTrips";
import { useToast } from "@/hooks/use-toast";
import type { Trip } from "@/types/trip";
import { ClientAvatar } from "@/components/shared/ClientAvatar";
import { copyTextToClipboard } from "@/lib/public-share-message";

type FilterType = "all" | "future" | "active" | "past";
type TripStatus = { label: string; dot: string; bg: string; text: string; ring: string };

function getTripStatus(trip: Trip): TripStatus {
  const today = startOfDay(new Date());
  const start = startOfDay(parseLocalDate(trip.start_date));
  const end = startOfDay(parseLocalDate(trip.end_date));

  if (isAfter(start, today)) {
    return {
      label: "Futura",
      dot: "bg-sky-500",
      bg: "bg-sky-50",
      text: "text-sky-700",
      ring: "ring-sky-200/70",
    };
  }
  if (isBefore(end, today)) {
    return {
      label: "Concluída",
      dot: "bg-muted-foreground/50",
      bg: "bg-muted",
      text: "text-muted-foreground",
      ring: "ring-border/60",
    };
  }
  return {
    label: "Em andamento",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200/70",
  };
}

function filterTrips(trips: Trip[], filter: FilterType): Trip[] {
  if (filter === "all") return trips;
  const today = startOfDay(new Date());

  return trips.filter((trip) => {
    const start = startOfDay(parseLocalDate(trip.start_date));
    const end = startOfDay(parseLocalDate(trip.end_date));

    switch (filter) {
      case "future": return isAfter(start, today);
      case "active": return isWithinInterval(today, { start, end }) || start.getTime() === today.getTime();
      case "past": return isBefore(end, today);
      default: return true;
    }
  });
}

function StatusBadge({ status }: { status: TripStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        status.bg,
        status.text,
        status.ring
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
      {status.label}
    </span>
  );
}

function IconAction({
  label,
  onClick,
  children,
  destructive,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-muted-foreground/80 transition-colors",
            "hover:bg-muted/70 hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground",
            destructive && "hover:bg-rose-50 hover:text-rose-600",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function TripRow({
  trip,
  agencyName,
  onCopyLink,
  onCopyPassword,
  onDelete,
}: {
  trip: Trip;
  agencyName?: string;
  onCopyLink: (trip: Trip) => void;
  onCopyPassword: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
}) {
  const navigate = useNavigate();
  const status = getTripStatus(trip);

  return (
    <div className="group grid grid-cols-1 md:grid-cols-[1fr_140px_160px] gap-4 items-start md:items-center px-5 py-4 transition-colors hover:bg-muted/20">
      <div className="flex items-center gap-3 min-w-0">
        <ClientAvatar name={trip.client_name} className="h-10 w-10" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{trip.client_name}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
            {trip.destination && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate max-w-[200px]">{trip.destination}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(parseLocalDate(trip.start_date), "dd/MM", { locale: ptBR })} — {format(parseLocalDate(trip.end_date), "dd/MM/yy", { locale: ptBR })}
            </span>
          </div>
          {trip.access_password && (
            <button
              onClick={() => onCopyPassword(trip)}
              className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5 hover:text-foreground transition-colors"
            >
              <Lock className="h-3 w-3" /> Senha: {trip.access_password}
              <Copy className="h-3 w-3 ml-1" />
            </button>
          )}
        </div>
      </div>

      <div className="md:justify-self-start">
        <StatusBadge status={status} />
        {trip.is_locked && (
          <Badge variant="destructive" className="text-xs shrink-0 gap-1 mt-1.5">
            <ShieldAlert className="h-3 w-3" /> Bloqueada
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-0.5 md:justify-self-end opacity-100 md:opacity-70 md:group-hover:opacity-100 transition-opacity">
        <IconAction label="Visualizar" onClick={() => navigate(`/ferramentas-ia/trip-wallet/${trip.id}`)}>
          <Eye className="h-4 w-4" />
        </IconAction>
        <IconAction label="Editar" onClick={() => navigate(`/ferramentas-ia/trip-wallet/${trip.id}?edit=true`)}>
          <Pencil className="h-4 w-4" />
        </IconAction>
        <IconAction label="Copiar link" onClick={() => onCopyLink(trip)}>
          <Copy className="h-4 w-4" />
        </IconAction>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              aria-label="Excluir"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-muted-foreground/80 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:bg-muted focus-visible:text-foreground"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir carteira?</AlertDialogTitle>
              <AlertDialogDescription>
                A carteira de {trip.client_name} será excluída permanentemente, incluindo todos os serviços e documentos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(trip)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function TripWalletList({ agencyName }: { agencyName?: string }) {
  const navigate = useNavigate();
  const { customDomain } = useAgencyCustomDomain();
  const { toast } = useToast();
  const { trips, isLoading, deleteTrip } = useTrips();
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredTrips = filterTrips(trips, filter);
  const { paginatedItems: paginatedTrips, currentPage, totalPages, totalItems, pageSize, goToPage, resetPage } = usePagination(filteredTrips, { pageSize: 15 });

  // Reset to page 1 when filter changes
  useEffect(() => { resetPage(); }, [filter, resetPage]);

  const futureCount = trips.filter((t) => isAfter(startOfDay(parseLocalDate(t.start_date)), startOfDay(new Date()))).length;
  const pastCount = trips.filter((t) => isBefore(startOfDay(parseLocalDate(t.end_date)), startOfDay(new Date()))).length;
  const activeCount = trips.length - futureCount - pastCount;

  const handleCopyLink = (trip: Trip & { public_access_code?: string | null }) => {
    if (trip.public_access_code && agencyName) {
      const url = buildCarteiraLink(agencyName, trip.public_access_code, customDomain);
      copyTextToClipboard(url).then((ok) => {
        if (ok) toast({ title: "Link copiado!", description: "Link da carteira copiado para a área de transferência." });
        else toast({ title: "Não foi possível copiar automaticamente. Tente novamente.", variant: "destructive" });
      });
      return;
    }
    const origin = PUBLIC_DOMAIN;
    const url = trip.slug
      ? `${origin}/c/${trip.slug}`
      : trip.share_token
        ? `${origin}/viagem/${trip.share_token}`
        : '';
    if (!url) return;
    copyTextToClipboard(url).then((ok) => {
      if (ok) toast({ title: "Link copiado!", description: "Link da carteira copiado para a área de transferência." });
      else toast({ title: "Não foi possível copiar automaticamente. Tente novamente.", variant: "destructive" });
    });
  };

  const handleCopyPassword = (trip: Trip) => {
    if (!trip.access_password) return;
    navigator.clipboard.writeText(trip.access_password);
    toast({ title: "Senha copiada!", description: "Senha da carteira copiada." });
  };

  const handleDelete = (trip: Trip) => {
    deleteTrip(trip.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Métricas compactas */}
        {trips.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: "Total", value: trips.length, dot: "bg-foreground/40" },
              { label: "Futuras", value: futureCount, dot: "bg-sky-500" },
              { label: "Em andamento", value: activeCount, dot: "bg-emerald-500" },
              { label: "Concluídas", value: pastCount, dot: "bg-muted-foreground/50" },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-border/60 bg-card px-4 py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
                  <span className="text-xs font-medium text-muted-foreground truncate">{m.label}</span>
                </div>
                <span className="text-lg font-semibold text-foreground tabular-nums">{m.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Filtros por status */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList className="h-auto bg-transparent p-0 gap-1 rounded-none">
            {([
              { v: "all", label: "Todas" },
              { v: "future", label: "Futuras" },
              { v: "active", label: "Em andamento" },
              { v: "past", label: "Passadas" },
            ] as { v: FilterType; label: string }[]).map((opt) => (
              <TabsTrigger
                key={opt.v}
                value={opt.v}
                className="h-8 rounded-lg px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Card container */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          {/* Header row (desktop) */}
          {filteredTrips.length > 0 && (
            <div className="hidden md:grid grid-cols-[1fr_140px_160px] gap-6 items-center px-5 py-2.5 border-b border-border/60 bg-muted/20 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div>Cliente</div>
              <div>Status</div>
              <div className="justify-self-end pr-1">Ações</div>
            </div>
          )}

          {filteredTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {trips.length === 0 ? "Nenhuma carteira criada ainda" : "Nenhuma carteira encontrada"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {trips.length === 0
                  ? "Crie sua primeira carteira digital para organizar vouchers, documentos e serviços."
                  : "Ajuste o filtro de status para encontrar a carteira desejada."}
              </p>
              {trips.length === 0 && (
                <Button onClick={() => navigate("/ferramentas-ia/trip-wallet")} className="mt-4 h-10 rounded-lg">
                  <Plus className="h-4 w-4" />
                  Nova Carteira
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {paginatedTrips.map((trip) => (
                <TripRow
                  key={trip.id}
                  trip={trip}
                  agencyName={agencyName}
                  onCopyLink={handleCopyLink}
                  onCopyPassword={handleCopyPassword}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          totalItems={totalItems}
          pageSize={pageSize}
        />
      </div>
    </TooltipProvider>
  );
}
