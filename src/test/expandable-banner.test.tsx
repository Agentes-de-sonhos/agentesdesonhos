import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ExpandableBanner } from "@/components/ui/expandable-banner";

beforeAll(() => {
  window.matchMedia = ((q: string) => ({
    matches: q.includes("hover: hover"),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

function setup(props = {}) {
  return render(<ExpandableBanner src="/a.jpg" alt="Banner" {...props} />);
}

describe("ExpandableBanner", () => {
  it("renders collapsed initially", () => {
    setup();
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(btn.textContent).toContain("Ver banner completo");
  });

  it("expands on hover and collapses after delay on mouse leave", () => {
    vi.useFakeTimers();
    const { container } = setup();
    const root = container.firstElementChild as HTMLElement;
    fireEvent.mouseEnter(root);
    expect(root.dataset.expanded).toBe("true");
    fireEvent.mouseLeave(root);
    expect(root.dataset.expanded).toBe("true");
    act(() => { vi.advanceTimersByTime(300); });
    expect(root.dataset.expanded).toBe("true");
    act(() => { vi.advanceTimersByTime(200); });
    expect(root.dataset.expanded).toBe("false");
    vi.useRealTimers();
  });

  it("cancels collapse if the cursor returns", () => {
    vi.useFakeTimers();
    const { container } = setup();
    const root = container.firstElementChild as HTMLElement;
    fireEvent.mouseEnter(root);
    fireEvent.mouseLeave(root);
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.mouseEnter(root);
    act(() => { vi.advanceTimersByTime(600); });
    expect(root.dataset.expanded).toBe("true");
    vi.useRealTimers();
  });

  it("toggles via explicit control and keeps aria wiring", () => {
    const { container } = setup();
    const root = container.firstElementChild as HTMLElement;
    const btn = screen.getByRole("button");
    const panel = container.querySelector(`#${btn.getAttribute("aria-controls")}`);
    expect(panel).toBeTruthy();
    fireEvent.click(btn);
    expect(root.dataset.expanded).toBe("true");
    expect(btn.textContent).toContain("Recolher");
    fireEvent.click(btn);
    expect(root.dataset.expanded).toBe("false");
  });

  it("activates the CTA without toggling expansion", () => {
    const onActivate = vi.fn();
    const { container } = setup({ onActivate });
    const root = container.firstElementChild as HTMLElement;
    fireEvent.click(screen.getByRole("link"));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(root.dataset.expanded).toBe("false");
  });

  it("uses a 25% bottom strip by default", () => {
    const { container } = setup({ fallbackRatio: 0.4 });
    const panel = container.querySelector("[id^=expandable-banner]") as HTMLElement;
    expect(panel.style.paddingBottom).toBe("10%");
  });
});
