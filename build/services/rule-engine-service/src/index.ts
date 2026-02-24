// rule-engine-service/src/index.ts — entry point (stateless — no DB or Kafka)
import { buildApp } from "./app.js";

const PORT = Number(process.env.SERVICE_PORT ?? 3003);

const app = buildApp();

app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
