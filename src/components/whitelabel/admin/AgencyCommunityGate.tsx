import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";

export function AgencyCommunityGate({ children, siteLab = false }: { children: ReactNode; siteLab?: boolean }) {
  const { community, loading } = usePermissions();
  if (loading) return null;
  if (!siteLab && !community.community_experience_enabled) return <Navigate to="/gestao" replace />;
  return <>{children}</>;
}