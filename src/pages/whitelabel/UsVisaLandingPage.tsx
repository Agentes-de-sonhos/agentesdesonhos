import { CheckCircle2, MessageCircle, ExternalLink } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { siteContainer } from "@/lib/agencySiteTheme";
import { type AgencyDomainInfo, agencyWhatsappNumber } from "@/lib/agencyDomains";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { useUsVisaPublicInfo } from "@/hooks/useUsVisaPublicInfo";
import amandaNy from "@/assets/whitelabel/100-limites/amanda-estatua-liberdade.jpg.asset.json";

const FEES_URL = "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/fees/fees-visa-services.html";
const WAITS_URL = "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/global-visa-wait-times.html";

const CITIES: { key: string; label: string; place: string }[] = [
  { key: "Brasilia", label: "Brasília", place: "Embaixada" },
  { key: "Sao Paulo", label: "São Paulo", place: "Consulado" },
  { key: "Rio De Janeiro", label: "Rio de Janeiro", place: "Consulado" },
  { key: "Recife", label: "Recife", place: "Consulado" },
  { key: "Porto Alegre", label: "Porto Alegre", place: "Consulado" },
];

const BENEFITS = [
  "Clareza sobre cada etapa do processo",
  "Organização dos documentos e informações",
  "Apoio para reduzir erros e inconsistências no formulário DS-160",
  "Preparação sincera para a entrevista",
  "Atendimento próximo, do início ao resultado",
];

const STEPS = [
  { t: "Conversa inicial", d: "Conhecemos seus planos de viagem e seu histórico." },
  { t: "Organização", d: "Organizamos seus dados e documentos." },
  { t: "Formulário DS-160", d: "Auxiliamos no preenchimento com dados verdadeiros, revisados por você." },
  { t: "Taxa e agendamentos", d: "Orientamos o pagamento da taxa e os agendamentos nos canais oficiais." },
  { t: "Preparação", d: "Preparamos você para o CASV e a entrevista, quando aplicáveis." },
  { t: "Resultado", d: "Acompanhamos o resultado e a retirada ou entrega do passaporte." },
];

const FAQ = [
  { q: "Quais documentos preciso para começar?", a: "Inicialmente: passaporte válido, dados pessoais, informações de trabalho, objetivo da viagem e histórico de viagens. Documentos complementares podem ser indicados conforme o seu caso." },
  { q: "A assessoria garante a aprovação do visto?", a: "Não. A decisão é exclusiva do consulado ou da embaixada. A assessoria ajuda você a se organizar e evitar erros no processo." },
  { q: "Posso solicitar o visto sozinho?", a: "Sim. A solicitação pode ser feita diretamente pelo solicitante. A assessoria é uma opção para quem prefere orientação em cada etapa." },
  { q: "Na renovação preciso de entrevista?", a: "A dispensa de entrevista depende dos critérios oficiais vigentes. Mesmo quando elegível, o consulado pode exigir a entrevista." },
  { q: "Crianças precisam de visto próprio?", a: "Sim. Cada criança precisa de uma solicitação própria quando o visto é exigido, e o comparecimento segue as regras oficiais." },
  { q: "Posso comprar a passagem antes do visto?", a: "Recomendamos aguardar a emissão do visto antes de comprar passagens aéreas." },
];

function fmtDate(v?: string | null) {
  if (!v) return null;
  const [y, m, d] = v.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : null;
}

