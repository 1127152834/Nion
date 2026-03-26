const DEFAULT_MAX_MESSAGES = 20;
const DEFAULT_WINDOW_MS = 60_000;

type Bucket = {
  timestamps: number[];
};

export class BridgeChatRateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxMessages = DEFAULT_MAX_MESSAGES,
    private readonly windowMs = DEFAULT_WINDOW_MS,
  ) {}

  async acquire(chatId: string): Promise<void> {
    const now = Date.now();
    const bucket = this.getOrCreate(chatId);
    this.prune(bucket, now);

    if (bucket.timestamps.length < this.maxMessages) {
      bucket.timestamps.push(now);
      return;
    }

    const oldest = bucket.timestamps[0];
    const waitMs = oldest + this.windowMs - now;
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const afterWait = Date.now();
    this.prune(bucket, afterWait);
    bucket.timestamps.push(afterWait);
  }

  cleanup() {
    const expiry = this.windowMs * 2;
    const now = Date.now();
    for (const [chatId, bucket] of this.buckets) {
      const latest = bucket.timestamps[bucket.timestamps.length - 1];
      if (!latest || now - latest > expiry) {
        this.buckets.delete(chatId);
      }
    }
  }

  private getOrCreate(chatId: string) {
    let bucket = this.buckets.get(chatId);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.buckets.set(chatId, bucket);
    }
    return bucket;
  }

  private prune(bucket: Bucket, now: number) {
    const cutoff = now - this.windowMs;
    while (bucket.timestamps.length > 0 && bucket.timestamps[0] <= cutoff) {
      bucket.timestamps.shift();
    }
  }
}
