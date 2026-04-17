// Constantes/listas usadas no cadastro de Guias de Turismo
// (mantidas em PT-BR como o restante do produto)

export const LANGUAGE_OPTIONS = [
  "Português", "Inglês", "Espanhol", "Francês", "Italiano", "Alemão",
  "Mandarim", "Japonês", "Russo", "Árabe", "Holandês", "Hebraico",
] as const;

export const LANGUAGE_LEVELS = [
  { value: "basico", label: "Básico" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
  { value: "nativo", label: "Nativo" },
] as const;

export const SPECIALTY_OPTIONS = [
  "Cultural", "Histórico", "Gastronômico", "Aventura", "Natureza",
  "Luxo", "Compras", "Religioso", "Personalizado",
] as const;

export const SERVICE_OPTIONS = [
  "City tour", "Walking tour", "Experiências privadas",
  "Grupos", "Transfers com guia", "Receptivo",
] as const;

export const COUNTRY_OPTIONS = [
  "Brasil", "Argentina", "Chile", "Uruguai", "Peru", "Colômbia", "México",
  "Estados Unidos", "Canadá", "Portugal", "Espanha", "França", "Itália",
  "Alemanha", "Reino Unido", "Holanda", "Grécia", "Turquia", "Egito",
  "Marrocos", "África do Sul", "Emirados Árabes", "Tailândia", "Japão",
  "China", "Indonésia", "Austrália", "Nova Zelândia", "Outro",
] as const;
