import { useState, type ReactNode } from "react";
import { Check, Pencil, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientSelector } from "@/components/shared/ClientSelector";
import { TripPeriodField } from "@/components/shared/TripPeriodField";
import type { Trip } from "@/types/trip";

type EditableField = "client_name" | "trip_title" | "destination" | "period" | "status";

interface Props {
  trip: Trip;
  coverPicker: ReactNode;
  isSaving: boolean;
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
}

function SettingCell({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0 border-b border-border/60 p-3 sm:min-h-24 sm:border-b-0 sm:border-r [&:nth-child(3n)]:sm:border-r-0"><p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>{children}</div>;
}

export function WalletInitialSettings({ trip, coverPicker, isSaving, onUpdate }: Props) {
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [draft, setDraft] = useState("");
  const [period, setPeriod] = useState({ start: "", end: "" });
  const startDate = new Date(`${trip.start_date}T00:00:00`);
  const endDate = new Date(`${trip.end_date}T00:00:00`);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  const documentCount = (trip.services || []).filter((service) => service.voucher_url).length;

  const begin = (field: EditableField, value: string) => { setEditing(field); setDraft(value); };
  const cancel = () => { setEditing(null); setDraft(""); };
  const save = async (field: Exclude<EditableField, "client_name" | "period">) => {
    const value = draft.trim();
    if (field !== "trip_title" && !value) return;
    await onUpdate({ [field]: field === "trip_title" ? value || null : value });
    cancel();
  };
  const controls = (field: Exclude<EditableField, "client_name" | "period">) => editing === field ? (
    <div className="flex min-w-0 items-center gap-1">
      {field === "status" ? (
        <select aria-label="Status da carteira" value={draft} onChange={(event) => setDraft(event.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"><option value="active">Ativa</option><option value="archived">Arquivada</option></select>
      ) : (
        <Input aria-label={field === "trip_title" ? "Título da carteira" : "Destino"} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(field); if (event.key === "Escape") cancel(); }} className="min-w-0 flex-1" autoFocus />
      )}
      <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => save(field)} disabled={isSaving} aria-label="Salvar"><Check className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={cancel} aria-label="Cancelar"><X className="h-4 w-4" /></Button>
    </div>
  ) : (
    <div className="flex min-w-0 items-center gap-1"><span className="min-w-0 flex-1 break-words text-sm font-medium">{field === "trip_title" ? trip.trip_title || <span className="font-normal italic text-muted-foreground">Adicionar título</span> : field === "destination" ? trip.destination : trip.status === "archived" ? "Arquivada" : "Ativa"}</span><Button variant="ghost" size="icon" className="min-h-11 min-w-11 shrink-0" onClick={() => begin(field, field === "trip_title" ? trip.trip_title || "" : field === "destination" ? trip.destination : trip.status)} aria-label={`Editar ${field === "trip_title" ? "título" : field === "destination" ? "destino" : "status"}`}><Pencil className="h-4 w-4" /></Button></div>
  );

  return (
    <section aria-labelledby="wallet-main-data-title" className="overflow-hidden rounded-lg border bg-card shadow-sm" data-testid="wallet-main-data-grid">
      <h4 id="wallet-main-data-title" className="border-b px-4 py-3 text-sm font-semibold">Dados principais</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <SettingCell label="Cliente">{editing === "client_name" ? <div className="flex items-center gap-1"><div className="min-w-0 flex-1"><ClientSelector value={(trip as any).client_id ? { id: (trip as any).client_id, name: trip.client_name } : null} onChange={async (client) => { if (!client) return; await onUpdate({ client_name: client.name, client_id: client.id }); cancel(); }} required /></div><Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={cancel} aria-label="Cancelar"><X className="h-4 w-4" /></Button></div> : <div className="flex items-center gap-1"><span className="min-w-0 flex-1 break-words text-sm font-medium">{trip.client_name}</span><Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => setEditing("client_name")} aria-label="Editar cliente"><Pencil className="h-4 w-4" /></Button></div>}</SettingCell>
        <SettingCell label="Título da carteira">{controls("trip_title")}</SettingCell>
        <SettingCell label="Foto de capa">{coverPicker}</SettingCell>
        <SettingCell label="Destino">{controls("destination")}</SettingCell>
        <SettingCell label="Período">{editing === "period" ? <div className="space-y-2"><TripPeriodField id="wallet-settings-period" label="" start={period.start} end={period.end} onChange={setPeriod} /><div className="flex justify-end gap-1"><Button size="sm" onClick={async () => { if (!period.start || !period.end) return; await onUpdate({ start_date: period.start, end_date: period.end }); cancel(); }} disabled={isSaving || !period.start || !period.end}>Salvar</Button><Button size="sm" variant="ghost" onClick={cancel}>Cancelar</Button></div></div> : <div className="flex items-center gap-1"><span className="min-w-0 flex-1 whitespace-nowrap text-sm font-medium">{format(startDate, "dd/MM/yyyy", { locale: ptBR })} a {format(endDate, "dd/MM/yyyy", { locale: ptBR })} <span className="text-muted-foreground">({days} dias)</span></span><Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => { setPeriod({ start: trip.start_date, end: trip.end_date }); setEditing("period"); }} aria-label="Editar período"><Pencil className="h-4 w-4" /></Button></div>}</SettingCell>
        <SettingCell label="Quantidade de serviços"><p className="text-sm font-medium">{trip.services?.length || 0}</p></SettingCell>
        <SettingCell label="Quantidade de documentos"><p className="text-sm font-medium">{documentCount}</p></SettingCell>
        <SettingCell label="Status">{controls("status")}</SettingCell>
      </div>
    </section>
  );
}