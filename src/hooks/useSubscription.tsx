import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { 
  Subscription, 
  SubscriptionPlan, 
  Feature, 
  PLAN_FEATURES, 
  AI_LIMITS,
  REQUIRED_PLAN_FOR_FEATURE,
  PLAN_LABELS
} from "@/types/subscription";
import { useUserRole } from "./useUserRole";
import { useFeatureAccess } from "./useFeatureAccess";
import { useTeamSession } from "@/contexts/TeamSessionContext";

interface SubscriptionContextType {
  subscription: Subscription | null;
  plan: SubscriptionPlan;
  loading: boolean;
  isPromotor: boolean;
  hasFeature: (feature: Feature) => boolean;
  canUseAI: () => boolean;
  aiUsageCount: number;
  aiLimit: number;
  aiUsageRemaining: number;
  incrementAIUsage: () => Promise<boolean>;
  getRequiredPlan: (feature: Feature) => SubscriptionPlan;
  getPlanLabel: (plan: SubscriptionPlan) => string;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      initialLoadDone.current = false;
      return;
    }

    // Only show loading spinner on the very first fetch.
    // Subsequent refetches (e.g. token refresh on tab focus) update silently
    // to avoid unmounting ProtectedRoute children and losing UI state.
    if (!initialLoadDone.current) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
        // Row creation is handled server-side by the handle_new_user_subscription
        // trigger; client inserts are blocked by RLS. Leave subscription null so
        // the app falls back to the default "start" plan derived below.
      } else if (data) {
        setSubscription(data as unknown as Subscription);
      }
    } catch (err) {
      console.error("Error in subscription fetch:", err);
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Check Stripe subscription status once on load
  const stripeCheckDone = useRef(false);
  useEffect(() => {
    if (!user || stripeCheckDone.current) return;
    stripeCheckDone.current = true;

    const checkStripe = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-subscription");
        if (!error && data?.subscribed && data?.plan) {
          // Only refetch if plan actually changed
          if (data.plan !== subscription?.plan) {
            await fetchSubscription();
          }
        }
      } catch (e) {
        console.error("Error checking Stripe subscription:", e);
      }
    };
    // Delay stripe check to not block initial render
    const timer = window.setTimeout(checkStripe, 2000);
    return () => window.clearTimeout(timer);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const { role } = useUserRole();
  const isPromotor = role === "promotor";
  const isAdmin = role === "admin";
  const { hasFeatureAccess: hasExplicitAccess } = useFeatureAccess();
  const { member: teamMember } = useTeamSession();
  const isTeamMember = !!teamMember;

  const plan: SubscriptionPlan = subscription?.plan || "start";
  const aiLimit = AI_LIMITS[plan];
  const aiUsageCount = subscription?.ai_usage_count || 0;
  const aiUsageRemaining = Math.max(0, aiLimit - aiUsageCount);

  const hasFeature = useCallback((feature: Feature): boolean => {
    if (isAdmin) return true;
    if (isPromotor) return true;
    // Team members inherit the master's agency context — bypass plan gating.
    if (isTeamMember) return true;
    // Check explicit grants (additive)
    if (hasExplicitAccess(feature)) return true;
    const features = PLAN_FEATURES[plan];
    if (!features) return false;
    return features.includes(feature);
  }, [plan, isPromotor, isAdmin, isTeamMember, hasExplicitAccess]);

  const canUseAI = useCallback((): boolean => {
    if (isAdmin || isPromotor) return true;
    if (plan === "start" || plan === "educa_pass" || plan === "cartao_digital" || plan === "essencial") return false;
    if (plan === "premium" || plan === "profissional" || plan === "fundador") return true;
    return aiUsageCount < aiLimit;
  }, [plan, aiUsageCount, aiLimit, isAdmin, isPromotor]);

  const incrementAIUsage = useCallback(async (): Promise<boolean> => {
    if (!user || !subscription || !canUseAI()) return false;

    // Delegate to the SECURITY DEFINER RPC that enforces plan limits and
    // increments the counter server-side (client updates on subscriptions are
    // blocked by RLS).
    const { data, error } = await supabase.rpc("check_ai_usage", { _user_id: user.id });
    if (error) {
      console.error("check_ai_usage error:", error);
      return false;
    }
    if (data === true) {
      setSubscription((prev) =>
        prev ? { ...prev, ai_usage_count: prev.ai_usage_count + 1 } : prev,
      );
      return true;
    }
    return false;
  }, [subscription, canUseAI, user]);

  const getRequiredPlan = useCallback((feature: Feature): SubscriptionPlan => {
    return REQUIRED_PLAN_FOR_FEATURE[feature];
  }, []);

  const getPlanLabel = useCallback((p: SubscriptionPlan): string => {
    return PLAN_LABELS[p];
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      plan,
      loading,
      isPromotor,
      hasFeature,
      canUseAI,
      aiUsageCount,
      aiLimit,
      aiUsageRemaining,
      incrementAIUsage,
      getRequiredPlan,
      getPlanLabel,
      refetch: fetchSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
