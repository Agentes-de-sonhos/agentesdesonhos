import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { ptBR } from "date-fns/locale";
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
import { ClientProfile } from "./ClientProfile";
import type { Client, ClientStatus } from "@/types/crm";
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS } from "@/types/crm";
import { cn } from "@/lib/utils";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  const handleSubmit = async (data: ClientFormData) => {
    const payload = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      city: data.city || null,
      notes: data.notes || null,
      status: data.status,
      travel_preferences: data.travel_preferences || null,
      internal_notes: data.internal_notes || null,
    };
    if (editingClient) {
      await updateClient({ id: editingClient.id, ...payload });
    } else {
      await createClient(payload);
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {client.name}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "mt-1 text-white text-xs",
                        CLIENT_STATUS_COLORS[client.status as ClientStatus] || "bg-gray-500"
                      )}
                    >
                      {CLIENT_STATUS_LABELS[client.status as ClientStatus] || "Lead"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
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
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {client.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{client.city}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(client.last_interaction_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  {client.total_spent && client.total_spent > 0 && (
                    <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(client.total_spent)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
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
    </div>
  );
}
