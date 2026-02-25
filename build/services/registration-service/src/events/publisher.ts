// registration-service/src/events/publisher.ts — KafkaJS CloudEvents publisher (ADR-006)
// Topics: tax-core.registration.created, tax-core.registration.deregistered,
//         tax-core.registration.transferred
import type { Kafka } from "kafkajs";
import type { RegistrationRecord } from "@tax-core/domain";

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

export class RegistrationEventPublisher {
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

  async publishRegistrationCreated(registration: RegistrationRecord, traceId: string): Promise<void> {
    await this.send(
      "tax-core.registration.created",
      registration.registration_id,
      cloudEvent("tax-core.registration.created", "/registration-service", traceId, {
        registration_id: registration.registration_id,
        taxpayer_id: registration.taxpayer_id,
        cvr_number: registration.cvr_number,
        status: registration.status,
        cadence: registration.cadence,
        annual_turnover_dkk: registration.annual_turnover_dkk,
      }),
    );
  }

  async publishRegistrationDeregistered(
    registration: RegistrationRecord,
    traceId: string,
  ): Promise<void> {
    await this.send(
      "tax-core.registration.deregistered",
      registration.registration_id,
      cloudEvent("tax-core.registration.deregistered", "/registration-service", traceId, {
        registration_id: registration.registration_id,
        taxpayer_id: registration.taxpayer_id,
        cvr_number: registration.cvr_number,
        deregistered_at: registration.deregistered_at,
      }),
    );
  }

  async publishRegistrationTransferred(
    registration: RegistrationRecord,
    to_taxpayer_id: string,
    traceId: string,
  ): Promise<void> {
    await this.send(
      "tax-core.registration.transferred",
      registration.registration_id,
      cloudEvent("tax-core.registration.transferred", "/registration-service", traceId, {
        registration_id: registration.registration_id,
        from_taxpayer_id: registration.taxpayer_id,
        to_taxpayer_id,
        cvr_number: registration.cvr_number,
      }),
    );
  }
}
