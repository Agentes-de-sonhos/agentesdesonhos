import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
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

interface SubscriptionContextType {
  subscription: Subscription | null;
  plan: SubscriptionPlan;
  loading: boolean;
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

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
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
        // Create default subscription if none exists
        if (error.code === "PGRST116" || !data) {
          const { data: newSub, error: insertError } = await supabase
            .from("subscriptions")
            .insert({ user_id: user.id, plan: "essencial" })
            .select()
            .single();

          if (!insertError && newSub) {
            setSubscription(newSub as unknown as Subscription);
          }
        }
      } else if (data) {
        setSubscription(data as unknown as Subscription);
      } else {
        // No subscription found, create one
        const { data: newSub, error: insertError } = await supabase
          .from("subscriptions")
          .insert({ user_id: user.id, plan: "essencial" })
          .select()
          .single();

        if (!insertError && newSub) {
          setSubscription(newSub as unknown as Subscription);
        }
      }
    } catch (err) {
      console.error("Error in subscription fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const plan: SubscriptionPlan = subscription?.plan || "essencial";
  const aiLimit = AI_LIMITS[plan];
  const aiUsageCount = subscription?.ai_usage_count || 0;
  const aiUsageRemaining = Math.max(0, aiLimit - aiUsageCount);

  const hasFeature = useCallback((feature: Feature): boolean => {
    return PLAN_FEATURES[plan].includes(feature);
  }, [plan]);

  const canUseAI = useCallback((): boolean => {
    if (plan === "educa_pass" || plan === "essencial") return false;
    if (plan === "premium") return true;
    return aiUsageCount < aiLimit;
  }, [plan, aiUsageCount, aiLimit]);

  const incrementAIUsage = useCallback(async (): Promise<boolean> => {
    if (!subscription || !canUseAI()) return false;

    const { error } = await supabase
      .from("subscriptions")
      .update({ ai_usage_count: aiUsageCount + 1 })
      .eq("id", subscription.id);

    if (!error) {
      setSubscription(prev => prev ? { ...prev, ai_usage_count: prev.ai_usage_count + 1 } : null);
      return true;
    }
    return false;
  }, [subscription, canUseAI, aiUsageCount]);

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
