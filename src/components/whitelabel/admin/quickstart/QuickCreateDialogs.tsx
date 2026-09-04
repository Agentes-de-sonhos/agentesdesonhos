/**
 * Pop-ups de criação usados pelos atalhos do painel da agência / SiteLab.
 *
 * Cada diálogo REUTILIZA o formulário inicial real e o hook de criação real das
 * páginas correspondentes (Gerar Orçamento, Criar Roteiro, Carteira Digital).
 * Nenhuma validação ou regra de negócio é duplicada aqui: apenas o invólucro
 * responsivo e o retorno do registro criado.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { QuoteClientForm } from "@/components/quote/QuoteClientForm";
import { ItineraryForm } from "@/components/itinerary/ItineraryForm";
import { TripForm } from "@/components/trip/TripForm";
import { useQuotes } from "@/hooks/useQuotes";
import { useItineraries } from "@/hooks/useItineraries";
import { useTrips } from "@/hooks/useTrips";
import type { QuoteFormData } from "@/types/quote";
import type { ItineraryFormData } from "@/types/itinerary";
import type { TripFormData } from "@/types/trip";

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

function Shell({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function QuickCreateQuoteDialog({ open, onOpenChange, onCreated }: BaseProps) {
  const { createQuote } = useQuotes();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (formData: QuoteFormData) => {
    setSaving(true);
    try {
      const quote = await createQuote(formData);
      onOpenChange(false);
      onCreated(quote.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar orçamento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title="Novo orçamento"
      description="Informe os dados iniciais. O orçamento abre em seguida para você continuar."
    >
      <QuoteClientForm onSubmit={handleSubmit} isLoading={saving} />
    </Shell>
  );
}

export function QuickCreateItineraryDialog({ open, onOpenChange, onCreated }: BaseProps) {
  const { createItineraryWithAI } = useItineraries();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: ItineraryFormData) => {
    setSaving(true);
    try {
      const itinerary = await createItineraryWithAI(data);
      onOpenChange(false);
      toast.success("Roteiro gerado com sucesso!");
      onCreated(itinerary.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar roteiro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title="Novo roteiro"
      description="Informe os dados iniciais. O roteiro abre em seguida para você continuar."
    >
      <ItineraryForm onSubmit={handleSubmit} isLoading={saving} />
    </Shell>
  );
}

export function QuickCreateWalletDialog({ open, onOpenChange, onCreated }: BaseProps) {
  const { createTrip } = useTrips();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: TripFormData) => {
    setSaving(true);
    try {
      const trip = await createTrip(data);
      onOpenChange(false);
      onCreated(trip.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar carteira digital");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title="Nova carteira digital"
      description="Informe os dados iniciais. A carteira abre em seguida para você continuar."
    >
      <TripForm onSubmit={handleSubmit} isLoading={saving} />
    </Shell>
  );
}
