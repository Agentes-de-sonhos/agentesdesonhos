import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubMedSnowHomeSection } from "@/components/whitelabel/ClubMedSnowHomeSection";
import { ARENA_PREVIEW_PROFILE, MUNDO_EM_CORES_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";
vi.mock("@/lib/agencyContextLink", () => ({ agencySiteHref: (path: string) => path }));
let intersection: IntersectionObserverCallback;
const disconnect = vi.fn();
const play = vi.fn().mockResolvedValue(undefined);
const pause = vi.fn();
const originalObserver = globalThis.IntersectionObserver;
beforeEach(() => {
  play.mockResolvedValue(undefined);
  globalThis.IntersectionObserver = class {
    root = null;
    rootMargin = "";
    scrollMargin = "";
    thresholds = [0.35];
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      intersection = callback;
      expect(options?.threshold).toBe(0.35);
    }
    observe() {}
    unobserve() {}
    takeRecords() { return []; }
    disconnect = disconnect;
  };
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
});
afterEach(() => { cleanup(); globalThis.IntersectionObserver = originalObserver; vi.restoreAllMocks(); vi.clearAllMocks(); });
const config = ARENA_PREVIEW_PROFILE.clubMedSnowHome;
if (!config) throw new Error("Arena Club Med configuration missing");

describe("chamada Club Med na home Arena", () => {
  it("mostra o vídeo MP4 em player próprio, sem iframe nem foto do Rafael", () => {
    const { container } = render(<ClubMedSnowHomeSection config={config} container="max-w-6xl" agencyName="Arena Travel Group" />);
    const video = screen.getByLabelText("Club Med — férias de esqui");
    expect(video.tagName).toBe("VIDEO");
    expect(video).toHaveAttribute("src", expect.stringContaining("club-med-all-inclusive-ski-vacations.mp4"));
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video).not.toHaveAttribute("autoplay");
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.queryByAltText(/Rafael Souza/)).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="rafael"]')).toBeNull();
  });
  it("conecta os seis países e o catálogo, com opt-in exclusivo da Arena", () => {
    render(<ClubMedSnowHomeSection config={config} container="max-w-6xl" agencyName="Arena Travel Group" />);
    expect(screen.getByRole("link", { name: "França" })).toHaveAttribute("href", "/club-med-neve?pais=franca");
    expect(screen.getByRole("link", { name: "Japão" })).toHaveAttribute("href", "/club-med-neve?pais=japao");
    expect(screen.getByRole("list", { name: "Países dos resorts Club Med na neve" }).children).toHaveLength(6);
    expect(screen.getByRole("link", { name: /Conheça os resorts/ })).toHaveAttribute("href", "/club-med-neve");
    expect(MUNDO_EM_CORES_PREVIEW_PROFILE.clubMedSnowHome).toBeUndefined();
  });
  it("plays muted only at 35% visibility, pauses outside and cleans up", () => {
    const { unmount } = render(<ClubMedSnowHomeSection config={config} container="max-w-6xl" agencyName="Arena Travel Group" />);
    const video = screen.getByLabelText("Club Med — férias de esqui") as HTMLVideoElement;
    expect(video.muted).toBe(true);
    expect(play).not.toHaveBeenCalled();
    const notify = (ratio: number) => intersection([{ isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry], {} as IntersectionObserver);
    notify(0.34);
    expect(play).not.toHaveBeenCalled();
    notify(0.35);
    expect(play).toHaveBeenCalledTimes(1);
    notify(0);
    expect(pause).toHaveBeenCalledTimes(2);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(pause).toHaveBeenCalledTimes(3);
  });
});
