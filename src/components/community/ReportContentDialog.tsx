import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateCommunityReport } from "@/hooks/useCommunityReports";
import {
  COMMUNITY_REPORT_REASONS,
  MAX_REPORT_DETAILS,
  reportReasonLabel,
  type CommunityReportReason,
  type CommunityReportTargetKind,
} from "@/lib/communityReports";

interface ReportContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetKind: CommunityReportTargetKind;
  /** Publicação denunciada ou publicação pai do comentário. */
  postId: string;
  commentId?: string | null;
}

type Step = "reason" | "confirm" | "done";

/**
 * Fluxo de denúncia usado por publicações e comentários: escolher motivo,
 * confirmar, optar por atualizações e enviar. Não remove conteúdo nem revela o
 * denunciante ao autor.
 */
export function ReportContentDialog({
  open,
  onOpenChange,
  targetKind,
  postId,
  commentId,
}: ReportContentDialogProps) {
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState<CommunityReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [wantsUpdates, setWantsUpdates] = useState(false);
  const createReport = useCreateCommunityReport();

  useEffect(() => {
    if (!open) {
      setStep("reason");
      setReason(null);
      setDetails("");
      setWantsUpdates(false);
    }
  }, [open]);

  const label = targetKind === "post" ? "publicação" : "comentário";

  const submit = async () => {
    if (!reason) return;
    try {
      await createReport.mutateAsync({
        targetKind,
        postId,
        commentId: commentId ?? null,
        reason,
        details,
        wantsUpdates,
      });
      setStep("done");
      toast.success("Denúncia enviada para análise");
    } catch {
      /* erro já informado pelo hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md" data-community-report-dialog>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            {step === "done" ? "Denúncia enviada" : `Denunciar ${label}`}
          </DialogTitle>
          <DialogDescription>
            {step === "reason" && "Selecione o motivo que melhor descreve o problema."}
            {step === "confirm" && "Confira o motivo antes de enviar."}
            {step === "done" && "Nossa equipe vai analisar e você pode acompanhar o status."}
          </DialogDescription>
        </DialogHeader>

        {step === "reason" && (
          <RadioGroup
            value={reason ?? ""}
            onValueChange={(value) => setReason(value as CommunityReportReason)}
            className="space-y-1"
          >
            {COMMUNITY_REPORT_REASONS.map((item) => (
              <div key={item.value} className="flex items-center gap-2 rounded-md px-1 py-1.5">
                <RadioGroupItem value={item.value} id={`report-reason-${item.value}`} />
                <Label htmlFor={`report-reason-${item.value}`} className="text-sm font-normal">
                  {item.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {step === "confirm" && reason && (
          <div className="space-y-4">
            <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground">
              Você selecionou o seguinte motivo: <strong>{reportReasonLabel(reason)}</strong>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="report-details" className="text-xs text-muted-foreground">
                Detalhes (opcional)
              </Label>
              <Textarea
                id="report-details"
                value={details}
                maxLength={MAX_REPORT_DETAILS}
                rows={3}
                placeholder="Se quiser, explique brevemente o problema."
                onChange={(event) => setDetails(event.target.value)}
              />
              <p className="text-right text-[11px] text-muted-foreground">
                {details.length}/{MAX_REPORT_DETAILS}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="report-updates"
                checked={wantsUpdates}
                onCheckedChange={(value) => setWantsUpdates(value === true)}
              />
              <Label htmlFor="report-updates" className="text-sm font-normal leading-snug">
                Quero receber atualizações sobre esta denúncia
              </Label>
            </div>
          </div>
        )}

        {step === "done" && (
          <p className="text-sm text-muted-foreground">
            Obrigado por avisar. A {label} não foi removida automaticamente e o autor não sabe quem
            denunciou. Acompanhe o andamento em “Minhas denúncias”.
          </p>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {step === "reason" && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button disabled={!reason} onClick={() => setStep("confirm")}>
                Continuar
              </Button>
            </>
          )}
          {step === "confirm" && (
            <>
              <Button variant="ghost" onClick={() => setStep("reason")}>
                Voltar
              </Button>
              <Button disabled={createReport.isPending} onClick={() => void submit()}>
                {createReport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar denúncia
              </Button>
            </>
          )}
          {step === "done" && (
            <Button className="ml-auto" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
