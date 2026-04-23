export interface OpportunityNote {
  id: string;
  opportunity_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface OpportunityLabel {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface OpportunityLabelAssignment {
  id: string;
  opportunity_id: string;
  label_id: string;
  user_id: string;
  created_at: string;
  label?: OpportunityLabel;
}

export const LABEL_COLOR_PRESETS: { name: string; color: string }[] = [
  { name: "Azul", color: "#3b82f6" },
  { name: "Verde", color: "#10b981" },
  { name: "Vermelho", color: "#ef4444" },
  { name: "Amarelo", color: "#f59e0b" },
  { name: "Roxo", color: "#8b5cf6" },
  { name: "Rosa", color: "#ec4899" },
  { name: "Ciano", color: "#06b6d4" },
  { name: "Laranja", color: "#f97316" },
  { name: "Cinza", color: "#64748b" },
  { name: "Esmeralda", color: "#059669" },
];