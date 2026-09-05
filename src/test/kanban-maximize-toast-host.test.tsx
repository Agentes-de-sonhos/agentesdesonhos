import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast as sonnerToast } from "sonner";
import { toast as legacyToast } from "@/hooks/use-toast";
import {
  KanbanMaximizeProvider,
  useKanbanMaximize,
} from "@/components/crm/kanban/KanbanMaximizeContext";
import { KanbanMaximizeSurface } from "@/components/crm/kanban/KanbanMaximizeSurface";
import { getToastHost } from "@/components/ui/toast-host";

vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light" }) }));

function Harness({ label }: { label: string }) {
  const { isMaximized, toggle, exit } = useKanbanMaximize();
  return (
    <KanbanMaximizeSurface>
      <button onClick={toggle}>{`toggle-${label}`}</button>
      <button onClick={exit}>{`exit-${label}`}</button>
      <span>{`state-${label}-${isMaximized}`}</span>
    </KanbanMaximizeSurface>
  );
}

function App({ label = "a" }: { label?: string }) {
  return (
    <>
      <KanbanMaximizeProvider>
        <Harness label={label} />
      </KanbanMaximizeProvider>
      <Toaster />
      <Sonner />
    </>
  );
}

const surface = () => document.querySelector('[data-testid="kanban-maximize-surface"]') as HTMLElement;

describe("toasts com Kanban maximizado", () => {
  beforeEach(() => {
    // fullscreen indisponível: exercita o fallback `fixed`
    // @ts-expect-error jsdom
    Element.prototype.requestFullscreen = undefined;
  });

  it("mantém um único host de cada sistema e move para a superfície ao maximizar", async () => {
    const { unmount } = render(<App />);
    expect(getToastHost()).toBeNull();

    act(() => {
      legacyToast({ title: "Salvo com sucesso" });
      sonnerToast.error("Sem permissão");
    });
    // hosts padrão (fora da superfície)
    await waitFor(() =>
      expect(document.querySelectorAll('section[aria-label^="Notifications"]').length).toBe(1)
    );
    expect(surface().querySelector('section[aria-label^="Notifications"]')).toBeNull();

    act(() => {
      screen.getByText("toggle-a").click();
    });

    expect(getToastHost()).toBe(surface());
    await waitFor(() =>
      expect(surface().querySelectorAll("[data-toast-host]").length).toBe(1)
    );
    expect(document.querySelectorAll("[data-toast-host]").length).toBe(1);
    expect(document.querySelectorAll('section[aria-label^="Notifications"]').length).toBe(1);
    // viewport do shadcn também dentro da superfície
    expect(surface().textContent).toContain("Salvo com sucesso");
    expect(surface().textContent).toContain("Sem permissão");

    // erro emitido enquanto maximizado (ex.: falha ao salvar anotação) fica visível
    act(() => {
      sonnerToast.error("Erro ao salvar anotação");
    });
    await waitFor(() =>
      expect(surface().textContent).toContain("Erro ao salvar anotação")
    );

    // sair restaura o host habitual, sem duplicar
    act(() => {
      screen.getByText("exit-a").click();
    });
    expect(getToastHost()).toBeNull();
    expect(document.querySelectorAll("[data-toast-host]").length).toBe(1);
    expect(surface().querySelector("[data-toast-host]")).toBeNull();
    // nada é perdido nem repetido ao voltar
    expect(document.body.textContent).toContain("Erro ao salvar anotação");

    unmount();
    expect(getToastHost()).toBeNull();
  });

  it("Esc e desmontagem liberam o host", () => {
    const { unmount } = render(<App label="b" />);
    act(() => {
      screen.getByText("toggle-b").click();
    });
    expect(getToastHost()).not.toBeNull();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(getToastHost()).toBeNull();

    act(() => {
      screen.getByText("toggle-b").click();
    });
    expect(getToastHost()).not.toBeNull();
    unmount();
    expect(getToastHost()).toBeNull();
  });

  it("trocar de quadro (Oportunidades -> Operações) aponta para a superfície ativa", async () => {
    const first = render(<App label="op" />);
    act(() => {
      screen.getByText("toggle-op").click();
    });
    const firstHost = getToastHost();
    expect(firstHost).not.toBeNull();

    first.unmount();
    expect(getToastHost()).toBeNull();

    const second = render(<App label="ope" />);
    act(() => {
      screen.getByText("toggle-ope").click();
    });
    expect(getToastHost()).not.toBe(firstHost);
    act(() => {
      sonnerToast.success("Movido");
    });
    await waitFor(() =>
      expect(getToastHost()!.querySelectorAll("[data-toast-host]").length).toBe(1)
    );
    expect(document.querySelectorAll("[data-toast-host]").length).toBe(1);
    second.unmount();
  });
});
