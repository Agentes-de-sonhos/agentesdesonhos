import { Navigate, useLocation } from "react-router-dom";

/** Old notification/email links still point to /crm?opportunity=... . */
export function LegacyCrmRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: "/gestao-clientes/funil", search, hash }} replace />;
}
