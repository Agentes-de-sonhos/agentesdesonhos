import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReservasTab } from "@/components/reservas/ReservasTab";

/**
 * Central de Reservas na plataforma tradicional. Usa exatamente o mesmo
 * componente de lista dos painéis das agências (Sites ADS/gestão), para que a
 * ficha de cada venda seja a mesma em qualquer ambiente.
 */
export default function CentralReservas() {
  return (
    <DashboardLayout>
      <div className="w-full min-w-0 space-y-4 px-3 py-4 md:px-6 md:py-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground md:text-2xl">Central de Reservas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A ficha de cada venda: quem contratou, a viagem, os serviços e o andamento.
          </p>
        </div>
        <ReservasTab />
      </div>
    </DashboardLayout>
  );
}
