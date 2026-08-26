import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { FileText, Loader2, Map, Users, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { brandAccent, type AgencyAdminPortalInfo } from "@/lib/agencyAdmin";

/**
 * Home do painel administrativo white label.
 *
 * Diferente da home da plataforma, esta tela contém APENAS blocos
 * operacionais. Comunidade, Academy, Notícias do Trade e gamificação ficam
 * fora do escopo do painel da agência (Etapa 1) e por isso a home da
 * plataforma não é reutilizada aqui.
 */
const UpcomingAgendaEventsCard = lazy(() =>
  import("@/components/dashboard/UpcomingAgendaEventsCard").then((m) => ({
    default: m.UpcomingAgendaEventsCard,
  })),
);
const TripRemindersCard = lazy(() =>
  import("@/components/dashboard/TripRemindersCard").then((m) => ({
    default: m.TripRemindersCard,
  })),
);
const LeadsAwaitingCard = lazy(() =>
  import("@/components/dashboard/LeadsAwaitingCard").then((m) => ({
    default: m.LeadsAwaitingCard,
  })),
);

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const SHORTCUTS = [
  { label: "Novo orçamento", to: "/gestao/criar/orcamento", icon: FileText },
  { label: "Nova carteira digital", to: "/gestao/criar/carteira", icon: Wallet },
  { label: "Novo roteiro", to: "/gestao/criar/roteiro", icon: Map },
  { label: "Clientes", to: "/gestao/crm/clientes", icon: Users },
];

export default function AgencyAdminHome({ info }: { info: AgencyAdminPortalInfo }) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const brand = brandAccent(info.primary_color);
  // Mesma fonte de nome usada pelo shell (profiles.name), com fallback vazio.
  const { data: profileName } = useQuery({
    queryKey: ["agency-admin-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data as { name: string | null; avatar_url: string | null } | null);
    },
  });
  const firstName = (profileName?.name || "").trim().split(" ")[0] || "";

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aqui está o resumo operacional da sua agência.
        </p>
      </header>

      {/* Atalhos de criação */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SHORTCUTS.map(({ label, to, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/60"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: brand.tint, color: brand.accent }}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-foreground">{label}</span>
          </Link>
        ))}
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        {/* Leads aguardando atendimento — respeita a permissão de oportunidades. */}
        {can("opportunities.view") && <LeadsAwaitingCard />}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0">
            <UpcomingAgendaEventsCard />
          </div>
          <div className="min-w-0">
            <TripRemindersCard />
          </div>
        </div>
      </Suspense>
    </div>
  );
}
