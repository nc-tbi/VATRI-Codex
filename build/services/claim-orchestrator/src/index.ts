// claim-orchestrator/src/index.ts — entry point
import postgres from "postgres";
import { Kafka } from "kafkajs";
import { buildApp } from "./app.js";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://tax_user:tax_pass@localhost:5432/tax_core";
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
const PORT = Number(process.env.SERVICE_PORT ?? 3006);

const sql = postgres(DATABASE_URL, { max: 10 });
const kafka = new Kafka({ clientId: "claim-orchestrator", brokers: KAFKA_BROKERS });

const app = buildApp({ sql, kafka });

app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
