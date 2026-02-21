import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditEntry {
  id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

interface TripEditHistoryProps {
  history: EditEntry[];
}

export function TripEditHistory({ history }: TripEditHistoryProps) {
  if (history.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-4 w-4" /> Histórico de Alterações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-64">
          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{entry.field_changed}</p>
                  {entry.old_value && entry.new_value && (
                    <p className="text-muted-foreground text-xs">
                      {entry.old_value} → {entry.new_value}
                    </p>
                  )}
                  {!entry.old_value && entry.new_value && (
                    <p className="text-muted-foreground text-xs">{entry.new_value}</p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
