import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Presentation, Loader2 } from "lucide-react";
import { StartPresentationData, BRAZILIAN_STATES } from "@/types/promoter-presentation";

const formSchema = z.object({
  agency_name: z.string().min(2, "Nome da agência é obrigatório"),
  agent_name: z.string().min(2, "Nome do agente é obrigatório"),
  agent_email: z.string().email("Email inválido"),
  agent_whatsapp: z.string().min(10, "WhatsApp inválido"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
});

interface StartPresentationModalProps {
  open: boolean;
  onStartPresentation: (data: StartPresentationData) => void;
  isLoading: boolean;
}

export function StartPresentationModal({
  open,
  onStartPresentation,
  isLoading,
}: StartPresentationModalProps) {
  const form = useForm<StartPresentationData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agency_name: "",
      agent_name: "",
      agent_email: "",
      agent_whatsapp: "",
      city: "",
      state: "",
    },
  });

  const onSubmit = (data: StartPresentationData) => {
    onStartPresentation(data);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Presentation className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Iniciar Apresentação</DialogTitle>
              <DialogDescription>
                Preencha os dados do agente para começar a demonstração
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="agency_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Agência</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Viagens & Sonhos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agent_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Agente de Viagens</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agent_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@agencia.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agent_whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="São Paulo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BRAZILIAN_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Presentation className="mr-2 h-4 w-4" />
                  Iniciar Apresentação
                </>
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
