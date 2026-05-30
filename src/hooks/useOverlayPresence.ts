import { useEffect, useState } from "react";

/**
 * Detects whether any overlay UI (modal, drawer, sheet, expanded sidebar)
 * is currently open. Floating elements (support button, chat button) can
 * use this to hide themselves and avoid overlapping the foreground UI.
 *
 * Signals:
 * - Radix Dialog/Sheet/Drawer open → `[role="dialog"][data-state="open"]`
 *   or `body[data-scroll-locked]`
 * - Expanded desktop sidebar → `#app-sidebar` width > 80px
 */
export function useOverlayPresence(): boolean {
  const [hasOverlay, setHasOverlay] = useState(false);

  useEffect(() => {
    const check = () => {
      const dialogOpen = !!document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
      );
      const bodyLocked = document.body.hasAttribute("data-scroll-locked");

      let sidebarExpanded = false;
      const sidebar = document.getElementById("app-sidebar");
      if (sidebar) {
        const val = getComputedStyle(sidebar).getPropertyValue(
          "--sidebar-current-width"
        );
        const parsed = parseInt(val, 10);
        if (!Number.isNaN(parsed) && parsed > 80) sidebarExpanded = true;
      }

      setHasOverlay(dialogOpen || bodyLocked || sidebarExpanded);
    };

    check();

    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "data-scroll-locked", "style", "class"],
    });

    return () => observer.disconnect();
  }, []);

  return hasOverlay;
}
