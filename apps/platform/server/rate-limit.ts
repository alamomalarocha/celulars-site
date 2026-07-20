interface RateBucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  readonly #buckets = new Map<string, RateBucket>();

  constructor(private readonly limit = 5, private readonly windowMs = 15 * 60 * 1000) {}

  consume(key: string, now = Date.now()): boolean {
    const current = this.#buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.#buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (current.count >= this.limit) return false;
    current.count += 1;
    return true;
  }

  reset(key: string): void {
    this.#buckets.delete(key);
  }
}
