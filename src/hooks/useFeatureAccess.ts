import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Loads the list of feature keys the current user has been explicitly granted.
 * This is ADDITIVE – it never removes existing permissions (admin, plan-based, etc.).
 */
export function useFeatureAccess() {
  const { user } = useAuth();
  const [grantedFeatures, setGrantedFeatures] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGrantedFeatures(new Set());
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("user_feature_access")
        .select("feature_key")
        .eq("user_id", user.id);

      setGrantedFeatures(new Set((data || []).map((d: any) => d.feature_key)));
      setLoading(false);
    };

    load();
  }, [user]);

  /** Check if user has explicit access to a feature (additive to admin/plan checks) */
  const hasFeatureAccess = (featureKey: string) => grantedFeatures.has(featureKey);

  return { hasFeatureAccess, grantedFeatures, loading };
}
