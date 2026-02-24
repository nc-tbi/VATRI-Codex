// validation-service/src/routes/validation.ts — stateless validation endpoint
// POST /validations → validateFiling() → ValidationResult
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { validateFiling, type CanonicalFiling } from "@tax-core/domain";

export async function validationRoutes(app: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  // POST /validations
  app.post<{ Body: CanonicalFiling }>("/", async (req, reply) => {
    const filing = req.body;
    const traceId = req.id;

    const result = validateFiling(filing);

    const statusCode = result.valid ? 200 : 422;
    return reply.status(statusCode).send({
      trace_id: traceId,
      filing_id: filing.filing_id,
      valid: result.valid,
      issues: result.issues,
    });
  });
}