export default function UsVisaLandingPage({ info }: { info: AgencyDomainInfo }) {
  const wa = agencyWhatsappNumber(info);
  const waHref = wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent("Olá, Amanda! Gostaria de saber mais sobre a assessoria de visto americano.")}`
    : null;
  const { data, isLoading } = useUsVisaPublicInfo();
  const photo = resolveSiteProfile(info.hostname).about?.images?.[0];

  const Cta = ({ className = "" }: { className?: string }) =>
    waHref ? (
      <Button asChild size="lg" className={className}>
        <a href={waHref} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" /> Falar com a Amanda pelo WhatsApp
        </a>
      </Button>
    ) : null;

  const waits = data?.interview_wait_times ?? null;
  const feesSrc = data?.fees_source_url || FEES_URL;
  const waitsSrc = data?.wait_times_source_url || WAITS_URL;

  return (
    <>
      <SEO
        title="Assessoria de visto americano B1/B2 | 100 Limites"
        description="A 100 Limites orienta cada etapa do seu visto americano de turismo e negócios (B1/B2): documentos, DS-160, agendamentos e entrevista."
      />

      {/* Hero */}
      <section className="bg-card">
        <div className={`${siteContainer(true)} grid items-center gap-10 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-20`}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Visto americano · B1/B2</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Visto americano com orientação em cada etapa
            </h1>
            <p className="mt-4 text-lg font-medium text-foreground/80">
              Sua viagem aos Estados Unidos começa com um processo bem organizado.
            </p>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              A 100 Limites ajuda você a entender os documentos, o formulário e os atendimentos necessários para
              solicitar seu visto americano de turismo e negócios — B1/B2. Conte com a Amanda para esclarecer suas
              dúvidas e se preparar com mais tranquilidade.
            </p>
            <Cta className="mt-7 w-full sm:w-auto" />
          </div>
          <img
            src={amandaNy.url}
            alt="Amanda Larini, da 100 Limites, diante da Estátua da Liberdade em Nova York"
            width={1086}
            height={1448}
            className="mx-auto h-auto w-full max-w-md rounded-2xl"
          />
          {void photo}
        </div>
      </section>

      {/* Benefícios */}
      <section className="wl-alt-gradient">
        <div className={`${siteContainer(true)} py-12 md:py-16`}>
          <h2 className="text-2xl font-extrabold md:text-3xl">Por que contar com a assessoria</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex gap-3 rounded-xl border border-border/60 bg-card p-4 text-[15px]">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-foreground" aria-hidden="true" /> {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Etapas */}
      <section className="bg-card">
        <div className={`${siteContainer(true)} py-12 md:py-16`}>
          <h2 className="text-2xl font-extrabold md:text-3xl">Como funciona</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.t} className="rounded-xl border border-border/60 bg-card p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-sm font-bold text-background">{i + 1}</span>
                <p className="mt-3 font-semibold">{s.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Custos */}
      <section className="wl-alt-gradient">
        <div className={`${siteContainer(true)} py-12 md:py-16`}>
          <h2 className="text-2xl font-extrabold md:text-3xl">Custos</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <p className="font-semibold">Taxa consular (MRV)</p>
              <p className="mt-1 text-2xl font-extrabold" aria-live="polite">
                {isLoading ? "…" : data?.mrv_fee_usd != null ? `US$ ${data.mrv_fee_usd}` : "Indisponível"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Por pessoa, cobrada pelo governo dos EUA. Não é reembolsável, inclusive em caso de negativa. O valor em
                reais segue o sistema oficial.
                {fmtDate(data?.fees_source_updated_at) && ` Fonte atualizada em ${fmtDate(data?.fees_source_updated_at)}.`}
              </p>
              <a href={feesSrc} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm underline">
                Tabela oficial de taxas <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <p className="font-semibold">Assessoria 100 Limites</p>
              <p className="mt-1 text-2xl font-extrabold">Consulte a proposta</p>
              <p className="mt-1 text-sm text-muted-foreground">Valor apresentado conforme o seu caso.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <p className="font-semibold">Custos adicionais</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Conforme o caso: entrega do passaporte, deslocamento, hospedagem e outras cobranças oficiais aplicáveis.
                A taxa MRV não representa o custo total do processo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Locais e espera */}
      <section className="bg-card">
        <div className={`${siteContainer(true)} py-12 md:py-16`}>
          <h2 className="text-2xl font-extrabold md:text-3xl">Locais de atendimento no Brasil</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            A entrevista acontece na Embaixada em Brasília ou nos Consulados em São Paulo, Rio de Janeiro, Recife e
            Porto Alegre. O CASV é o centro de atendimento onde, conforme o caso, são coletadas foto e digitais — é um
            atendimento diferente da entrevista consular.
          </p>

          <div className="mt-6 overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[420px] text-left text-sm">
              <caption className="sr-only">Espera estimada para a próxima entrevista B1/B2</caption>
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Cidade</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Local</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Próxima entrevista B1/B2</th>
                </tr>
              </thead>
              <tbody>
                {CITIES.map((c) => (
                  <tr key={c.key} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium">{c.label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.place}</td>
                    <td className="px-4 py-3">
                      {isLoading ? "…" : waits?.[c.key]?.display_pt ?? "Indisponível"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {fmtDate(data?.wait_times_source_updated_at)
              ? `Data da fonte oficial: ${fmtDate(data?.wait_times_source_updated_at)}. `
              : "Data da fonte oficial indisponível. "}
            {fmtDate(data?.checked_at) && `Consultado em ${fmtDate(data?.checked_at)}. `}
            É o tempo estimado até a próxima entrevista, não o prazo de emissão do visto. Pode haver processamento
            administrativo adicional e prazo de devolução do passaporte.{" "}
            <a href={waitsSrc} target="_blank" rel="noopener noreferrer" className="underline">
              Ver tempos de espera oficiais
            </a>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="wl-alt-gradient">
        <div className={`${siteContainer(true)} py-12 md:py-16`}>
          <h2 className="text-2xl font-extrabold md:text-3xl">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="mt-6 rounded-xl border border-border/60 bg-card px-5">
            {FAQ.map((f, i) => (
              <AccordionItem key={f.q} value={`f${i}`} className={i === FAQ.length - 1 ? "border-b-0" : ""}>
                <AccordionTrigger className="text-left text-[15px] font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Encerramento */}
      <section className="bg-card">
        <div className={`${siteContainer(true)} py-12 text-center md:py-16`}>
          <h2 className="text-2xl font-extrabold md:text-3xl">Vamos começar a planejar sua viagem?</h2>
          <Cta className="mt-6 w-full sm:w-auto" />
          <p className="mx-auto mt-8 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            A 100 Limites presta assessoria privada e independente, sem vínculo com a Embaixada ou os Consulados dos
            Estados Unidos. Não há garantia de aprovação, antecipação de datas ou prazo de emissão. Fontes oficiais:{" "}
            <a href={FEES_URL} target="_blank" rel="noopener noreferrer" className="underline">taxas</a> ·{" "}
            <a href={WAITS_URL} target="_blank" rel="noopener noreferrer" className="underline">tempos de espera</a>.
          </p>
        </div>
      </section>
    </>
  );
}
