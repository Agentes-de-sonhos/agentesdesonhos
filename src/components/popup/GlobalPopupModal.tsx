import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useActivePopup, useForcedPopupListener, GlobalPopup } from "@/hooks/useGlobalPopups";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";

const VIEWED_POPUPS_KEY = "viewed_popups_session";

function getViewedPopups(): string[] {
  try {
    const stored = sessionStorage.getItem(VIEWED_POPUPS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function markPopupAsViewed(popupId: string): void {
  try {
    const viewed = getViewedPopups();
    if (!viewed.includes(popupId)) {
      viewed.push(popupId);
      sessionStorage.setItem(VIEWED_POPUPS_KEY, JSON.stringify(viewed));
    }
  } catch {
    // Ignore storage errors
  }
}

function hasViewedPopup(popupId: string): boolean {
  return getViewedPopups().includes(popupId);
}

export function GlobalPopupModal() {
  const navigate = useNavigate();
  const { data: activePopup, isLoading } = useActivePopup();
  const [isOpen, setIsOpen] = useState(false);
  const [currentPopup, setCurrentPopup] = useState<GlobalPopup | null>(null);

  // Normal popup on load
  useEffect(() => {
    if (!isLoading && activePopup && !hasViewedPopup(activePopup.id)) {
      setCurrentPopup(activePopup);
      setIsOpen(true);
    }
  }, [activePopup, isLoading]);

  // Force-pushed popup via realtime — always opens, ignores session viewed state
  const handleForcedPopup = useCallback((popup: GlobalPopup) => {
    setCurrentPopup(popup);
    setIsOpen(true);
  }, []);

  useForcedPopupListener(handleForcedPopup);

  const handleClose = () => {
    if (currentPopup) {
      markPopupAsViewed(currentPopup.id);
    }
    setIsOpen(false);
  };

  const handleButtonClick = () => {
    if (currentPopup?.button_link) {
      markPopupAsViewed(currentPopup.id);
      setIsOpen(false);

      if (currentPopup.button_link.startsWith("http")) {
        window.open(currentPopup.button_link, "_blank", "noopener,noreferrer");
      } else {
        navigate(currentPopup.button_link);
      }
    }
  };

  if (!currentPopup) return null;

  const hasVideo = !!currentPopup.video_url;
  const hasImage = !!currentPopup.image_url;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 overflow-hidden gap-0 border-0">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-background/80 backdrop-blur-sm p-1.5 hover:bg-background transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Video */}
        {hasVideo && (
          <div className="w-full bg-black">
            <video
              src={currentPopup.video_url!}
              controls
              autoPlay
              playsInline
              className="w-full max-h-[60vh] object-contain"
            />
          </div>
        )}

        {/* Image (only if no video) */}
        {!hasVideo && hasImage && (
          <div className="w-full relative overflow-hidden bg-muted">
            <img
              src={currentPopup.image_url!}
              alt={currentPopup.title}
              className="w-full max-h-[60vh] object-contain"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-semibold leading-tight">
            {currentPopup.title}
          </h2>

          {currentPopup.description && (
            <div 
              className="text-muted-foreground text-sm leading-relaxed prose prose-sm max-w-none break-words overflow-x-hidden [&_a]:break-all [&_p]:mb-2 [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:mb-1 [&_br]:block [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_strong]:font-semibold [&_em]:italic" 
              dangerouslySetInnerHTML={{ __html: currentPopup.description }} 
            />
          )}

          {/* Action Button */}
          {currentPopup.has_button && currentPopup.button_text && (
            <Button
              onClick={handleButtonClick}
              className="w-full"
              size="lg"
            >
              {currentPopup.button_text}
              {currentPopup.button_link?.startsWith("http") && (
                <ExternalLink className="h-4 w-4 ml-2" />
              )}
            </Button>
          )}

          {/* Close text button if no action button */}
          {!currentPopup.has_button && (
            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full"
            >
              Entendi
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
