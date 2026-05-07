import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, AlertTriangle, XCircle, FileCheck, Stamp, Syringe,
  Bell, ExternalLink, NotebookPen, ChevronDown, FileDown, Loader2, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RequirementsResult } from "@/types/travelRequirements";

interface Props {
  result: RequirementsResult;
  passengerName: string;
  destination: string;
  onReset: () => void;
}

const STATUS_CONFIG = {
  apt: { label: "Apto para embarque", icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  attention: { label: "Atenção necessária", icon: AlertTriangle, color: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200" },
  not_apt: { label: "Não apto atualmente", icon: XCircle, color: "text-red-700", bg: "bg-red-50", ring: "ring-red-200" },
};

const CONFIDENCE_LABEL: Record<string, string> = { baixo: "Baixo", medio: "Médio", alto: "Alto" };

export function RequirementsResult({ result, passengerName, destination, onReset }: Props) {
  const status = STATUS_CONFIG[result.overall_status];
  const StatusIcon = status.icon;
  const reportRef = useRef<HTMLDivElement>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handlePdf = async () => {
    if (!reportRef.current) return;
    setGeneratingPdf(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      const img = canvas.toDataURL("image/png");
      pdf.addImage(img, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`requisitos-${(passengerName || "viagem").replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("PDF gerado com sucesso");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onReset}>Nova consulta</Button>
        <Button size="sm" onClick={handlePdf} disabled={generatingPdf} className="gap-2">
          {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Gerar PDF
        </Button>
      </div>

      <div ref={reportRef} className="space-y-4 bg-background p-1">
        {/* Header status */}
        <Card className={cn("border-0 shadow-sm ring-1", status.ring)}>
          <CardContent className={cn("pt-6 pb-6", status.bg)}>
            <div className="flex items-start gap-4">
              <div className={cn("p-3 rounded-full bg-background", status.color)}>
                <StatusIcon className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={cn("text-xl font-semibold", status.color)}>{status.label}</h2>
                  <Badge variant="outline" className="text-xs">Confiança: {CONFIDENCE_LABEL[result.confidence] ?? "—"}</Badge>
                </div>
                <p className="text-sm text-foreground/80 mt-1">{result.status_summary}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {passengerName && <span className="mr-2">Passageiro: <strong>{passengerName}</strong></span>}
                  {destination && <span>Destino: <strong>{destination}</strong></span>}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts (priority placement) */}
        {result.alerts?.length > 0 && (
          <Section icon={Bell} title="Alertas importantes" tone="warning" defaultOpen>
            <div className="space-y-2">
              {result.alerts.map((a, i) => (
                <AlertCard key={i} severity={a.severity} title={a.title} message={a.message} />
              ))}
            </div>
          </Section>
        )}

        {/* Documentation */}
        <Section icon={FileCheck} title="Documentação obrigatória" defaultOpen>
          <ul className="space-y-2 text-sm">
            <Field label="Passaporte obrigatório" value={result.documentation.passport_required ? "Sim" : "Não"} />
            <Field label="RG aceito" value={result.documentation.rg_accepted ? "Sim" : "Não"} />
            <Field label="CNH aceita" value={result.documentation.cnh_accepted ? "Sim" : "Não"} />
            {result.documentation.passport_min_validity_months != null && (
              <Field label="Validade mínima do passaporte" value={`${result.documentation.passport_min_validity_months} meses após retorno`} />
            )}
            {result.documentation.blank_pages_required != null && (
              <Field label="Páginas em branco mínimas" value={String(result.documentation.blank_pages_required)} />
            )}
          </ul>
          {result.documentation.additional_proofs?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Comprovantes adicionais</p>
              <ul className="list-disc pl-5 text-sm space-y-0.5">
                {result.documentation.additional_proofs.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {result.documentation.notes && (
            <p className="text-xs text-muted-foreground mt-3">{result.documentation.notes}</p>
          )}
        </Section>

        {/* Visas */}
        <Section icon={Stamp} title="Vistos e autorizações" defaultOpen>
          {result.visas?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum visto identificado.</p>}
          <div className="space-y-3">
            {result.visas?.map((v, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-sm">{v.country} — {v.type}</p>
                  </div>
                  <Badge variant={v.required ? "destructive" : "secondary"} className="text-xs">
                    {v.required ? "Necessário" : "Não necessário"}
                  </Badge>
                </div>
                <div className="grid sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                  {v.processing_time && <div><strong>Prazo:</strong> {v.processing_time}</div>}
                  {v.recommended_advance && <div><strong>Antecedência:</strong> {v.recommended_advance}</div>}
                  {v.estimated_cost && <div><strong>Custo:</strong> {v.estimated_cost}</div>}
                </div>
                {v.notes && <p className="text-xs">{v.notes}</p>}
                {v.official_url && (
                  <a href={v.official_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    Acessar site oficial <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Health */}
        <Section icon={Syringe} title="Saúde e vacinas" defaultOpen>
          <div className="space-y-2 text-sm">
            {result.health.mandatory_vaccines?.length > 0 && (
              <Field label="Vacinas obrigatórias" value={result.health.mandatory_vaccines.join(", ")} />
            )}
            {result.health.recommended_vaccines && result.health.recommended_vaccines.length > 0 && (
              <Field label="Vacinas recomendadas" value={result.health.recommended_vaccines.join(", ")} />
            )}
            <Field label="Certificado internacional" value={result.health.international_certificate_required ? "Obrigatório" : "Não obrigatório"} />
            <Field label="Seguro viagem" value={result.health.travel_insurance_required ? "Obrigatório" : "Recomendado"} />
            {result.health.insurance_min_coverage && (
              <Field label="Cobertura mínima" value={result.health.insurance_min_coverage} />
            )}
          </div>
          {result.health.sanitary_requirements && result.health.sanitary_requirements.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Requisitos sanitários</p>
              <ul className="list-disc pl-5 text-sm space-y-0.5">
                {result.health.sanitary_requirements.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {result.health.notes && <p className="text-xs text-muted-foreground mt-3">{result.health.notes}</p>}
        </Section>

        {/* Sources */}
        <Section icon={ExternalLink} title="Links oficiais">
          {result.official_sources?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma fonte oficial listada.</p>}
          <ul className="space-y-2">
            {result.official_sources?.map((s, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                <div className="min-w-0">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline break-all">
                    {s.name}
                  </a>
                  <p className="text-xs text-muted-foreground">{s.category}{s.last_known_update ? ` • Atualização conhecida: ${s.last_known_update}` : ""}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
              </li>
            ))}
          </ul>
        </Section>

        {/* Observations */}
        {result.observations?.length > 0 && (
          <Section icon={NotebookPen} title="Observações importantes">
            <ul className="list-disc pl-5 text-sm space-y-1">
              {result.observations.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </Section>
        )}

        {/* Disclaimer */}
        <Card className="border-0 shadow-sm bg-muted/30">
          <CardContent className="pt-5 pb-5">
            <div className="flex gap-3">
              <ShieldCheck className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-2">
                <p>
                  As informações foram geradas automaticamente com base em fontes oficiais e dados disponíveis no momento da consulta. Regras migratórias e sanitárias podem mudar sem aviso prévio. A validação final é responsabilidade das autoridades migratórias, consulados, embaixadas e companhias aéreas.
                </p>
                <p>Consulta gerada em {new Date().toLocaleString("pt-BR")}.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({
  icon: Icon, title, children, tone, defaultOpen = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  tone?: "warning";
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={cn("border-0 shadow-sm", tone === "warning" && "ring-1 ring-amber-200")}>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", tone === "warning" ? "text-amber-600" : "text-primary")} />
            <h3 className="font-semibold text-foreground">{title}</h3>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {open && <div className="px-5 pb-5">{children}</div>}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </li>
  );
}

function AlertCard({ severity, title, message }: { severity: "info" | "warning" | "critical"; title: string; message: string }) {
  const map = {
    info: { bg: "bg-blue-50", ring: "ring-blue-200", color: "text-blue-700", icon: Bell },
    warning: { bg: "bg-amber-50", ring: "ring-amber-200", color: "text-amber-700", icon: AlertTriangle },
    critical: { bg: "bg-red-50", ring: "ring-red-200", color: "text-red-700", icon: XCircle },
  } as const;
  const c = map[severity] || map.warning;
  const Icon = c.icon;
  return (
    <div className={cn("rounded-lg p-3 ring-1 flex gap-3", c.bg, c.ring)}>
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", c.color)} />
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold", c.color)}>{title}</p>
        <p className="text-sm text-foreground/80">{message}</p>
      </div>
    </div>
  );
}