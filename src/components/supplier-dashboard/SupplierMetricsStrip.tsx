import { Card, CardContent } from "@/components/ui/card";
import {
  Eye, Users, FileText, GraduationCap, Mail, Globe,
} from "lucide-react";

const metrics = [
  { icon: Eye, label: "Visualizações do perfil", value: "—" },
  { icon: Globe, label: "Acessos à URL pública", value: "—" },
  { icon: FileText, label: "Materiais publicados", value: "—" },
  { icon: Users, label: "Agentes alcançados", value: "—" },
  { icon: GraduationCap, label: "Treinamentos visualizados", value: "—" },
  { icon: Mail, label: "Contatos recebidos", value: "—" },
];

export function SupplierMetricsStrip() {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4 md:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-border/60 bg-background p-3 hover:border-primary/40 transition-colors"
            >
              <m.icon className="h-4 w-4 text-primary mb-2" />
              <p className="text-[11px] text-muted-foreground leading-tight">{m.label}</p>
              <p className="text-base md:text-lg font-semibold text-foreground mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}