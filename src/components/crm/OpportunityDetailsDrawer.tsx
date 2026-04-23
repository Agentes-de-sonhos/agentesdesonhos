import { MapPin, Tag, MessageSquare } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { OpportunityNotesTimeline } from "./OpportunityNotesTimeline";
import { OpportunityLabelPicker } from "./OpportunityLabelPicker";
import {
  useOpportunityLabelAssignments,
  useOpportunityNotes,
} from "@/hooks/useOpportunityExtras";
import { STAGE_LABELS, STAGE_COLORS, type Opportunity } from "@/types/crm";
import { cn } from "@/lib/utils";

interface OpportunityDetailsDrawerProps {
  opportunity: Opportunity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "notes" | "labels";
}

export function OpportunityDetailsDrawer({
  opportunity,
  open,
  onOpenChange,
  defaultTab = "notes",
}: OpportunityDetailsDrawerProps) {
  const { byOpportunity, unassignLabel } = useOpportunityLabelAssignments();
  const { notes } = useOpportunityNotes(opportunity?.id || null);
  const appliedLabels = opportunity ? byOpportunity[opportunity.id] || [] : [];

  if (!opportunity) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-2 pb-4">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="text-lg leading-tight">
              {opportunity.client?.name}
            </SheetTitle>
            <Badge
              variant="secondary"
              className={cn("text-white text-[11px] flex-shrink-0", STAGE_COLORS[opportunity.stage])}
            >
              {STAGE_LABELS[opportunity.stage]}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{opportunity.destination}</span>
          </div>
        </SheetHeader>

        {/* Applied labels strip */}
        <div className="space-y-2 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Etiquetas
            </span>
            <OpportunityLabelPicker opportunityId={opportunity.id} />
          </div>
          {appliedLabels.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma etiqueta aplicada</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {appliedLabels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() =>
                    unassignLabel({ opportunityId: opportunity.id, labelId: label.id })
                  }
                  className="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: label.color }}
                  title="Clique para remover"
                >
                  {label.name}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Tabs defaultValue={defaultTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="notes" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Anotações
              {notes.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {notes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="notes" className="mt-4">
            <OpportunityNotesTimeline opportunityId={opportunity.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}