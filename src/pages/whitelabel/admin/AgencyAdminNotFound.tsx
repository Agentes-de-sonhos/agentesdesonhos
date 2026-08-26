import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AGENCY_ADMIN_HOME } from "@/lib/agencyAdmin";

/**
 * Rota administrativa desconhecida dentro do painel da agência. Nunca
 * redireciona silenciosamente para a Home: o erro de navegação fica visível,
 * com identidade da agência e um caminho claro de volta.
 */
export default function AgencyAdminNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16 text-center">
      <div className="max-w-md space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Compass className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          O endereço acessado não existe no painel de gestão. Verifique o link ou volte ao início.
        </p>
        <Button asChild className="mt-2">
          <Link to={AGENCY_ADMIN_HOME}>Voltar ao Início</Link>
        </Button>
      </div>
    </div>
  );
}
