import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DIRECTORY_ROOT } from "@/lib/directoryNavigation";

/**
 * Botão compartilhado "Mapa do Turismo" das listagens isoladas.
 * Sempre volta para a home neutra: sem categoria, sem filtros, sem seleção.
 */
export function BackToDirectoryHomeButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Voltar para o Mapa do Turismo"
      onClick={() => navigate(DIRECTORY_ROOT)}
      className={cn("gap-1 text-muted-foreground hover:text-foreground", className)}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mapa do Turismo
    </Button>
  );
}