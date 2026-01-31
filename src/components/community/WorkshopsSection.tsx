import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Play, FileText, Clock, User } from "lucide-react";
import type { ProfessionalWorkshop, WorkshopCategory } from "@/types/community";
import { WORKSHOP_CATEGORIES } from "@/types/community";

interface WorkshopsSectionProps {
  workshops: ProfessionalWorkshop[];
  getWorkshopsByCategory: (category: WorkshopCategory) => ProfessionalWorkshop[];
}

export function WorkshopsSection({ workshops, getWorkshopsByCategory }: WorkshopsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<WorkshopCategory>("contabilidade");

  const filteredWorkshops = getWorkshopsByCategory(activeCategory);

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary" />
        Especialistas & Workshops Profissionais
      </h2>

      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as WorkshopCategory)}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full mb-4">
          {WORKSHOP_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="text-xs md:text-sm">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {WORKSHOP_CATEGORIES.map((cat) => (
          <TabsContent key={cat.value} value={cat.value}>
            {getWorkshopsByCategory(cat.value).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum conteúdo disponível nesta categoria.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getWorkshopsByCategory(cat.value).map((workshop) => (
                  <Card key={workshop.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{workshop.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {workshop.instructor && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{workshop.instructor}</span>
                        </div>
                      )}
                      {workshop.duration_minutes && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{workshop.duration_minutes} minutos</span>
                        </div>
                      )}
                      {workshop.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {workshop.description}
                        </p>
                      )}
                      <div className="flex gap-2 pt-2">
                        {workshop.video_url && (
                          <Button
                            size="sm"
                            onClick={() => window.open(workshop.video_url!, "_blank")}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Assistir
                          </Button>
                        )}
                        {workshop.materials_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(workshop.materials_url!, "_blank")}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Material
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
