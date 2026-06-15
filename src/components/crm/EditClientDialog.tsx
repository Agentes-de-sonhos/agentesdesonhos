import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Cake } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InternationalPhoneInput } from "@/components/ui/international-phone-input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClients } from "@/hooks/useCRM";
import { CLIENT_STATUS_LABELS, type Client } from "@/types/crm";

const clientSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["lead", "em_negociacao", "cliente_ativo", "fidelizado"]).optional(),
  travel_preferences: z.string().optional(),
  internal_notes: z.string().optional(),
  birthday_day: z.string().optional(),
  birthday_month: z.string().optional(),
  birthday_year: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface Props {
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditClientDialog({ clientId, open, onOpenChange }: Props) {
  const { clients, updateClient } = useClients();
  const { user } = useAuth();
  const client = clients.find((c) => c.id === clientId) || null;

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

  useEffect(() => {
    if (client && open) {
      form.reset({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        city: client.city || "",
        notes: client.notes || "",
        status: (client.status as any) || "lead",
        travel_preferences: client.travel_preferences || "",
        internal_notes: client.internal_notes || "",
        birthday_day: client.birthday_day?.toString() || "",
        birthday_month: client.birthday_month?.toString() || "",
        birthday_year: client.birthday_year?.toString() || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id, open]);

  const onSubmit = async (data: ClientFormData) => {
    if (!client) return;
    const bDay = data.birthday_day ? parseInt(data.birthday_day) : null;
    const bMonth = data.birthday_month ? parseInt(data.birthday_month) : null;
    const bYear = data.birthday_year ? parseInt(data.birthday_year) : null;
    await updateClient({
      id: client.id,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      city: data.city || null,
      notes: data.notes || null,
      status: data.status || "lead",
      travel_preferences: data.travel_preferences || null,
      internal_notes: data.internal_notes || null,
      birthday_day: bDay,
      birthday_month: bMonth,
      birthday_year: bYear,
    });
    if (user) {
      await supabase
        .from("agency_events")
        .delete()
        .eq("user_id", user.id)
        .eq("client_id", client.id)
        .eq("event_type", "aniversario");
      if (bDay && bMonth) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const birthdayThisYear = new Date(currentYear, bMonth - 1, bDay);
        const targetYear = birthdayThisYear < now ? currentYear + 1 : currentYear;
        const eventDate = `${targetYear}-${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`;
        await supabase.from("agency_events").insert({
          user_id: user.id,
          client_id: client.id,
          title: `🎂 Aniversário: ${data.name}`,
          event_type: "aniversario",
          event_date: eventDate,
          color: "#ec4899",
        });
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormControl>
                    <InternationalPhoneInput value={field.value} onChange={(v) => field.onChange(v ?? "")} placeholder="Número de telefone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl><Input placeholder="São Paulo, SP" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="space-y-2">
              <FormLabel className="flex items-center gap-1.5"><Cake className="h-4 w-4" />Data de Aniversário</FormLabel>
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
                      <Input type="number" placeholder="Ano (opcional)" min={1920} max={new Date().getFullYear()} {...field} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
            </div>
            <FormField control={form.control} name="travel_preferences" render={({ field }) => (
              <FormItem>
                <FormLabel>Preferências de Viagem</FormLabel>
                <FormControl><Textarea placeholder="Ex: Prefere praias, viaja em família..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações Gerais</FormLabel>
                <FormControl><Textarea placeholder="Anotações sobre o cliente (não visíveis ao cliente)..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {client?.internal_notes ? (
              <FormField control={form.control} name="internal_notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Internas (legado)</FormLabel>
                  <FormControl><Textarea placeholder="Notas internas (não visíveis ao cliente)..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>Salvar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}