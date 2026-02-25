// filing-service/src/events/publisher.ts — KafkaJS CloudEvents publisher (ADR-001, ADR-006)
// Topics: tax-core.filing.received, tax-core.filing.assessed, tax-core.claim.created
import type { Kafka } from "kafkajs";
import type { CanonicalFiling, StagedAssessment, ClaimIntent } from "@tax-core/domain";

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

  async publishFilingAssessed(assessment: StagedAssessment, traceId: string): Promise<void> {
    await this.send(
      "tax-core.filing.assessed",
      assessment.filing_id,
      cloudEvent("tax-core.filing.assessed", "/filing-service", traceId, {
        filing_id: assessment.filing_id,
        result_type: assessment.result_type,
        stage4_net_vat: assessment.stage4_net_vat,
        claim_amount: assessment.claim_amount,
        rule_version_id: assessment.rule_version_id,
      })
    );
  }

  async publishClaimCreated(claim: ClaimIntent, traceId: string): Promise<void> {
    await this.send(
      "tax-core.claim.created",
      claim.claim_id,
      cloudEvent("tax-core.claim.created", "/filing-service", traceId, {
        claim_id: claim.claim_id,
        filing_id: claim.filing_id,
        taxpayer_id: claim.taxpayer_id,
        result_type: claim.result_type,
        claim_amount: claim.claim_amount,
      })
    );
  }
}
