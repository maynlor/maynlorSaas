import { PostHog } from "posthog-node";
import type { ProductTracker } from "./ProductTracker.js";

export class PostHogTracker implements ProductTracker {
  private readonly client: PostHog;

  constructor(apiKey: string, host: string) {
    this.client = new PostHog(apiKey, { host, flushAt: 1, flushInterval: 0 });
  }

  track(distinctId: string, event: string, properties?: Record<string, unknown>): void {
    this.client.capture({ distinctId, event, properties: properties ?? {} });
  }

  identify(distinctId: string, properties?: Record<string, unknown>): void {
    this.client.identify({ distinctId, properties: properties ?? {} });
  }
}
