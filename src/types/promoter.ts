export type RankingCriteria = 'sales_count' | 'revenue';

export interface PromoterMonthlyWinner {
  id: string;
  user_id: string;
  month: number;
  year: number;
  ranking_criteria: RankingCriteria;
  total_sales_count: number;
  total_revenue: number;
  prize_name: string | null;
  prize_description: string | null;
  prize_image_url: string | null;
  is_confirmed: boolean;
  confirmed_at: string | null;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    name: string;
    avatar_url: string | null;
  };
}

export interface PromoterSettings {
  id: string;
  ranking_criteria: RankingCriteria;
  current_month_prize_name: string | null;
  current_month_prize_description: string | null;
  current_month_prize_image_url: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface PromoterRankingEntry {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  sales_count: number;
  total_revenue: number;
}

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
