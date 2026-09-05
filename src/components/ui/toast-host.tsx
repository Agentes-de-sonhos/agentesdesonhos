import * as React from "react";

/**
 * Host compartilhado das notificações (shadcn Toaster e Sonner).
 *
 * Em superfícies maximizadas / fullscreen nativo nada fora do elemento em tela
 * cheia é exibido. Para não duplicar toasters por quadro, os hosts continuam
 * montados uma única vez em App.tsx e apenas mudam de container: quando uma
 * superfície reivindica o host, os dois sistemas passam a renderizar dentro
 * dela; ao sair/desmontar, voltam para o container padrão (document.body).
 */
type Listener = (el: HTMLElement | null) => void;

let currentHost: HTMLElement | null = null;
let currentOwner: unknown = null;
let containerEl: HTMLElement | null = null;
const listeners = new Set<Listener>();

/**
 * Container estável (um único nó) onde os toasters são renderizados via portal.
 * Ao mudar de host apenas movemos este nó no DOM — os componentes não são
 * remontados, então nenhuma notificação em tela é perdida ou repetida.
 */
export function getToastContainer(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  if (!containerEl || !containerEl.isConnected) {
    containerEl = document.createElement("div");
    containerEl.setAttribute("data-toast-host", "");
    (currentHost ?? document.body).appendChild(containerEl);
  }
  return containerEl;
}

function moveContainer() {
  const el = getToastContainer();
  if (!el) return;
  const parent = currentHost ?? document.body;
  if (el.parentNode !== parent) parent.appendChild(el);
}

function emit() {
  moveContainer();
  listeners.forEach((l) => l(currentHost));
}

/** Reivindica o host de notificações para uma superfície (último ganha). */
export function claimToastHost(owner: unknown, el: HTMLElement | null) {
  if (!el) {
    releaseToastHost(owner);
    return;
  }
  currentOwner = owner;
  if (currentHost !== el) {
    currentHost = el;
    emit();
  }
}

/** Libera o host apenas se o dono atual for quem está pedindo. */
export function releaseToastHost(owner: unknown) {
  if (currentOwner !== owner) return;
  currentOwner = null;
  if (currentHost !== null) {
    currentHost = null;
    emit();
  }
}

export function getToastHost() {
  return currentHost;
}

/** Container atual dos toasts (null = comportamento padrão em document.body). */
export function useToastHost(): HTMLElement | null {
  const [host, setHost] = React.useState<HTMLElement | null>(currentHost);
  React.useEffect(() => {
    setHost(currentHost);
    const listener: Listener = (el) => setHost(el);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return host;
}

/** Container estável dos toasters (portal). */
export function useToastContainer(): HTMLElement | null {
  const [el, setEl] = React.useState<HTMLElement | null>(() => getToastContainer());
  React.useEffect(() => {
    setEl(getToastContainer());
  }, []);
  useToastHost();
  return el;
}
