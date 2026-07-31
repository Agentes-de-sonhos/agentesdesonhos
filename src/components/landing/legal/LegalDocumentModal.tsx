import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { LegalDocument } from "@/lib/landingLegalDocuments";

/**
 * Accessible, reusable legal document modal for the white-label product
 * landings. Radix Dialog handles ESC, outside click, focus trap and focus
 * restore to the triggering link. Content is plain JSX text — never raw HTML.
 */
export function LegalDocumentModal({
  doc,
  open,
  onOpenChange,
  accentColor,
}: {
  doc: LegalDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accentColor?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-[760px] overflow-hidden p-0 sm:w-full">
        <DialogHeader className="space-y-1 border-b border-slate-100 px-5 py-4 text-left sm:px-7">
          <DialogTitle className="text-[18px] font-bold text-slate-900">{doc.title}</DialogTitle>
          <DialogDescription className="text-[12.5px] text-slate-500">
            Versão {doc.version} • Última atualização: {doc.lastUpdated}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[68dvh] overflow-y-auto px-5 py-5 text-[13.5px] leading-relaxed text-slate-700 sm:px-7">
          {doc.intro.map((text, i) => (
            <p key={`intro-${i}`} className="mb-3">
              {text}
            </p>
          ))}

          {doc.sections.map((section) => (
            <section key={section.heading} className="mt-6">
              <h3 className="mb-2 text-[14.5px] font-semibold text-slate-900">{section.heading}</h3>
              {(section.paragraphs ?? []).map((text, i) => (
                <p key={`p-${i}`} className="mb-2">
                  {text}
                </p>
              ))}
              {section.items && section.items.length > 0 ? (
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {section.items.map((item, i) => (
                    <li key={`i-${i}`}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-right sm:px-7">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 text-white hover:opacity-95"
            style={accentColor ? { backgroundColor: accentColor } : undefined}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
