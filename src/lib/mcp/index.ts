import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClientsTool from "./tools/list-clients";
import listQuotesTool from "./tools/list-quotes";
import listTripsTool from "./tools/list-trips";
import listItinerariesTool from "./tools/list-itineraries";
import adminPlatformMetricsTool from "./tools/admin-platform-metrics";
import adminUsersCountByPlanTool from "./tools/admin-users-count-by-plan";
import adminListPremiumUsersTool from "./tools/admin-list-premium-users";
import adminSubscriptionMetricsTool from "./tools/admin-subscription-metrics";
import adminNewUsersByPeriodTool from "./tools/admin-new-users-by-period";
import adminActiveAgenciesTool from "./tools/admin-active-agencies";

// Direct Supabase host issuer, derived from the project ref (which Vite inlines
// as a literal at build time). Never read from SUPABASE_URL — on Lovable Cloud
// that is the `.lovable.cloud` proxy and would break OAuth discovery.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "agentes-de-sonhos-mcp",
  title: "Agentes de Sonhos",
  version: "0.1.0",
  instructions:
    "Ferramentas do agente de viagens Agentes de Sonhos. Use list_clients, list_quotes, list_trips e list_itineraries para dados do próprio usuário. Ferramentas administrativas (prefixo get_/list_ com sufixo platform/premium/subscription/agencies) são restritas a administradores e retornam métricas gerais da plataforma.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listClientsTool,
    listQuotesTool,
    listTripsTool,
    listItinerariesTool,
    adminPlatformMetricsTool,
    adminUsersCountByPlanTool,
    adminListPremiumUsersTool,
    adminSubscriptionMetricsTool,
    adminNewUsersByPeriodTool,
    adminActiveAgenciesTool,
  ],
});
