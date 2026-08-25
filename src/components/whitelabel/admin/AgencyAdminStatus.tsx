import { Loader2 } from "lucide-react";

/**
 * Estado neutro de carregamento do painel white label. Propositalmente sem
 * nenhuma marca: enquanto o domínio é resolvido, nem o logotipo da agência
 * nem qualquer referência à plataforma podem aparecer.
 */
export function AgencyAdminLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

/** Domínio sem painel habilitado (ou inexistente): resposta genérica. */
export function AgencyAdminUnavailable() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Página indisponível</h1>
        <p className="text-sm text-muted-foreground">
          Este endereço não está disponível. Verifique o link recebido ou fale com o responsável
          pela sua agência.
        </p>
      </div>
    </div>
  );
}
