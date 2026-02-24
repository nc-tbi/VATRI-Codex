// claim-orchestrator/src/events/publisher.ts — KafkaJS CloudEvents publisher (ADR-006)
// Topic: tax-core.claim.created
import type { Kafka } from "kafkajs";
import type { ClaimIntent } from "@tax-core/domain";

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

export class ClaimEventPublisher {
  private readonly producer;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer();
  }

  private async send(topic: string, key: string, value: string): Promise<void> {
    await this.producer.connect();
    await this.producer.send({ topic, messages: [{ key, value }] });
    await this.producer.disconnect();
  }

  async publishClaimCreated(claim: ClaimIntent, traceId: string): Promise<void> {
    await this.send(
      "tax-core.claim.created",
      claim.claim_id,
      cloudEvent("tax-core.claim.created", "/claim-orchestrator", traceId, {
        claim_id: claim.claim_id,
        filing_id: claim.filing_id,
        taxpayer_id: claim.taxpayer_id,
        idempotency_key: claim.idempotency_key,
        result_type: claim.result_type,
        claim_amount: claim.claim_amount,
        assessment_version: claim.assessment_version,
      })
    );
  }
}
