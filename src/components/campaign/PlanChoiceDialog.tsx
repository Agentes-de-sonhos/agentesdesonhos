import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import art from "@/assets/whitelabel/mundo-planejar-popup.png.asset.json";
import type { CampaignOffer } from "./novemberCampaignData";

/** WhatsApp oficial da O Mundo em Cores (rodapé do site). */
export const MUNDO_WHATSAPP = "5511999954734";

export function offerWhatsappUrl(offer: CampaignOffer): string {
  const text = `Olá, Vanessa! Vi a oferta "${offer.title}" nas Oportunidades de Novembro e gostaria de saber mais.`;
  return `https://wa.me/${MUNDO_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

const hot = "absolute cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function PlanChoiceDialog({ offer, onClose, onBuyOnline }: { offer: CampaignOffer | null; onClose: () => void; onBuyOnline: (offer: CampaignOffer) => void }) {
  return <Dialog open={!!offer} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-w-[880px] w-[94vw] border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
      <DialogTitle className="sr-only">Como você prefere planejar sua viagem?</DialogTitle>
      <DialogDescription className="sr-only">Escolha entre comprar online ou falar com a Vanessa pelo WhatsApp.</DialogDescription>
      {offer && <div className="relative overflow-hidden rounded-[28px] shadow-2xl">
        <img src={art.url} alt="Vanessa apresentando duas opções: Compre Online ou Fale Comigo" className="block h-auto w-full" />
        <button type="button" aria-label="Compre Online" className={hot} style={{ left: "5%", top: "57%", width: "25.5%", height: "8.5%" }} onClick={() => onBuyOnline(offer)} />
        <button type="button" aria-label="Fale Comigo pelo WhatsApp" className={hot} style={{ left: "69.7%", top: "59.3%", width: "25.5%", height: "8.5%" }} onClick={() => { window.open(offerWhatsappUrl(offer), "_blank", "noopener"); onClose(); }} />
        <button type="button" aria-label="Fechar" className={hot} style={{ left: "93.5%", top: "1.5%", width: "5%", height: "7%" }} onClick={onClose} />
      </div>}
    </DialogContent>
  </Dialog>;
}
