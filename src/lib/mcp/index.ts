import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClientsTool from "./tools/list-clients";
import listQuotesTool from "./tools/list-quotes";
import listTripsTool from "./tools/list-trips";
import listItinerariesTool from "./tools/list-itineraries";

// Direct Supabase host issuer, derived from the project ref (which Vite inlines
// as a literal at build time). Never read from SUPABASE_URL — on Lovable Cloud
// that is the `.lovable.cloud` proxy and would break OAuth discovery.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "agentes-de-sonhos-mcp",
  title: "Agentes de Sonhos",
  version: "0.1.0",
  instructions:
    "Ferramentas do agente de viagens Agentes de Sonhos. Use list_clients para consultar clientes do CRM, list_quotes para orçamentos, list_trips para viagens/carteiras digitais e list_itineraries para roteiros. Todas as ferramentas retornam apenas dados do usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listClientsTool, listQuotesTool, listTripsTool, listItinerariesTool],
});
