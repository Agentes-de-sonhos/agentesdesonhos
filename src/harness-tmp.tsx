// TEMPORARY visual harness — deleted after verification. Not routed in the app.
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { ServiceCategoryGrid } from "@/components/quote/ServiceCategoryGrid";
import { ServiceCard } from "@/components/quote/ServiceCard";
import { QuoteStepsGuide } from "@/components/quote/QuoteStepsGuide";
import { ItineraryEditor } from "@/components/itinerary/ItineraryEditor";
import { EmptyPeriodAISlot } from "@/components/itinerary/ActivityAIActions";

const LONG =
  "Passeio guiado extremamente detalhado com degustacao https://exemplo.com/reservas/atividade/muito-longa-sem-espacos-para-testar-quebra-de-linha?utm_source=teste&utm_campaign=quebra e transporte incluido para todos os passageiros do grupo.";

const service: any = {
  id: "s1",
  service_type: "hotel",
  service_data: { hotel_name: "Hotel Exemplo Muito Longo Nome Teste", city: "Lisboa" },
  amount: 12345.67,
  description: LONG,
  image_urls: [],
  order_index: 0,
};

const days: any[] = [
  {
    id: "d1",
    dayNumber: 1,
    date: "2026-10-01",
    activities: [
      {
        id: "a1",
        period: "manha",
        title: "Visita ao museu nacional com nome bem extenso https://exemplo.com/um-link-sem-espacos-muito-comprido",
        description: LONG,
        location: "Centro",
        estimatedDuration: "3h",
        estimatedCost: "R$ 200",
        orderIndex: 0,
        isApproved: true,
        photoUrl: "https://placehold.co/200x200",
      },
    ],
  },
];

const steps = [1, 2, 3, 4, 5, 6].map((n) => ({
  step: n,
  short: `Etapa ${n} do orçamento`,
  hint: "Dica",
  accentClass: "bg-primary",
}));

const noop = () => {};

function Harness() {
  return (
    <div className="min-h-screen bg-background p-3 space-y-6">
      <QuoteStepsGuide steps={steps} onSelect={noop} />
      <ServiceCategoryGrid onSelect={noop} showAIImport onOpenAIImport={noop} />
      <ServiceCard service={service} onDelete={noop} onEdit={noop} />
      <EmptyPeriodAISlot
        day={days[0]}
        period="tarde"
        context={{ destination: "Lisboa" } as any}
        memory={{} as any}
        onCreate={noop}
      />
      <ItineraryEditor
        days={days}
        onUpdateActivity={noop}
        onDeleteActivity={noop}
        onAddActivity={noop}
        onApproveAll={noop}
      />
    </div>
  );
}

const qc = new QueryClient();
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}>
    <Harness />
  </QueryClientProvider>,
);
