import { useEffect, type RefObject } from "react";
/** Technical presentation only; absent rules leave the reference DOM untouched. */
export function usePresentationTextRewrite(ref: RefObject<HTMLElement>, rules?: [string, string][]) {
  useEffect(() => {
    const root = ref.current;
    if (!root || !rules?.length) return;
    const apply = (value: string) => rules.reduce((out, [from, to]) => out.split(from).join(to), value);
    const run = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const next = apply(node.nodeValue ?? "");
        if (next !== node.nodeValue) node.nodeValue = next;
      }
      root.querySelectorAll<HTMLElement>("[alt],[aria-label]").forEach(element => {
        for (const attribute of ["alt", "aria-label"]) {
          const value = element.getAttribute(attribute);
          if (value && apply(value) !== value) element.setAttribute(attribute, apply(value));
        }
      });
    };
    run();
    const observer = new MutationObserver(run);
    observer.observe(root, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [ref, rules]);
}
