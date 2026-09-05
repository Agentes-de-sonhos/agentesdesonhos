export interface AgentProfile {
  name: string;
  phone: string | null;
  avatar_url: string | null;
  agency_name: string | null;
  agency_logo_url: string | null;
  city: string | null;
  state: string | null;
  agency_primary_color: string | null;
  agency_secondary_color?: string | null;
  /** Quando true (default), o tom secundário é derivado da cor principal. */
  agency_secondary_auto?: boolean | null;
  agency_tertiary_color?: string | null;
  /** Quando true (default), o tom terciário é derivado da cor principal. */
  agency_tertiary_auto?: boolean | null;

}

export async function fetchAgentProfile(userId: string, supabase: any): Promise<AgentProfile | null> {
  const { data, error } = await supabase
    .rpc("get_public_profile", { _user_id: userId });
  
  if (error || !data || data.length === 0) return null;
  
  return data[0] as AgentProfile;
}
