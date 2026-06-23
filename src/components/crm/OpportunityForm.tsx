import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDateSafe } from "@/lib/dateParsing";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useClients, useOpportunities } from "@/hooks/useCRM";
import { useOpportunityFollowups, type FollowupDraft } from "@/hooks/useOpportunityFollowups";
import type { Opportunity } from "@/types/crm";
import { ClientSelector } from "@/components/shared/ClientSelector";

const opportunitySchema = z.object({
  client_id: z.string().min(1, "Selecione um cliente"),
  destination: z.string().min(2, "Destino é obrigatório"),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  adults_count: z.number().min(1, "Mínimo 1 adulto"),
  children_count: z.number().min(0, "Não pode ser negativo"),
  estimated_value: z.number().min(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof opportunitySchema>;

interface OpportunityFormProps {
  opportunity?: Opportunity;
  onSuccess: () => void;
  onCancel: () => void;
}

export function OpportunityForm({ opportunity, onSuccess, onCancel }: OpportunityFormProps) {
  const { clients } = useClients();
  const { createOpportunity, updateOpportunity, isCreating } = useOpportunities();
  const { followups: existingFollowups, syncFollowups, isSyncing } =
    useOpportunityFollowups(opportunity?.id);

  const [followupDrafts, setFollowupDrafts] = useState<FollowupDraft[]>([]);

  useEffect(() => {
    if (opportunity?.id) {
      if (existingFollowups.length > 0) {
        setFollowupDrafts(
          existingFollowups.map((f) => ({
            id: f.id,
            follow_up_date: f.follow_up_date,
            note: f.note || "",
          }))
        );
      } else if (opportunity.follow_up_date) {
        // Legacy single follow-up date — preload as first draft (no id, will be created)
        setFollowupDrafts([{ follow_up_date: opportunity.follow_up_date, note: "" }]);
      }
    }
  }, [opportunity?.id, existingFollowups.length]);

  const form = useForm<FormData>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      client_id: opportunity?.client_id || "",
      destination: opportunity?.destination || "",
      start_date: parseLocalDateSafe(opportunity?.start_date) || undefined,
      end_date: parseLocalDateSafe(opportunity?.end_date) || undefined,
      adults_count: opportunity?.adults_count ?? opportunity?.passengers_count ?? 1,
      children_count: opportunity?.children_count ?? 0,
      estimated_value: opportunity?.estimated_value || 0,
      notes: opportunity?.notes || "",
    },
  });

  const handleSubmit = async (data: FormData) => {
    const totalPassengers = (data.adults_count || 0) + (data.children_count || 0);
    const validDrafts = followupDrafts.filter((d) => d.follow_up_date);
    const firstDate = validDrafts[0]?.follow_up_date;
    const payload = {
      client_id: data.client_id,
      destination: data.destination,
      start_date: data.start_date ? format(data.start_date, "yyyy-MM-dd") : undefined,
      end_date: data.end_date ? format(data.end_date, "yyyy-MM-dd") : undefined,
      adults_count: data.adults_count,
      children_count: data.children_count,
      passengers_count: totalPassengers,
      estimated_value: data.estimated_value,
      notes: data.notes,
      // Keep the legacy single-date column in sync with the earliest follow-up,
      // so existing card badges and queries keep working.
      follow_up_date: firstDate,
    };

    let opportunityId = opportunity?.id;
    if (opportunity) {
      await updateOpportunity({ id: opportunity.id, ...payload });
    } else {
      const created: any = await new Promise((resolve, reject) => {
        createOpportunity(payload, {
          onSuccess: (res: any) => resolve(res),
          onError: (err: any) => reject(err),
        } as any);
      });
      opportunityId = created?.id;
    }

    if (opportunityId) {
      await syncFollowups({ opportunity_id: opportunityId, drafts: validDrafts });
    }
    onSuccess();
  };

  const addFollowup = () => {
    setFollowupDrafts((prev) => [...prev, { follow_up_date: "", note: "" }]);
  };

  const updateDraft = (index: number, patch: Partial<FollowupDraft>) => {
    setFollowupDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const removeDraft = (index: number) => {
    setFollowupDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 -mr-1">

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Cliente *</FormLabel>
                <FormControl>
                  <ClientSelector
                    value={
                      field.value
                        ? {
                            id: field.value,
                            name:
                              clients.find((c) => c.id === field.value)?.name || "",
                          }
                        : null
                    }
                    onChange={(client) => field.onChange(client?.id || "")}
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Destino *</FormLabel>
                <FormControl>
                  <Input placeholder="Paris, França" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Início</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Fim</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="adults_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adultos</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="children_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Crianças</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estimated_value"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Valor Estimado (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0"
                    value={field.value === 0 || field.value === undefined ? "" : field.value}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === "" ? 0 : parseFloat(v) || 0);
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <FormLabel className="text-sm">Follow-ups</FormLabel>
            <Button type="button" variant="outline" size="sm" onClick={addFollowup}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
            </Button>
          </div>

          {followupDrafts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhum follow-up. Clique em "Adicionar" para programar lembretes para este cliente.
            </p>
          ) : (
            followupDrafts.map((draft, index) => {
              const parsedDate = draft.follow_up_date
                ? (() => {
                    const [y, m, d] = draft.follow_up_date.split("-").map(Number);
                    return new Date(y, (m || 1) - 1, d || 1);
                  })()
                : undefined;
              return (
                <div key={index} className="space-y-2 rounded-md border bg-background p-3">
                  <div className="flex items-start gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "flex-1 pl-3 text-left font-normal",
                            !parsedDate && "text-muted-foreground"
                          )}
                        >
                          {parsedDate
                            ? format(parsedDate, "dd/MM/yyyy", { locale: ptBR })
                            : "Selecione a data"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={parsedDate}
                          onSelect={(d) =>
                            updateDraft(index, {
                              follow_up_date: d ? format(d, "yyyy-MM-dd") : "",
                            })
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDraft(index)}
                      aria-label="Remover follow-up"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="O que será feito neste follow-up?"
                    value={draft.note}
                    onChange={(e) => updateDraft(index, { note: e.target.value })}
                    rows={2}
                  />
                </div>
              );
            })
          )}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Notas sobre a oportunidade..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        </div>

        <div className="flex justify-end gap-2 pt-3 mt-2 border-t bg-background">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isCreating || isSyncing}>
            {opportunity ? "Salvar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

