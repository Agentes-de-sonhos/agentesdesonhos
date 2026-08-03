import {
  Building2, Plane, Hotel, Car, Ship, Shield, Ticket, MapPin, Users, Globe,
  type LucideIcon,
} from "lucide-react";

export interface DirectoryCategoryTheme {
  /** Categoria canônica no diretório. */
  category: string;
  /** Rótulo curto (usado nos botões do Mapa do Turismo). */
  label: string;
  /** Ícone de fallback quando o fornecedor não tem logotipo. */
  Icon: LucideIcon;
  /** Container do logotipo (fundo suave). */
  logoBg: string;
  /** Ícone de fallback (cor). */
  iconColor: string;
  /** Anel/borda de acento do container do logo. */
  logoRing: string;
  /** Borda temática da moldura do logo (fundo sempre branco). */
  logoBorder: string;
  /** Tipografia/cor do "Ver mais". */
  moreColor: string;
  /** Chips de especialidade. */
  chip: string;
}

/**
 * Configuração central de cor/ícone por categoria do Mapa do Turismo.
 * Toda página de listagem deve consumir daqui — nunca espalhar classes divergentes.
 */
const THEMES: DirectoryCategoryTheme[] = [
  {
    category: "Operadoras de turismo", label: "Operadoras", Icon: Plane,
    logoBg: "bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400", logoRing: "ring-blue-200/60 dark:ring-blue-800/50", logoBorder: "border-blue-200 dark:border-blue-800/70",
    moreColor: "text-blue-700 hover:bg-blue-100/50 dark:text-blue-400 dark:hover:bg-blue-950/50",
    chip: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
  },
  {
    category: "Consolidadoras", label: "Consolidadoras", Icon: Building2,
    logoBg: "bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-950 dark:to-violet-900",
    iconColor: "text-violet-600 dark:text-violet-400", logoRing: "ring-violet-200/60 dark:ring-violet-800/50", logoBorder: "border-violet-200 dark:border-violet-800/70",
    moreColor: "text-violet-700 hover:bg-violet-100/50 dark:text-violet-400 dark:hover:bg-violet-950/50",
    chip: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
  },
  {
    category: "Companhias aéreas", label: "Cias Aéreas", Icon: Plane,
    logoBg: "bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-950 dark:to-sky-900",
    iconColor: "text-sky-600 dark:text-sky-400", logoRing: "ring-sky-200/60 dark:ring-sky-800/50", logoBorder: "border-sky-200 dark:border-sky-800/70",
    moreColor: "text-sky-700 hover:bg-sky-100/50 dark:text-sky-400 dark:hover:bg-sky-950/50",
    chip: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
  },
  {
    category: "Hospedagem", label: "Hospedagem", Icon: Hotel,
    logoBg: "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950 dark:to-amber-900",
    iconColor: "text-amber-600 dark:text-amber-400", logoRing: "ring-amber-200/60 dark:ring-amber-800/50", logoBorder: "border-amber-200 dark:border-amber-800/70",
    moreColor: "text-amber-700 hover:bg-amber-100/50 dark:text-amber-400 dark:hover:bg-amber-950/50",
    chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  },
  {
    category: "Locadoras de veículos", label: "Locadoras", Icon: Car,
    logoBg: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950 dark:to-emerald-900",
    iconColor: "text-emerald-600 dark:text-emerald-400", logoRing: "ring-emerald-200/60 dark:ring-emerald-800/50", logoBorder: "border-emerald-200 dark:border-emerald-800/70",
    moreColor: "text-emerald-700 hover:bg-emerald-100/50 dark:text-emerald-400 dark:hover:bg-emerald-950/50",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  },
  {
    category: "Cruzeiros", label: "Cruzeiros", Icon: Ship,
    logoBg: "bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-950 dark:to-cyan-900",
    iconColor: "text-cyan-600 dark:text-cyan-400", logoRing: "ring-cyan-200/60 dark:ring-cyan-800/50", logoBorder: "border-cyan-200 dark:border-cyan-800/70",
    moreColor: "text-cyan-700 hover:bg-cyan-100/50 dark:text-cyan-400 dark:hover:bg-cyan-950/50",
    chip: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800",
  },
  {
    category: "Seguros viagem", label: "Seguros", Icon: Shield,
    logoBg: "bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-950 dark:to-rose-900",
    iconColor: "text-rose-600 dark:text-rose-400", logoRing: "ring-rose-200/60 dark:ring-rose-800/50", logoBorder: "border-rose-200 dark:border-rose-800/70",
    moreColor: "text-rose-700 hover:bg-rose-100/50 dark:text-rose-400 dark:hover:bg-rose-950/50",
    chip: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
  },
  {
    category: "Parques e atrações", label: "Parques", Icon: Ticket,
    logoBg: "bg-gradient-to-br from-pink-100 to-pink-50 dark:from-pink-950 dark:to-pink-900",
    iconColor: "text-pink-600 dark:text-pink-400", logoRing: "ring-pink-200/60 dark:ring-pink-800/50", logoBorder: "border-pink-200 dark:border-pink-800/70",
    moreColor: "text-pink-700 hover:bg-pink-100/50 dark:text-pink-400 dark:hover:bg-pink-950/50",
    chip: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800",
  },
  {
    category: "Receptivos", label: "Receptivos", Icon: MapPin,
    logoBg: "bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-950 dark:to-orange-900",
    iconColor: "text-orange-600 dark:text-orange-400", logoRing: "ring-orange-200/60 dark:ring-orange-800/50", logoBorder: "border-orange-200 dark:border-orange-800/70",
    moreColor: "text-orange-700 hover:bg-orange-100/50 dark:text-orange-400 dark:hover:bg-orange-950/50",
    chip: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
  },
  {
    category: "Guias", label: "Guias", Icon: Users,
    logoBg: "bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-950 dark:to-teal-900",
    iconColor: "text-teal-600 dark:text-teal-400", logoRing: "ring-teal-200/60 dark:ring-teal-800/50", logoBorder: "border-teal-200 dark:border-teal-800/70",
    moreColor: "text-teal-700 hover:bg-teal-100/50 dark:text-teal-400 dark:hover:bg-teal-950/50",
    chip: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800",
  },
];

const FALLBACK_THEME: DirectoryCategoryTheme = {
  category: "Outros", label: "Outros", Icon: Globe,
  logoBg: "bg-gradient-to-br from-muted to-muted/50",
  iconColor: "text-muted-foreground", logoRing: "ring-border/50", logoBorder: "border-border",
  moreColor: "text-primary",
  chip: "bg-primary/5 text-foreground border-primary/20",
};

export const DIRECTORY_CATEGORY_THEMES = THEMES;

export function getDirectoryCategoryTheme(category?: string | null): DirectoryCategoryTheme {
  if (!category) return FALLBACK_THEME;
  const key = category.trim().toLowerCase();
  return THEMES.find((t) => t.category.toLowerCase() === key) ?? FALLBACK_THEME;
}