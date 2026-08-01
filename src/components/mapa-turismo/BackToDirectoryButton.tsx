import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDirectoryReturn } from "@/hooks/useDirectoryReturn";

interface BackToDirectoryButtonProps {
  /** Categoria real do fornecedor — fallback para acesso direto por link. */
  category?: string | null;
  /** Fallback fixo (ex.: /mapa-turismo/cruzeiros). */
  fallbackPath?: string;
  label?: string;
  variant?: "ghost" | "outline";
  className?: string;
}

/**
 * Botão único de retorno ao Mapa do Turismo, reutilizado por todas as páginas
 * de detalhe (fornecedores, operadoras, guias, cruzeiros e futuras categorias).
 */
export function BackToDirectoryButton({
  category,
  fallbackPath,
  label = "Voltar ao diretório",
  variant = "ghost",
  className,
}: BackToDirectoryButtonProps) {
  const { goBackToDirectory } = useDirectoryReturn({ category, fallbackPath });

  return (
    <Button
      type="button"
      variant={variant}
      onClick={goBackToDirectory}
      aria-label={label}
      className={cn(
        "rounded-xl",
        variant === "ghost" && "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> {label}
    </Button>
  );
}
