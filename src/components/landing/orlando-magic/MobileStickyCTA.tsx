import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FORM_ANCHOR_ID, scrollToForm } from "./content";

export function MobileStickyCTA() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const target = document.getElementById(FORM_ANCHOR_ID);
    if (!target) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.15 }
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  if (!visible) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-2xl backdrop-blur lg:hidden"
    >
      <Button
        onClick={scrollToForm}
        className="h-12 w-full rounded-xl bg-blue-600 text-sm font-bold uppercase tracking-wide text-white hover:bg-blue-700"
      >
        VER JOGOS NAS MINHAS DATAS
      </Button>
    </div>
  );
}
