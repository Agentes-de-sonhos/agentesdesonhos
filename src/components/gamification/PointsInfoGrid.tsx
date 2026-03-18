import { Badge } from "@/components/ui/badge";
import { POINTS_CONFIG } from "@/lib/gamification";

const CATEGORIES = [
  {
    title: "Engajamento",
    icon: "🔑",
    items: [
      { label: "Login diário", points: POINTS_CONFIG.daily_login },
      { label: "Acessar Notícias", points: POINTS_CONFIG.access_news_page },
      { label: "Ler notícia", points: POINTS_CONFIG.read_news },
      { label: "Navegar menu", points: POINTS_CONFIG.menu_visit },
    ],
  },
  {
    title: "EducaTravel Academy",
    icon: "🎓",
    items: [
      { label: "Iniciar trilha", points: POINTS_CONFIG.start_trail },
      { label: "Concluir módulo", points: POINTS_CONFIG.complete_module },
      { label: "Concluir trilha", points: POINTS_CONFIG.complete_trail },
      { label: "Certificado", points: POINTS_CONFIG.earn_certificate },
    ],
  },
  {
    title: "Orçamentos",
    icon: "📋",
    items: [
      { label: "Criar orçamento", points: POINTS_CONFIG.create_quote },
      { label: "Finalizar orçamento", points: POINTS_CONFIG.finalize_quote },
      { label: "Enviar orçamento", points: POINTS_CONFIG.send_quote },
      { label: "Atualizar orçamento", points: POINTS_CONFIG.update_quote },
    ],
  },
  {
    title: "CRM / Pipeline",
    icon: "📊",
    items: [
      { label: "Criar cliente", points: POINTS_CONFIG.create_client },
      { label: "Criar oportunidade", points: POINTS_CONFIG.create_opportunity },
      { label: "Mover etapa do funil", points: POINTS_CONFIG.move_pipeline_stage },
      { label: "Orçamento enviado", points: POINTS_CONFIG.reach_quote_sent },
    ],
  },
  {
    title: "Conteúdo & Vitrine",
    icon: "✍️",
    items: [
      { label: "Gerar conteúdo IA", points: POINTS_CONFIG.generate_content },
      { label: "Usar material", points: POINTS_CONFIG.use_material },
      { label: "Criar vitrine", points: POINTS_CONFIG.create_showcase },
      { label: "Adicionar lâmina", points: POINTS_CONFIG.add_showcase_item },
    ],
  },
  {
    title: "Comunidade",
    icon: "💬",
    items: [
      { label: "Fazer pergunta", points: POINTS_CONFIG.ask_question },
      { label: "Responder", points: POINTS_CONFIG.answer_question },
      { label: "Voto útil recebido", points: POINTS_CONFIG.useful_vote_received },
      { label: "Melhor resposta", points: POINTS_CONFIG.best_answer },
    ],
  },
];

export function PointsInfoGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map((cat) => (
        <div key={cat.title} className="space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <span>{cat.icon}</span> {cat.title}
          </p>
          <div className="space-y-1.5">
            {cat.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs"
              >
                <span>{item.label}</span>
                <Badge variant="secondary" className="text-xs">
                  +{item.points} pts
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
