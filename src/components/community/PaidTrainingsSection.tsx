import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Building2, DollarSign, ExternalLink } from "lucide-react";
import type { PaidTraining } from "@/types/community";

interface PaidTrainingsSectionProps {
  trainings: PaidTraining[];
}

export function PaidTrainingsSection({ trainings }: PaidTrainingsSectionProps) {
  if (trainings.length === 0) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Oportunidades de Treinamentos Remunerados
        </h2>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma oportunidade de treinamento remunerado disponível no momento.
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-primary" />
        Oportunidades de Treinamentos Remunerados
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trainings.map((training) => (
          <Card key={training.id} className="overflow-hidden hover:shadow-lg transition-shadow border-primary/20">
            {training.image_url && (
              <div className="h-32 overflow-hidden">
                <img
                  src={training.image_url}
                  alt={training.topic}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{training.topic}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <Badge variant="secondary">{training.partner_company}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">{training.compensation}</span>
              </div>
              {training.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {training.description}
                </p>
              )}
              <Button
                className="w-full mt-2"
                onClick={() => training.apply_url && window.open(training.apply_url, "_blank")}
                disabled={!training.apply_url}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Participar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
