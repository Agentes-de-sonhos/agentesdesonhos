import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Map, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const destinations = [
  { name: "Rio de Janeiro", region: "Sudeste", highlight: true },
  { name: "Salvador", region: "Nordeste", highlight: false },
  { name: "Florianópolis", region: "Sul", highlight: true },
  { name: "Gramado", region: "Sul", highlight: false },
  { name: "Fernando de Noronha", region: "Nordeste", highlight: true },
  { name: "Foz do Iguaçu", region: "Sul", highlight: false },
];

export default function MapaTurismo() {
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary">
              <Map className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Mapa do Turismo
              </h1>
              <p className="text-muted-foreground">
                Explore destinos e informações turísticas
              </p>
            </div>
          </div>
        </div>

        {/* Placeholder Map */}
        <Card className="overflow-hidden shadow-card">
          <CardContent className="p-0">
            <div className="relative h-[400px] bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
              <div className="text-center">
                <Map className="mx-auto h-16 w-16 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Mapa interativo em desenvolvimento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Destinations Grid */}
        <div>
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
            Destinos em Destaque
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((dest) => (
              <Card
                key={dest.name}
                className={`cursor-pointer shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${
                  dest.highlight ? "ring-2 ring-primary/20" : ""
                }`}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{dest.name}</h3>
                    <p className="text-sm text-muted-foreground">{dest.region}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
