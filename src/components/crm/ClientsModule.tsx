import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Eye,
  Clock,
  Cake,
  Upload,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useClients } from "@/hooks/useCRM";
import {
  useClientsPaged,
  useClientById,
  useClientPhoneIndex,
  useDebouncedValue,
  CLIENTS_DEFAULT_PAGE_SIZE,
  CLIENTS_PAGE_SIZE_OPTIONS,
} from "@/hooks/useClientsPaged";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { ClientProfile } from "./ClientProfile";
import { ClientAvatar } from "@/components/shared/ClientAvatar";
import type { Client, ClientStatus } from "@/types/crm";
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS } from "@/types/crm";
import { cn } from "@/lib/utils";
import { ImportContactsDialog } from "./ImportContactsDialog";
import { useQueryClient } from "@tanstack/react-query";
import { ClientAreaAccessSection } from "@/components/crm/ClientAreaAccessSection";

function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const label = CLIENT_STATUS_LABELS[status] || "Lead";
  const colorClass = CLIENT_STATUS_COLORS[status] || "bg-blue-500";
  // Map tailwind bg class to a softer ring/pill style while preserving the dot color.
  const tone = colorClass.replace("bg-", "").split("-")[0];
  const toneMap: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200/70", dot: "bg-blue-500" },
    yellow: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200/70", dot: "bg-amber-500" },
    green: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200/70", dot: "bg-emerald-500" },
    purple: { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-200/70", dot: "bg-purple-500" },
  };
  const t = toneMap[tone] || toneMap.blue;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", t.bg, t.text, t.ring)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />
      {label}
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
            destructive && "hover:bg-rose-50 hover:text-rose-600"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const clientSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["lead", "em_negociacao", "cliente_ativo", "fidelizado"]),
  travel_preferences: z.string().optional(),
  internal_notes: z.string().optional(),
  birthday_day: z.string().optional(),
  birthday_month: z.string().optional(),
  birthday_year: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export function ClientsModule() {
  const { createClient, updateClient, deleteClient, isCreating } = useClients();
  const { user } = useAuth();
  const { can } = usePermissions();
  const canCreate = can('clients.create');
  const canEdit = can('clients.edit');
  const canDelete = can('clients.delete');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(CLIENTS_DEFAULT_PAGE_SIZE);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const { clients, total, totalPages, isLoading, isFetching, isEmptyAgency } = useClientsPaged({
    search: debouncedSearch,
    status: statusFilter,
    page,
    pageSize,
  });

  // Back to page 1 whenever the result set changes shape.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, pageSize]);

  // Never leave the user stranded on a page beyond the last one (e.g. after a delete).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Auto-open a client profile when URL has ?client=<id> (e.g. from opportunity drawer "Abrir Cliente")
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkId = searchParams.get("client");
  const { data: deepLinkClient } = useClientById(deepLinkId);
  useEffect(() => {
    if (!deepLinkId || !deepLinkClient) return;
    setSelectedClient(deepLinkClient);
    const next = new URLSearchParams(searchParams);
    next.delete("client");
    setSearchParams(next, { replace: true });
  }, [deepLinkId, deepLinkClient, searchParams, setSearchParams]);

  const { data: existingPhones } = useClientPhoneIndex(isImportOpen);


  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      city: "",
      notes: "",
      status: "lead",
      travel_preferences: "",
      internal_notes: "",
      birthday_day: "",
      birthday_month: "",
      birthday_year: "",
    },
  });

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      form.reset({
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
        city: client.city || "",
        notes: client.notes || "",
        status: client.status || "lead",
        travel_preferences: client.travel_preferences || "",
        internal_notes: client.internal_notes || "",
        birthday_day: client.birthday_day?.toString() || "",
        birthday_month: client.birthday_month?.toString() || "",
        birthday_year: client.birthday_year?.toString() || "",
      });
    } else {
      setEditingClient(null);
      form.reset({
        name: "",
        email: "",
        phone: "",
        city: "",
        notes: "",
        status: "lead",
        travel_preferences: "",
        internal_notes: "",
        birthday_day: "",
        birthday_month: "",
        birthday_year: "",
      });
    }
    setIsDialogOpen(true);
  };

  const upsertBirthdayEvent = async (clientId: string, clientName: string, day: number, month: number) => {
    if (!user) return;
    await supabase.from("agency_events")
      .delete()
      .eq("user_id", user.id)
      .eq("client_id", clientId)
      .eq("event_type", "aniversario");

    const now = new Date();
    const currentYear = now.getFullYear();
    const birthdayThisYear = new Date(currentYear, month - 1, day);
    const targetYear = birthdayThisYear < now ? currentYear + 1 : currentYear;
    const eventDate = `${targetYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    await supabase.from("agency_events").insert({
      user_id: user.id,
      client_id: clientId,
      title: `🎂 Aniversário: ${clientName}`,
      event_type: "aniversario",
      event_date: eventDate,
      color: "#ec4899",
    });
  };

  const handleSubmit = async (data: ClientFormData) => {
    const bDay = data.birthday_day ? parseInt(data.birthday_day) : null;
    const bMonth = data.birthday_month ? parseInt(data.birthday_month) : null;
    const bYear = data.birthday_year ? parseInt(data.birthday_year) : null;

    const payload = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      city: data.city || null,
      notes: data.notes || null,
      status: data.status,
      travel_preferences: data.travel_preferences || null,
      internal_notes: data.internal_notes || null,
      birthday_day: bDay,
      birthday_month: bMonth,
      birthday_year: bYear,
    };

    let clientId: string | undefined;
    if (editingClient) {
      await updateClient({ id: editingClient.id, ...payload });
      clientId = editingClient.id;
    } else {
      const result = await createClient(payload);
      clientId = result?.id;
    }

    if (clientId && bDay && bMonth) {
      await upsertBirthdayEvent(clientId, data.name, bDay, bMonth);
    } else if (clientId && !bDay && !bMonth && editingClient) {
      await supabase.from("agency_events")
        .delete()
        .eq("user_id", user!.id)
        .eq("client_id", clientId)
        .eq("event_type", "aniversario");
    }

    setIsDialogOpen(false);
    form.reset();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteClient(deleteId);
      setDeleteId(null);
    }
  };

  if (selectedClient) {
    return (
      <ClientProfile
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
        onEdit={() => {
          handleOpenDialog(selectedClient);
          setSelectedClient(null);
        }}
      />
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canCreate && (
          <Button variant="outline" onClick={() => setIsImportOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Importar Contatos
          </Button>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {canCreate && (
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Novo Cliente
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do cliente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone/WhatsApp</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="São Paulo, SP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <FormLabel className="flex items-center gap-1.5">
                    <Cake className="h-4 w-4" />
                    Data de Aniversário
                  </FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="birthday_day"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <SelectTrigger>
                                <SelectValue placeholder="Dia" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                  <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birthday_month"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <SelectTrigger>
                                <SelectValue placeholder="Mês" />
                              </SelectTrigger>
                              <SelectContent>
                                {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m, i) => (
                                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birthday_year"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="number" placeholder="Ano (opcional)" min="1920" max={new Date().getFullYear()} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="travel_preferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferências de Viagem</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: Prefere praias, viaja em família, classe executiva..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Gerais</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Anotações sobre o cliente (não visíveis ao cliente)..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {editingClient?.internal_notes ? (
                  <FormField
                    control={form.control}
                    name="internal_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações Internas (legado)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notas internas (não visíveis ao cliente)..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {editingClient ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
            {editingClient?.id && (
              <div className="pt-2">
                <ClientAreaAccessSection
                  clientId={editingClient.id}
                  clientName={editingClient.name}
                  clientEmail={editingClient.email}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card className="rounded-2xl border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </Card>
      ) : clients.length === 0 ? (
        <Card className="rounded-2xl border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            {isEmptyAgency ? (
              <>
                <p className="text-sm font-medium text-foreground">Nenhum cliente cadastrado ainda</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Cadastre seu primeiro cliente ou importe seus contatos para começar.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Nenhum resultado encontrado</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Ajuste a busca ou os filtros para ver outros clientes.
                </p>
              </>
            )}
          </div>
        </Card>
      ) : (
        <>
          <Card className="rounded-2xl border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_140px_180px] gap-6 items-center px-5 py-2.5 border-b border-border/60 bg-muted/20 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div>Cliente</div>
              <div>Status</div>
              <div className="justify-self-end pr-1">Ações</div>
            </div>
            <div className="divide-y divide-border/50">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="group grid grid-cols-1 md:grid-cols-[1fr_140px_180px] gap-3 md:gap-6 items-start md:items-center px-4 md:px-5 py-3.5 transition-colors hover:bg-muted/40 cursor-pointer"
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <ClientAvatar name={client.name} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-medium text-foreground truncate text-[14px] leading-5 hover:text-primary transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClient(client);
                        }}
                      >
                        {client.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {client.email && (
                          <span className="inline-flex items-center gap-1 min-w-0">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[180px] sm:max-w-[240px]">{client.email}</span>
                          </span>
                        )}
                        {client.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {client.phone}
                          </span>
                        )}
                        {client.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[140px]">{client.city}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {formatDistanceToNow(new Date(client.last_interaction_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="md:justify-self-start">
                    <ClientStatusBadge status={client.status as ClientStatus} />
                  </div>

                  <div
                    className="flex items-center gap-0.5 md:justify-self-end opacity-100 md:opacity-70 md:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconAction label="Visualizar" onClick={() => setSelectedClient(client)}>
                      <Eye className="h-4 w-4" />
                    </IconAction>
                    {canEdit && (
                      <IconAction label="Editar" onClick={() => handleOpenDialog(client)}>
                        <Pencil className="h-4 w-4" />
                      </IconAction>
                    )}
                    {canDelete && (
                      <IconAction label="Excluir" destructive onClick={() => setDeleteId(client.id)}>
                        <Trash2 className="h-4 w-4" />
                      </IconAction>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <ServerPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            pageSizeOptions={CLIENTS_PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="clientes"
            isFetching={isFetching}
          />
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá o cliente e todas as oportunidades vinculadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportContactsDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        existingPhones={existingPhones ?? new Map()}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["clients"] });
          queryClient.invalidateQueries({ queryKey: ["clients-paged"] });
          queryClient.invalidateQueries({ queryKey: ["clients-total"] });
          queryClient.invalidateQueries({ queryKey: ["clients-phone-index"] });
        }}
      />
    </div>
    </TooltipProvider>
  );
}
