import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Download, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAcademy } from "@/hooks/useAcademy";

interface MyCertificatesProps {
  onViewCertificate: (certificateId: string) => void;
}

export function MyCertificates({ onViewCertificate }: MyCertificatesProps) {
  const { certificates, trailsWithProgress } = useAcademy();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          Meus Certificados
        </CardTitle>
      </CardHeader>
      <CardContent>
        {certificates.length === 0 ? (
          <div className="text-center py-8">
            <Award className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Você ainda não possui certificados.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Complete uma trilha para obter seu primeiro certificado!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {certificates.map((cert) => {
                const trail = trailsWithProgress.find((t) => t.id === cert.trail_id);
                
                return (
                  <div
                    key={cert.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/50">
                      <Award className="h-6 w-6 text-yellow-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{trail?.name || "Trilha"}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {trail?.destination}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(cert.issued_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nº {cert.certificate_number}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewCertificate(cert.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Ver
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
