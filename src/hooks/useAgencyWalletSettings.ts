import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AgencyWalletSettings,
  DEFAULT_WALLET_SETTINGS,
  fetchAgencyWalletSettings,
} from "@/lib/walletSettings";

export function useAgencyWalletSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AgencyWalletSettings>({ ...DEFAULT_WALLET_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchAgencyWalletSettings(user.id)
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const save = useCallback(
    async (next: AgencyWalletSettings) => {
      if (!user?.id) return;
      setSaving(true);
      try {
        const { error } = await supabase
          .from("agency_wallet_settings")
          .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
        if (error) throw error;
        setSettings(next);
      } finally {
        setSaving(false);
      }
    },
    [user?.id],
  );

  return { settings, setSettings, save, loading, saving };
}