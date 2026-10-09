export interface NetworkProbe {
  start(): void;
  reset(): void;
  count(): number;
  measure<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }>;
}

export class CountingNetworkProbe implements NetworkProbe {
  private requests = 0;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    const originalFetch = window.fetch.bind(window);
    window.fetch = ((...args: Parameters<typeof fetch>) => {
      this.requests += 1;
      return originalFetch(...args);
    }) as typeof fetch;

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      ...args: unknown[]
    ) {
      probe.requests += 1;
      return (originalOpen as (...a: unknown[]) => void).apply(this, args);
    } as typeof XMLHttpRequest.prototype.open;

    const originalSendBeacon = navigator.sendBeacon?.bind(navigator);
    if (originalSendBeacon) {
      navigator.sendBeacon = (...args: Parameters<typeof originalSendBeacon>) => {
        this.requests += 1;
        return originalSendBeacon(...args);
      };
    }
  }

  count(): number {
    return this.requests;
  }

  reset(): void {
    this.requests = 0;
  }

  async measure<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
    const t0 = performance.now();
    const result = await fn();
    return { result, ms: performance.now() - t0 };
  }
}

const probe = new CountingNetworkProbe();
export default probe;
