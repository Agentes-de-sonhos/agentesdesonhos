import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  Eye,
  DollarSign,
  Plane,
  Clock,
  Cake,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useClients } from "@/hooks/useCRM";
import { useAuth } from "@/hooks/useAuth";
import { ClientProfile } from "./ClientProfile";
import type { Client, ClientStatus } from "@/types/crm";
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS } from "@/types/crm";
import { cn } from "@/lib/utils";
import { ImportContactsDialog } from "./ImportContactsDialog";
import { useQueryClient } from "@tanstack/react-query";

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
  const { clients, isLoading, createClient, updateClient, deleteClient, isCreating } = useClients();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const existingPhones = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => {
      if (c.phone) {
        const digits = c.phone.replace(/\D/g, "");
        if (digits) {
          const normalized = digits.length >= 10 && !digits.startsWith("55") ? "55" + digits : digits;
          map.set(normalized, c.id);
        }
      }
    });
    return map;
  }, [clients]);


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

  const filteredClients = clients
    .filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

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
        category_id: client.category_id || "",
        subcategory_id: client.subcategory_id || "",
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
        category_id: "",
        subcategory_id: "",
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
      category_id: data.category_id || null,
      subcategory_id: data.subcategory_id || null,
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setIsImportOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" /> Importar Contatos
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
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

                {/* Category & Subcategory */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Tag className="h-4 w-4" />
                          Categoria
                        </FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            // Clear subcategory when category changes
                            form.setValue("subcategory_id", "");
                          }}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subcategory_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subcategoria</FormLabel>
                        <SubcategoryCombobox
                          categoryId={watchedCategoryId || null}
                          subcategories={subcategories}
                          value={field.value || null}
                          onChange={(id) => field.onChange(id || "")}
                          onCreateNew={(name, categoryId) => createSubcategory({ name, category_id: categoryId })}
                        />
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
                        <Textarea placeholder="Anotações sobre o cliente..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="internal_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Internas</FormLabel>
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
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Contato</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Cidade</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Categoria</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Subcategoria</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden xl:table-cell">Última interação</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedClient(client)}
                >
                  <td className="py-3 px-4 font-medium">{client.name}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                    <div className="flex flex-col gap-0.5">
                      {client.email && (
                        <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          {client.email}
                        </span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          {client.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{client.city || "—"}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-white text-xs",
                        CLIENT_STATUS_COLORS[client.status as ClientStatus] || "bg-gray-500"
                      )}
                    >
                      {CLIENT_STATUS_LABELS[client.status as ClientStatus] || "Lead"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs hidden lg:table-cell">
                    {client.category_id ? (
                      <Badge variant="outline" className="text-xs">
                        {categoryMap.get(client.category_id) || "—"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs hidden lg:table-cell">
                    {client.subcategory_id ? (
                      <Badge variant="secondary" className="text-xs">
                        {subcategoryMap.get(client.subcategory_id) || "—"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs hidden xl:table-cell">
                    {formatDistanceToNow(new Date(client.last_interaction_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedClient(client)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(client)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(client.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        existingPhones={existingPhones}
        onImportComplete={() => queryClient.invalidateQueries({ queryKey: ["clients"] })}
      />
    </div>
  );
}
