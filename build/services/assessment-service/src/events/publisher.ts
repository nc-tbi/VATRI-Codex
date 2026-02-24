// assessment-service/src/events/publisher.ts — KafkaJS CloudEvents publisher (ADR-006)
// Topic: tax-core.filing.assessed
import type { Kafka } from "kafkajs";
import type { StagedAssessment } from "@tax-core/domain";

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

export class AssessmentEventPublisher {
  private readonly producer;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer();
  }

  private async send(topic: string, key: string, value: string): Promise<void> {
    await this.producer.connect();
    await this.producer.send({ topic, messages: [{ key, value }] });
    await this.producer.disconnect();
  }

  async publishAssessed(assessment: StagedAssessment, traceId: string): Promise<void> {
    await this.send(
      "tax-core.filing.assessed",
      assessment.filing_id,
      cloudEvent("tax-core.filing.assessed", "/assessment-service", traceId, {
        filing_id: assessment.filing_id,
        result_type: assessment.result_type,
        stage1_gross_output_vat: assessment.stage1_gross_output_vat,
        stage2_total_deductible_input_vat: assessment.stage2_total_deductible_input_vat,
        stage3_pre_adjustment_net_vat: assessment.stage3_pre_adjustment_net_vat,
        stage4_net_vat: assessment.stage4_net_vat,
        claim_amount: assessment.claim_amount,
        rule_version_id: assessment.rule_version_id,
      })
    );
  }
}
