export interface AgentProfile {
  name: string;
  phone: string | null;
  avatar_url: string | null;
  agency_name: string | null;
  agency_logo_url: string | null;
  city: string | null;
  state: string | null;
}

export async function fetchAgentProfile(userId: string, supabase: any): Promise<AgentProfile | null> {
  const { data, error } = await supabase
    .rpc("get_public_profile", { _user_id: userId });
  
  if (error || !data || data.length === 0) return null;
  
  return data[0] as AgentProfile;
}
