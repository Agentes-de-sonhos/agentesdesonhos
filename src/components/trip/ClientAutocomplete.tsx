import { useState, useRef, useEffect, forwardRef } from "react";
import { Search, Plus, UserPlus, Cake } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useClients } from "@/hooks/useCRM";
import { CLIENT_STATUS_LABELS } from "@/types/crm";
import type { Client } from "@/types/crm";

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

interface ClientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
}

export function ClientAutocomplete({ value, onChange }: ClientAutocompleteProps) {
  const { clients, createClient, isCreating } = useClients();
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = query.length >= 1
    ? clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const showDropdown = isOpen && query.length >= 1;

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectClient = (client: Client) => {
    onChange(client.name);
    setQuery(client.name);
    setIsOpen(false);
  };

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

  const handleOpenNewClient = () => {
    form.reset({ name: query, email: "", phone: "", city: "", notes: "", status: "lead", travel_preferences: "", internal_notes: "", birthday_day: "", birthday_month: "", birthday_year: "" });
    setShowNewClientDialog(true);
    setIsOpen(false);
  };

  const handleCreateClient = async (data: ClientFormData) => {
    const bDay = data.birthday_day ? parseInt(data.birthday_day) : null;
    const bMonth = data.birthday_month ? parseInt(data.birthday_month) : null;
    const bYear = data.birthday_year ? parseInt(data.birthday_year) : null;

    const result = await createClient({
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
    });

    if (result) {
      onChange(result.name);
      setQuery(result.name);
    }
    setShowNewClientDialog(false);
  };

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente cadastrado..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-9"
          />
        </div>

        {showDropdown && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
            {filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent text-left transition-colors"
                onClick={() => selectClient(client)}
              >
                <div className="flex-1">
                  <p className="font-medium">{client.name}</p>
                  {(client.email || client.city) && (
                    <p className="text-xs text-muted-foreground">
                      {[client.email, client.city].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</p>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent border-t transition-colors"
              onClick={handleOpenNewClient}
            >
              <UserPlus className="h-4 w-4" />
              Cadastrar novo cliente
            </button>
          </div>
        )}
      </div>

      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateClient)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl><Input placeholder="Nome do cliente" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone/WhatsApp</FormLabel>
                    <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl><Input placeholder="São Paulo, SP" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CLIENT_STATUS_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <div className="space-y-2">
                <FormLabel className="flex items-center gap-1.5">
                  <Cake className="h-4 w-4" /> Data de Aniversário
                </FormLabel>
                <div className="grid grid-cols-3 gap-2">
                  <FormField control={form.control} name="birthday_day" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <SelectTrigger><SelectValue placeholder="Dia" /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                              <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="birthday_month" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
                          <SelectContent>
                            {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m, i) => (
                              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="birthday_year" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="number" placeholder="Ano (opcional)" min="1920" max={new Date().getFullYear()} {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>
              <FormField control={form.control} name="travel_preferences" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferências de Viagem</FormLabel>
                  <FormControl><Textarea placeholder="Ex: Prefere praias, viaja em família..." {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl><Textarea placeholder="Anotações sobre o cliente..." {...field} /></FormControl>
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? "Cadastrando..." : "Cadastrar Cliente"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
