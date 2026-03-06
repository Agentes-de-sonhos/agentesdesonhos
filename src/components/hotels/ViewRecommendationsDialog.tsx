import { MessageSquare, Building2, User } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useHotelRecommendations } from "@/hooks/useHotelRecommendations";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotelId: string;
  hotelName: string;
}

export function ViewRecommendationsDialog({ open, onOpenChange, hotelId, hotelName }: Props) {
  const { data: recs, isLoading } = useHotelRecommendations(hotelId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Recomendações – {hotelName}
          </DialogTitle>
          <DialogDescription>
            Veja quem recomendou este hotel e os motivos.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : recs && recs.length > 0 ? (
          <div className="space-y-3">
            {recs.map((rec) => (
              <div key={rec.id} className="rounded-lg border border-border/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{rec.profile_name}</span>
                  {rec.agency_name && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{rec.agency_name}</span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{rec.reason}</p>
                <p className="text-xs text-muted-foreground/60">
                  {new Date(rec.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma recomendação aprovada ainda.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
