import { siteContainer } from "@/lib/agencySiteTheme";
import { LIMITES100_LEGAL_DATA as D } from "@/lib/agencyLegal/limites100LegalPreview";

/** Rodapé legal (Documento 4) — renderizado apenas quando a prévia jurídica está ativa. */
export function Limites100LegalFooterPreview() {
  const tel = D.phone.replace(/\D/g, "");
  return (
    <div
      data-testid="limites100-legal-footer-preview"
      className="border-t border-[hsl(var(--wl-ink)_/_0.1)]"
    >
      <div className={`${siteContainer(true)} grid gap-6 py-8 text-sm leading-relaxed text-[hsl(var(--wl-ink)_/_0.8)] md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]`}>
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--wl-ink)_/_0.7)]">
            Dados legais <span className="ml-2 rounded bg-[hsl(var(--wl-ink))] px-1.5 py-0.5 text-[10px] tracking-normal text-[hsl(var(--wl-sand))]">Prévia para revisão</span>
          </p>
          <p>
            {D.tradeName} é o nome comercial de {D.legalName}, inscrita no CNPJ sob o nº {D.cnpj} e no
            Ministério do Turismo — Cadastur sob o nº {D.cadastur}.
          </p>
          <p>Endereço: {D.address}</p>
          <p>
            Atendimento: <a className="underline underline-offset-2" href={`mailto:${D.email}`}>{D.email}</a> |{" "}
            <a className="underline underline-offset-2" href={`tel:+55${tel}`}>{D.phone}</a> | WhatsApp: {D.phone}
          </p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--wl-ink)_/_0.12)] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--wl-ink)_/_0.7)]">Atendimento online</p>
          <p className="mt-2">{D.editorialLocation}</p>
        </div>
      </div>
    </div>
  );
}
