// obligation-service/src/events/publisher.ts — KafkaJS CloudEvents publisher (ADR-006)
// Topics: tax-core.obligation.created, tax-core.obligation.overdue,
//         tax-core.preliminary-assessment.triggered, tax-core.preliminary-assessment.superseded
import type { Kafka } from "kafkajs";
import type { ObligationRecord, PreliminaryAssessmentRecord } from "@tax-core/domain";

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

export class ObligationEventPublisher {
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

  async publishObligationCreated(obligation: ObligationRecord, traceId: string): Promise<void> {
    await this.send(
      "tax-core.obligation.created",
      obligation.obligation_id,
      cloudEvent("tax-core.obligation.created", "/obligation-service", traceId, {
        obligation_id: obligation.obligation_id,
        taxpayer_id: obligation.taxpayer_id,
        tax_period_start: obligation.tax_period_start,
        tax_period_end: obligation.tax_period_end,
        cadence: obligation.cadence,
        due_date: obligation.due_date,
        state: obligation.state,
      }),
    );
  }

  async publishObligationOverdue(obligation: ObligationRecord, traceId: string): Promise<void> {
    await this.send(
      "tax-core.obligation.overdue",
      obligation.obligation_id,
      cloudEvent("tax-core.obligation.overdue", "/obligation-service", traceId, {
        obligation_id: obligation.obligation_id,
        taxpayer_id: obligation.taxpayer_id,
        tax_period_end: obligation.tax_period_end,
        due_date: obligation.due_date,
      }),
    );
  }

  async publishPreliminaryTriggered(
    preliminary: PreliminaryAssessmentRecord,
    traceId: string,
  ): Promise<void> {
    await this.send(
      "tax-core.preliminary-assessment.triggered",
      preliminary.preliminary_assessment_id,
      cloudEvent("tax-core.preliminary-assessment.triggered", "/obligation-service", traceId, {
        preliminary_assessment_id: preliminary.preliminary_assessment_id,
        obligation_id: preliminary.obligation_id,
        taxpayer_id: preliminary.taxpayer_id,
        tax_period_end: preliminary.tax_period_end,
        estimated_net_vat: preliminary.estimated_net_vat,
      }),
    );
  }

  async publishPreliminarySuperseded(
    preliminary: PreliminaryAssessmentRecord,
    traceId: string,
  ): Promise<void> {
    await this.send(
      "tax-core.preliminary-assessment.superseded",
      preliminary.preliminary_assessment_id,
      cloudEvent("tax-core.preliminary-assessment.superseded", "/obligation-service", traceId, {
        preliminary_assessment_id: preliminary.preliminary_assessment_id,
        obligation_id: preliminary.obligation_id,
        taxpayer_id: preliminary.taxpayer_id,
        superseding_filing_id: preliminary.superseding_filing_id,
        final_net_vat: preliminary.final_assessment?.stage4_net_vat,
        superseded_at: preliminary.superseded_at,
      }),
    );
  }
}
