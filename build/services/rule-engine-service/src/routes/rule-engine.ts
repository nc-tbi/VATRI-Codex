// rule-engine-service/src/routes/rule-engine.ts — stateless rule evaluation
// POST /rule-evaluations → evaluateRules()
// GET  /rules             → dkVatRuleCatalog.resolveActiveRules()
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { evaluateRules, dkVatRuleCatalog, type CanonicalFiling } from "@tax-core/domain";

export async function ruleEngineRoutes(app: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  // POST /rule-evaluations
  app.post<{ Body: { filing: CanonicalFiling; evaluated_at?: string } }>(
    "/rule-evaluations",
    async (req, reply) => {
      const { filing, evaluated_at } = req.body;
      const traceId = req.id;
      const at = evaluated_at ? new Date(evaluated_at) : new Date();

      const output = evaluateRules({ filing, evaluated_at: at });

      return reply.status(200).send({
        trace_id: traceId,
        rule_version_id: output.rule_version_id,
        evaluated_at: output.evaluated_at,
        results: output.results,
      });
    }
  );

  // GET /rules
  app.get("/rules", async (req, reply) => {
    const at = req.query && "at" in (req.query as Record<string, unknown>)
      ? new Date((req.query as Record<string, string>).at)
      : new Date();

    const ruleSet = dkVatRuleCatalog.resolveActiveRules(at);
    return reply.send({
      trace_id: req.id,
      evaluated_at: at.toISOString(),
      rules: ruleSet.rules.map((r) => ({
        rule_id: r.rule_id,
        rule_name: r.rule_name,
        legal_ref: r.legal_ref,
        effective_from: r.effective_from.toISOString().split("T")[0],
        effective_to: r.effective_to ? r.effective_to.toISOString().split("T")[0] : null,
      })),
    });
  });
}
