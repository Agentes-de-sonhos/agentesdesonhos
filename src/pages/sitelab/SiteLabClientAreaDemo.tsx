/**
 * Área do Cliente do Site Lab.
 *
 * Reutiliza EXATAMENTE a casca e as seções compartilhadas dos sites das
 * agências (`ClientAreaShell`, `ClientAreaSections`, `ClientAreaTripsView`) e a
 * navegação central (`CLIENT_AREA_NAV`). A única diferença é a origem dos
 * dados: fixtures sintéticas de uma viagem a Portugal. Nada aqui consulta,
 * grava ou dispara qualquer ação real.
 */
import { useMemo, useState } from "react";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { ClientAreaShell } from "@/components/whitelabel/clientarea/ClientAreaShell";
import {
  ClientAreaDocuments,
  ClientAreaHome,
  ClientAreaProfile,
  ClientAreaSupportSection,
} from "@/components/whitelabel/clientarea/ClientAreaSections";
import {
  ClientAreaTripDetail,
  ClientAreaTripsView,
} from "@/components/whitelabel/clientarea/ClientAreaTripsView";
import { groupTrips, highlightTrip } from "@/lib/clientAreaTrips";
import type { ClientAreaView } from "@/lib/clientAreaNav";
import {
  DEMO_CLIENT,
  DEMO_CLIENT_AREA_DOCUMENTS,
  DEMO_CLIENT_AREA_PROFILE,
  DEMO_CLIENT_AREA_TRIP,
  DEMO_CLIENT_AREA_TRIPS,
} from "@/pages/sitelab/sitelabFixtures";

const noop = () => {};

export default function SiteLabClientAreaDemo({ info }: { info: AgencyDomainInfo }) {
  const [view, setView] = useState<ClientAreaView>("inicio");
  const [tripId, setTripId] = useState<string | null>(null);

  const grouped = useMemo(() => groupTrips(DEMO_CLIENT_AREA_TRIPS), []);
  const highlight = useMemo(() => highlightTrip(grouped), [grouped]);

  const changeView = (next: ClientAreaView) => {
    setTripId(null);
    setView(next);
  };
  const openTrip = (id: string) => {
    setTripId(id);
    setView("viagens");
  };

  return (
    <ClientAreaShell
      info={info}
      view={view}
      onChangeView={changeView}
      clientName={DEMO_CLIENT.name}
      clientEmail={DEMO_CLIENT.email}
      onLogout={noop}
    >
      {view === "inicio" && (
        <ClientAreaHome
          info={info}
          clientName={DEMO_CLIENT.name}
          onChangeView={changeView}
          tripsStatus="ready"
          highlight={highlight}
          onOpenTrip={openTrip}
        />
      )}
      {view === "viagens" && (tripId ? (
        <ClientAreaTripDetail
          info={info}
          status="ready"
          trip={DEMO_CLIENT_AREA_TRIP}
          onBack={() => setTripId(null)}
          documentPendingId={null}
          documentError={null}
          onOpenDocument={noop}
          onOpenWallet={noop}
        />
      ) : (
        <ClientAreaTripsView
          info={info}
          status="ready"
          grouped={grouped}
          onRetry={noop}
          onOpenTrip={openTrip}
        />
      ))}
      {view === "documentos" && (
        <ClientAreaDocuments
          info={info}
          status="ready"
          documents={DEMO_CLIENT_AREA_DOCUMENTS}
          pendingId={null}
          error={null}
          onOpen={noop}
          onRetry={noop}
          onOpenTrip={openTrip}
        />
      )}
      {view === "perfil" && (
        <ClientAreaProfile
          info={info}
          clientName={DEMO_CLIENT.name}
          clientEmail={DEMO_CLIENT.email}
          showChange={false}
          onToggleChange={noop}
          currentPassword=""
          newPassword=""
          confirmPassword=""
          onCurrentPassword={noop}
          onNewPassword={noop}
          onConfirmPassword={noop}
          onSubmitPassword={noop}
          passwordError={null}
          busy={false}
          onLogout={noop}
          profile={DEMO_CLIENT_AREA_PROFILE}
          onRequestUpdate={noop}
        />
      )}
      {view === "atendimento" && <ClientAreaSupportSection info={info} />}
    </ClientAreaShell>
  );
}
