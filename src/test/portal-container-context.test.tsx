import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  PortalContainerProvider,
  usePortalContainer,
} from "@/components/ui/portal-container-context";

function Probe({ onValue }: { onValue: (v: HTMLElement | undefined) => void }) {
  onValue(usePortalContainer());
  return null;
}

describe("portal container context", () => {
  it("returns undefined by default (Radix usa document.body)", () => {
    let value: HTMLElement | undefined | "unset" = "unset";
    render(<Probe onValue={(v) => (value = v)} />);
    expect(value).toBeUndefined();
  });

  it("returns the provided surface element", () => {
    const el = document.createElement("div");
    let value: HTMLElement | undefined;
    render(
      <PortalContainerProvider container={el}>
        <Probe onValue={(v) => (value = v)} />
      </PortalContainerProvider>
    );
    expect(value).toBe(el);
  });

  it("volta ao padrão quando o container é null", () => {
    let value: HTMLElement | undefined | "unset" = "unset";
    render(
      <PortalContainerProvider container={null}>
        <Probe onValue={(v) => (value = v)} />
      </PortalContainerProvider>
    );
    expect(value).toBeUndefined();
  });
});
