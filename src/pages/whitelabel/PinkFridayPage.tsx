import { useState } from "react";
import { AgencyRequestCenter } from "@/components/whitelabel/AgencyRequestCenter";
import { PinkFridayPageContent, pinkFridayCanonical } from "@/components/campaign/PinkFriday";
import type { CampaignOffer } from "@/components/campaign/novemberCampaignData";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SEO } from "@/components/seo/SEO";
import { agencyDisplayName, type AgencyDomainInfo } from "@/lib/agencyDomains";

export default function PinkFridayPage({ info, preview }: { info: AgencyDomainInfo; preview: boolean }) {
  const [request, setRequest] = useState<{ offer?: CampaignOffer } | null>(null);
  const agency = agencyDisplayName(info);
  return <>
    <SEO title={`Pink Friday | ${agency}`} exactTitle siteName={agency} description={`Ofertas Pink Friday da ${agency}.`} canonical={pinkFridayCanonical} noindex={preview} />
    <PinkFridayPageContent info={info} preview={preview} onRequest={offer => setRequest({ offer })} />
    <Dialog open={!!request} onOpenChange={open => { if (!open) setRequest(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Solicitar orçamento</DialogTitle>
          <DialogDescription>{request?.offer ? `Oferta: ${request.offer.title}` : `Planeje sua viagem com a ${agency}.`}</DialogDescription>
        </DialogHeader>
        {preview
          ? <p>Esta é uma prévia. Nenhuma solicitação será enviada.</p>
          : request && <AgencyRequestCenter hostname={info.hostname} agencyName={agency} initialService="pacotes" variant="plain" hideHeading {...(request.offer ? { prefill: { observacoes: `Tenho interesse na oferta Pink Friday: ${request.offer.title}.` } } : {})} />}
      </DialogContent>
    </Dialog>
  </>;
}
