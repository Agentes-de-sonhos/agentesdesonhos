import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Rocket, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORM_VERSION_FULL } from "@/lib/platform-version";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlatformUpdate {
  id: string;
  version: string;
  title: string;
  description: string;
  release_date: string;
  created_at: string;
}

export default function Atualizacoes() {
  const { data: updates, isLoading } = useQuery({
    queryKey: ["platform-updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_updates")
        .select("*")
        .order("release_date", { ascending: false });
      if (error) throw error;
      return data as PlatformUpdate[];
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          pageKey="atualizacoes"
          title="Atualizações da Plataforma"
          subtitle="Acompanhe a evolução e as novidades da Agentes de Sonhos"
          icon={Rocket}
        />

        {/* Current version badge */}
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm px-4 py-1.5 font-semibold">
            Versão atual: {PLATFORM_VERSION_FULL}
          </Badge>
        </div>

        {/* Updates timeline */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="relative space-y-6">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-8 bottom-8 w-px bg-border hidden md:block" />

            {updates?.map((update, index) => (
              <div key={update.id} className="relative flex gap-4 md:gap-6">
                {/* Timeline dot */}
                <div className="hidden md:flex flex-col items-center pt-6">
                  <div className={`w-3 h-3 rounded-full z-10 ${index === 0 ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/30"}`} />
                </div>

                <Card className={`flex-1 border-0 shadow-md ${index === 0 ? "ring-1 ring-primary/20" : ""}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={index === 0 ? "default" : "secondary"}
                          className="text-xs font-bold"
                        >
                          v{update.version}
                        </Badge>
                        <h3 className="font-bold text-lg text-foreground">{update.title}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {format(new Date(update.release_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      {update.description}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        {updates && updates.length === 0 && (
          <div className="text-center py-12">
            <Rocket className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma atualização registrada ainda.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
