import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowLeft, ArrowRight, Loader2, Search } from "lucide-react";
import { PassengerStep } from "@/components/travel-requirements/PassengerStep";
import { TripStep } from "@/components/travel-requirements/TripStep";
import { RequirementsResult } from "@/components/travel-requirements/RequirementsResult";
import { useTravelRequirements } from "@/hooks/useTravelRequirements";
import { toast } from "sonner";
import type { PassengerData, TripData } from "@/types/travelRequirements";
import { cn } from "@/lib/utils";

const initialPassenger: PassengerData = {
  full_name: "",
  birth_date: "",
  nationality: "Brasileira",
  country_of_residence: "Brasil",
  passport_issuer: "Brasil",
  has_passport: true,
  passport_number: "",
  passport_expiry: "",
  existing_visas: "",
  is_minor: false,
  unaccompanied_minor: false,
};

const initialTrip: TripData = {
  destination_country: "",
  destination_city: "",
  departure_date: "",
  return_date: "",
  airline: "",
  trip_type: "turismo",
  has_international_connection: false,
  connections: [],
};

function Inner() {
  const [step, setStep] = useState<1 | 2>(1);
  const [passenger, setPassenger] = useState<PassengerData>(initialPassenger);
  const [trip, setTrip] = useState<TripData>(initialTrip);
  const { consult, loading, data, reset } = useTravelRequirements();

  const validatePassenger = () => {
    if (!passenger.full_name.trim()) return "Informe o nome do passageiro";
    if (!passenger.birth_date) return "Informe a data de nascimento";
    if (!passenger.nationality.trim()) return "Informe a nacionalidade";
    if (!passenger.country_of_residence.trim()) return "Informe o país de residência";
    return null;
  };
  const validateTrip = () => {
    if (!trip.destination_country.trim()) return "Informe o país de destino";
    if (!trip.destination_city.trim()) return "Informe a cidade de destino";
    if (!trip.departure_date) return "Informe a data de ida";
    return null;
  };

  const handleNext = () => {
    const err = validatePassenger();
    if (err) { toast.error(err); return; }
    setStep(2);
  };

  const handleSubmit = async () => {
    const err = validateTrip();
    if (err) { toast.error(err); return; }
    try {
      await consult(passenger, trip);
    } catch { /* toast já exibido */ }
  };

  const handleReset = () => {
    reset();
    setStep(1);
    setPassenger(initialPassenger);
    setTrip(initialTrip);
  };

  if (data?.result) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeader
            pageKey="requisitos-viagem"
            title="Central de Requisitos de Viagem"
            subtitle="Análise de elegibilidade de embarque"
            icon={ShieldCheck}
          />
          <RequirementsResult
            result={data.result}
            passengerName={passenger.full_name}
            destination={`${trip.destination_city}, ${trip.destination_country}`}
            onReset={handleReset}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          pageKey="requisitos-viagem"
          title="Central de Requisitos de Viagem"
          subtitle="Verifique se o passageiro está apto para embarcar antes da viagem"
          icon={ShieldCheck}
        />

        {/* Stepper */}
        <div className="flex items-center gap-3">
          <StepBadge n={1} label="Passageiro" active={step === 1} done={step > 1} />
          <div className="h-px flex-1 bg-border" />
          <StepBadge n={2} label="Viagem" active={step === 2} done={false} />
        </div>

        {step === 1 ? (
          <PassengerStep data={passenger} onChange={setPassenger} />
        ) : (
          <TripStep data={trip} onChange={setTrip} />
        )}

        <div className="flex justify-between gap-3">
          {step === 2 ? (
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          ) : <span />}
          {step === 1 ? (
            <Button onClick={handleNext} className="gap-2 ml-auto">
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="gap-2 ml-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Verificar requisitos da viagem
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StepBadge({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
          done ? "bg-emerald-600 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {n}
      </div>
      <span className={cn("text-sm", active ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}

export default function RequisitosViagem() {
  return (
    <SubscriptionGuard feature="travel_requirements">
      <Inner />
    </SubscriptionGuard>
  );
}