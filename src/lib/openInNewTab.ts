/**
 * Abre um caminho interno em uma nova aba do navegador, mantendo a aba atual
 * intacta (sem trocar rota, aba ativa ou perder rascunhos em edição).
 *
 * Usa sempre `noopener,noreferrer` para não expor `window.opener`.
 */
export function openInNewTab(path: string): void {
  if (typeof window === "undefined") return;
  window.open(path, "_blank", "noopener,noreferrer");
}
