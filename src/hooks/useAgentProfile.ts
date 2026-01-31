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
    .from("profiles")
    .select("name, phone, avatar_url, agency_name, agency_logo_url, city, state")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error || !data) return null;
  
  return data as AgentProfile;
}
