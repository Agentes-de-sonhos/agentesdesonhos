export type CommunityMemberStatus = 'approved_unverified' | 'verified' | 'blocked';
export type EntryMethod = 'cnpj_8_years' | 'experience';

export interface CommunityMember {
  id: string;
  user_id: string;
  status: CommunityMemberStatus;
  entry_method: EntryMethod;
  cnpj: string | null;
  years_experience: number | null;
  bio: string | null;
  segments: string[] | null;
  specialties: string[];
  created_at: string;
  updated_at: string;
  profile?: {
    name: string;
    avatar_url: string | null;
    agency_name: string | null;
    city: string | null;
    state: string | null;
  };
}

export interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  profile?: {
    name: string;
    avatar_url: string | null;
    agency_name: string | null;
  };
  member?: {
    specialties: string[];
    status: CommunityMemberStatus;
  };
  user_liked?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    name: string;
    avatar_url: string | null;
  };
}

export const SPECIALTY_OPTIONS = {
  destinations: [
    'Orlando', 'Nova York', 'Miami', 'Europa', 'Portugal', 'Itália', 'França',
    'Inglaterra', 'Espanha', 'Grécia', 'Caribe', 'México', 'Maldivas',
    'África do Sul', 'Egito', 'Turquia', 'Japão', 'Tailândia', 'Austrália',
    'Argentina', 'Chile', 'Colômbia', 'Peru', 'Oriente Médio', 'Canadá',
  ],
  segments: [
    'Resorts All-Inclusive', 'Cruzeiros', 'Luxo', 'Aventura', 'Corporativo',
    'Rodoviário', 'Ecoturismo', 'Cultural', 'Gastronômico', 'Bem-estar & Spa',
  ],
  niches: [
    'Disney & Parques', 'Lua de Mel', 'Grupos', 'Família', 'Solo',
    'LGBTQ+', 'Terceira Idade', 'Esportivo', 'Religioso', 'Intercâmbio',
    'Casamentos no Exterior', 'Safári',
  ],
};

export const ALL_SPECIALTIES = [
  ...SPECIALTY_OPTIONS.destinations,
  ...SPECIALTY_OPTIONS.segments,
  ...SPECIALTY_OPTIONS.niches,
];

export const STATUS_LABELS: Record<CommunityMemberStatus, string> = {
  approved_unverified: 'Aprovado (não verificado)',
  verified: 'Verificado',
  blocked: 'Bloqueado',
};

export const STATUS_COLORS: Record<CommunityMemberStatus, string> = {
  approved_unverified: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};
