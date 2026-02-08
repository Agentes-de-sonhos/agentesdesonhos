import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Calculator } from "@/components/calculator/Calculator";

export default function Calculadora() {
  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-1">
              🧮 Calculadora
            </h1>
            <p className="text-muted-foreground">
              Cálculos rápidos integrados ao seu sistema
            </p>
          </div>

          <div className="h-[calc(100vh-12rem)]">
            <Calculator />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
