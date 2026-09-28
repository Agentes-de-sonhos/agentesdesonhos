import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom não implementa IntersectionObserver; carrosséis (embla) o exigem.
if (!("IntersectionObserver" in window)) {
  class MockIntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];
    constructor(private readonly cb?: IntersectionObserverCallback) {}
    observe(target: Element) {
      // Dispara imediatamente: em jsdom nada entra em viewport por conta própria.
      this.cb?.([{ isIntersecting: true, target } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: MockIntersectionObserver,
  });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    writable: true,
    value: MockIntersectionObserver,
  });
}

// jsdom não implementa ResizeObserver; carrosséis (embla) o exigem.
if (!("ResizeObserver" in globalThis)) {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", { writable: true, value: MockResizeObserver });
  Object.defineProperty(window, "ResizeObserver", { writable: true, value: MockResizeObserver });
}
