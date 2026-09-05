/**
 * Barra de endereço do workspace de abas.
 *
 * O shell espelha o caminho da aba ativa na URL. Montagens sob prefixo (Site
 * Lab) passam um conversor interno -> externo; nos demais contextos o padrão é
 * identidade e nada muda. Dados sintéticos, sem rede.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { WorkspaceProvider, useWorkspace } from "@/workspace/WorkspaceProvider";
import { WorkspaceShell } from "@/workspace/WorkspaceShell";
import { agencyAdminMount } from "@/lib/agencyAdmin";
import { isSiteLabAdminPath } from "@/lib/sitelabModels";

const SITELAB = "/sitelab-base";

let ctl: ReturnType<typeof useWorkspace> | null = null;
function Probe() {
  ctl = useWorkspace();
  return null;
}

function mount(opts: {
  homePath: string;
  initialPath: string;
  toExternalPath?: (p: string) => string;
}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  let root: Root;
  act(() => {
    root = createRoot(host);
    root.render(
      <WorkspaceProvider
        initialPath={opts.initialPath}
        initialTitle="Inicial"
        homePath={opts.homePath}
      >
        <WorkspaceShell showTabBar={false} toExternalPath={opts.toExternalPath}>
          <Probe />
        </WorkspaceShell>
      </WorkspaceProvider>,
    );
  });
  return () => act(() => root.unmount());
}

const url = () =>
  window.location.pathname + window.location.search + window.location.hash;

beforeEach(() => {
  ctl = null;
  window.history.replaceState(null, "", "/");
});

describe("WorkspaceShell — espelho da URL", () => {
  it("1. Site Lab: mantém o prefixo ao abrir e trocar abas, sem duplicar", () => {
    const mountCfg = agencyAdminMount(SITELAB);
    window.history.replaceState(null, "", `${SITELAB}/gestao`);
    const unmount = mount({
      homePath: "/gestao",
      initialPath: "/gestao",
      toExternalPath: mountCfg.toExternal,
    });

    expect(url()).toBe(`${SITELAB}/gestao`);

    act(() => {
      ctl!.openOrActivateTab("/gestao/meus-projetos?tab=orcamentos#secao", "Projetos");
    });
    expect(url()).toBe(`${SITELAB}/gestao/meus-projetos?tab=orcamentos#secao`);
    expect(url().match(/sitelab-base/g)?.length).toBe(1);
    expect(isSiteLabAdminPath(window.location.pathname)).toBe(true);

    // A aba interna (MemoryRouter/menu) continua sem prefixo.
    const active = ctl!.tabs.find((t) => t.id === ctl!.activeId)!;
    expect(active.path).toBe("/gestao/meus-projetos?tab=orcamentos#secao");

    // Voltar para a aba inicial devolve a URL prefixada da home.
    act(() => ctl!.activateTab("tab_home"));
    expect(url()).toBe(`${SITELAB}/gestao`);

    // Fechar a aba ativa: a URL acompanha a nova aba ativa, ainda prefixada.
    act(() => {
      ctl!.openOrActivateTab("/gestao/agenda", "Agenda");
    });
    expect(url()).toBe(`${SITELAB}/gestao/agenda`);
    act(() => ctl!.closeTab(ctl!.activeId!));
    expect(url().startsWith(`${SITELAB}/gestao`)).toBe(true);
    expect(url().match(/sitelab-base/g)?.length).toBe(1);
    unmount();
  });

  it("1b. remontar a partir da URL externa preserva a rota interna", () => {
    const mountCfg = agencyAdminMount(SITELAB);
    const external = `${SITELAB}/gestao/meus-projetos?tab=orcamentos#secao`;
    window.history.replaceState(null, "", external);

    const internal = `${mountCfg.toInternal(window.location.pathname)}${window.location.search}${window.location.hash}`;
    expect(internal).toBe("/gestao/meus-projetos?tab=orcamentos#secao");

    const unmount = mount({
      homePath: "/gestao",
      initialPath: internal,
      toExternalPath: mountCfg.toExternal,
    });
    // URL já correta: nada é reescrito e o prefixo continua único.
    expect(url()).toBe(external);
    expect(isSiteLabAdminPath(window.location.pathname)).toBe(true);
    unmount();
  });

  it("2. domínio da agência (sem prefixo): /gestao/... permanece idêntico", () => {
    const mountCfg = agencyAdminMount(undefined);
    window.history.replaceState(null, "", "/gestao");
    const unmount = mount({
      homePath: "/gestao",
      initialPath: "/gestao",
      toExternalPath: mountCfg.toExternal,
    });
    act(() => {
      ctl!.openOrActivateTab("/gestao/meus-projetos?tab=orcamentos", "Projetos");
    });
    expect(url()).toBe("/gestao/meus-projetos?tab=orcamentos");
    expect(url()).not.toContain("sitelab-base");
    unmount();
  });

  it("3. plataforma padrão (sem conversor): caminho intacto", () => {
    window.history.replaceState(null, "", "/dashboard");
    const unmount = mount({ homePath: "/dashboard", initialPath: "/dashboard" });
    act(() => {
      ctl!.openOrActivateTab("/meus-projetos?tab=orcamentos", "Projetos");
    });
    expect(url()).toBe("/meus-projetos?tab=orcamentos");
    expect(url()).not.toContain("sitelab-base");
    unmount();
  });
});
