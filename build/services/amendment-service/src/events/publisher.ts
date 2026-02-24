// amendment-service/src/events/publisher.ts — KafkaJS CloudEvents publisher (ADR-006)
// Topic: tax-core.amendment.created
import type { Kafka } from "kafkajs";
import type { AmendmentRecord } from "@tax-core/domain";

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

export class AmendmentEventPublisher {
  private readonly producer;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer();
  }

  private async send(topic: string, key: string, value: string): Promise<void> {
    await this.producer.connect();
    await this.producer.send({ topic, messages: [{ key, value }] });
    await this.producer.disconnect();
  }

  async publishAmendmentCreated(amendment: AmendmentRecord, traceId: string): Promise<void> {
    await this.send(
      "tax-core.amendment.created",
      amendment.amendment_id,
      cloudEvent("tax-core.amendment.created", "/amendment-service", traceId, {
        amendment_id: amendment.amendment_id,
        original_filing_id: amendment.original_filing_id,
        taxpayer_id: amendment.taxpayer_id,
        delta_net_vat: amendment.delta_net_vat,
        delta_classification: amendment.delta_classification,
        new_claim_required: amendment.new_claim_required,
        new_assessment_version: amendment.new_assessment_version,
      })
    );
  }
}
