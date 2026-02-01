import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Presentation, X, Building2, User } from "lucide-react";
import { PromoterPresentation } from "@/types/promoter-presentation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PresentationModeBarProps {
  presentation: PromoterPresentation;
  onEndPresentation: () => void;
  isEnding: boolean;
}

export function PresentationModeBar({
  presentation,
  onEndPresentation,
  isEnding,
}: PresentationModeBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground py-2 px-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Presentation className="h-4 w-4" />
          <span className="font-medium text-sm">Modo Apresentação</span>
        </div>
        
        <div className="hidden sm:flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span>{presentation.agency_name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span>{presentation.agent_name}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
          {presentation.city}/{presentation.state}
        </Badge>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Encerrar</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar Apresentação?</AlertDialogTitle>
              <AlertDialogDescription>
                Ao encerrar, todos os limites de uso serão reiniciados para a próxima apresentação.
                Os dados desta apresentação serão salvos no histórico.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onEndPresentation} disabled={isEnding}>
                {isEnding ? "Encerrando..." : "Encerrar Apresentação"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
