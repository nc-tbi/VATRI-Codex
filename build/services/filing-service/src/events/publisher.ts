// filing-service/src/events/publisher.ts — KafkaJS CloudEvents publisher (ADR-001, ADR-006)
// Topic: tax-core.filing.received (sole publisher per Phase 3 freeze — design/03-phase-3-contract-freeze.md §7.1)
// Retired in Phase 3: tax-core.filing.assessed (now owned by assessment-service)
//                     tax-core.claim.created   (now owned by claim-orchestrator)
import type { Kafka } from "kafkajs";
import type { CanonicalFiling } from "@tax-core/domain";

function cloudEvent<T>(type: string, source: string, traceId: string, data: T): string {
  return JSON.stringify({
    specversion: "1.0",
    id: crypto.randomUUID(),
    type,
    source,
    time: new Date().toISOString(),
    datacontenttype: "application/json",
    traceparent: traceId,
    data,
  });
}

export class FilingEventPublisher {
  private readonly producer;
  private connected = false;
  private connectPromise: Promise<void> | null = null;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer();
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected) return;
    if (!this.connectPromise) {
      this.connectPromise = this.producer.connect().then(() => {
        this.connected = true;
      });
    }
    await this.connectPromise;
  }

  private async send(topic: string, key: string, value: string): Promise<void> {
    await this.ensureConnected();
    try {
      await this.producer.send({ topic, messages: [{ key, value }] });
    } catch (err) {
      this.connected = false;
      this.connectPromise = null;
      throw err;
    }
  }

  async publishFilingReceived(filing: CanonicalFiling, traceId: string): Promise<void> {
    await this.send(
      "tax-core.filing.received",
      filing.filing_id,
      cloudEvent("tax-core.filing.received", "/filing-service", traceId, {
        filing_id: filing.filing_id,
        taxpayer_id: filing.taxpayer_id,
        filing_type: filing.filing_type,
        tax_period_end: filing.tax_period_end,
        rule_version_id: filing.rule_version_id,
      })
    );
  }
}
