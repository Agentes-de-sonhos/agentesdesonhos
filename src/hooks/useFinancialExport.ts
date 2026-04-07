import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ExportButton, ExportModal, type ExportFormat } from "@/components/financial/ExportModal";
import { exportFinancialData } from "@/utils/financialExport";

export function useAgencyName() {
  const { user } = useAuth();
  const [agencyName, setAgencyName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("agency_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.agency_name) setAgencyName(data.agency_name); });
  }, [user]);

  return agencyName;
}

export function useFinancialExport(tabLabel: string) {
  const [showExport, setShowExport] = useState(false);
  const agencyName = useAgencyName();

  return { showExport, setShowExport, agencyName, ExportButton, ExportModal };
}
