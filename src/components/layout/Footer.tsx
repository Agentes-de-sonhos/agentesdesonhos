import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import { PLATFORM_NAME, PLATFORM_VERSION_FULL } from "@/lib/platform-version";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Footer() {
  return (
    <footer className="w-full py-4 mt-auto border-t border-border/40">
      <div className="container flex flex-col items-center gap-2">
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <p className="text-[11px] text-muted-foreground/50 flex items-center gap-1 cursor-help select-none">
              <Info className="h-3 w-3 shrink-0" />
              <span>Informações colaborativas. Recomendamos validação antes de qualquer decisão.</span>
            </p>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs text-center leading-relaxed">
            As informações e recomendações disponibilizadas nesta plataforma possuem caráter meramente informativo, podendo ser fornecidas por terceiros. A plataforma não se responsabiliza por sua veracidade, precisão ou atualização, cabendo ao agente a devida validação prévia antes de qualquer tomada de decisão.
          </TooltipContent>
        </Tooltip>
        <p className="text-xs text-muted-foreground/60">
          {PLATFORM_NAME} •{" "}
          <Link to="/atualizacoes" className="hover:text-primary transition-colors">
            Versão {PLATFORM_VERSION_FULL}
          </Link>
        </p>
        <p className="text-[10px] text-muted-foreground/50">
          Desenvolvido por{" "}
          <span className="font-medium text-muted-foreground/70">Nobre Digital</span>
        </p>
      </div>
    </footer>
  );
}
