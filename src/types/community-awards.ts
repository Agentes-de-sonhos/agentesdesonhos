export type AwardStatus =
  | "preparing"
  | "nominations"
  | "voting"
  | "calculating"
  | "completed"
  | "cancelled";

export interface CommunityMonthlyAward {
  id: string;
  reference_month: number;
  reference_year: number;
  title: string | null;
  description: string | null;
  prize_title: string | null;
  prize_description: string | null;
  prize_image_url: string | null;
  sponsor_name: string | null;
  rules: string | null;
  extra_link: string | null;
  extra_notes: string | null;
  publish_date: string | null;
  voting_start_at: string | null;
  voting_end_at: string | null;
  status: AwardStatus;
  max_wins_per_year: number;
  allow_consecutive_wins: boolean;
  winner_user_id: string | null;
  winner_votes: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityMonthlyNominee {
  id: string;
  award_id: string;
  user_id: string;
  posts_count: number;
  questions_count: number;
  answers_count: number;
  comments_count: number;
  contributions_count: number;
  active_days_count: number;
  eligible: boolean;
  exclusion_reason: string | null;
  first_contribution_at: string | null;
  last_contribution_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    user_id: string;
    name: string | null;
    avatar_url: string | null;
    agency_name?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
}