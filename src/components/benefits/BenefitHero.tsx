import { Tag, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BenefitHeroProps {
  onShareClick: () => void;
}

export function BenefitHero({ onShareClick }: BenefitHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-8 md:p-12 text-primary-foreground">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-60" />
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
              <Tag className="h-7 w-7" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Benefícios e Descontos
            </h1>
          </div>
          <p className="text-primary-foreground/85 text-lg max-w-xl">
            Descubra tarifas agente, cortesias e descontos exclusivos oferecidos por empresas do turismo. Compartilhe e confirme benefícios com a comunidade.
          </p>
        </div>
        <Button
          onClick={onShareClick}
          size="lg"
          className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-primary-foreground border border-white/25 shadow-lg shrink-0"
        >
          <Share2 className="h-5 w-5 mr-2" />
          Compartilhar benefício
        </Button>
      </div>
    </div>
  );
}
