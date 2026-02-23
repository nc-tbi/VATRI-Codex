import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "tax-core-mcp",
  version: "0.1.0"
});

const filingTypeSchema = z.enum(["regular", "zero", "correction"]);

function parseIsoDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isZero(value: number): boolean {
  return Math.abs(value) < 0.000001;
}

server.tool("health_check", "Returns a simple status payload.", async () => {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ status: "ok", service: "tax-core-mcp" }, null, 2)
      }
    ]
  };
});

server.tool(
  "add_numbers",
  "Adds two numbers and returns the sum.",
  {
    a: z.number(),
    b: z.number()
  },
  async ({ a, b }) => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ a, b, sum: a + b }, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "create_vat_claim_stub",
  "Creates a draft claim payload from VAT totals.",
  {
    taxpayerId: z.string().min(1),
    periodStart: z.string().min(1),
    periodEnd: z.string().min(1),
    outputVatAmount: z.number(),
    inputVatDeductibleAmount: z.number(),
    adjustments: z.number().default(0)
  },
  async ({
    taxpayerId,
    periodStart,
    periodEnd,
    outputVatAmount,
    inputVatDeductibleAmount,
    adjustments
  }) => {
    const netVatAmount = outputVatAmount - inputVatDeductibleAmount + adjustments;
    const resultType = netVatAmount > 0 ? "payable" : netVatAmount < 0 ? "refund" : "zero";

    const payload = {
      claimId: `claim-${taxpayerId}-${periodEnd}`,
      taxpayerId,
      periodStart,
      periodEnd,
      resultType,
      amount: Math.abs(netVatAmount),
      currency: "DKK",
      calculationReference: {
        outputVatAmount,
        inputVatDeductibleAmount,
        adjustments,
        netVatAmount
      }
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(payload, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "validate_dk_vat_filing",
  "Validates Danish VAT filing fields and returns derived claim inputs.",
  {
    cvrNumber: z.string().min(1),
    taxPeriodStart: z.string().min(1),
    taxPeriodEnd: z.string().min(1),
    filingType: filingTypeSchema,
    hadTaxableActivity: z.boolean().optional(),
    outputVatAmount: z.number().default(0),
    inputVatDeductibleAmount: z.number().default(0),
    vatOnGoodsPurchasesAbroadAmount: z.number().default(0),
    vatOnServicesPurchasesAbroadAmount: z.number().default(0),
    rubrikAGoodsEuPurchaseValue: z.number().default(0),
    rubrikAServicesEuPurchaseValue: z.number().default(0),
    rubrikBGoodsEuSaleValue: z.number().default(0),
    rubrikBServicesEuSaleValue: z.number().default(0),
    rubrikCOtherVatExemptSuppliesValue: z.number().default(0),
    adjustments: z.number().default(0)
  },
  async ({
    cvrNumber,
    taxPeriodStart,
    taxPeriodEnd,
    filingType,
    hadTaxableActivity,
    outputVatAmount,
    inputVatDeductibleAmount,
    vatOnGoodsPurchasesAbroadAmount,
    vatOnServicesPurchasesAbroadAmount,
    rubrikAGoodsEuPurchaseValue,
    rubrikAServicesEuPurchaseValue,
    rubrikBGoodsEuSaleValue,
    rubrikBServicesEuSaleValue,
    rubrikCOtherVatExemptSuppliesValue,
    adjustments
  }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!/^\d{8}$/.test(cvrNumber)) {
      errors.push("CVR number must be exactly 8 digits.");
    }

    const start = parseIsoDate(taxPeriodStart);
    const end = parseIsoDate(taxPeriodEnd);

    if (!start) {
      errors.push("taxPeriodStart must be a valid date string.");
    }

    if (!end) {
      errors.push("taxPeriodEnd must be a valid date string.");
    }

    if (start && end && start > end) {
      errors.push("taxPeriodStart must be before or equal to taxPeriodEnd.");
    }

    const nonNegativeFields: Array<[string, number]> = [
      ["outputVatAmount", outputVatAmount],
      ["inputVatDeductibleAmount", inputVatDeductibleAmount],
      ["vatOnGoodsPurchasesAbroadAmount", vatOnGoodsPurchasesAbroadAmount],
      ["vatOnServicesPurchasesAbroadAmount", vatOnServicesPurchasesAbroadAmount],
      ["rubrikAGoodsEuPurchaseValue", rubrikAGoodsEuPurchaseValue],
      ["rubrikAServicesEuPurchaseValue", rubrikAServicesEuPurchaseValue],
      ["rubrikBGoodsEuSaleValue", rubrikBGoodsEuSaleValue],
      ["rubrikBServicesEuSaleValue", rubrikBServicesEuSaleValue],
      ["rubrikCOtherVatExemptSuppliesValue", rubrikCOtherVatExemptSuppliesValue]
    ];

    for (const [name, value] of nonNegativeFields) {
      if (!Number.isFinite(value)) {
        errors.push(`${name} must be a finite number.`);
      }

      if (value < 0) {
        errors.push(`${name} cannot be negative.`);
      }
    }

    if (!Number.isFinite(adjustments)) {
      errors.push("adjustments must be a finite number.");
    }

    const monetaryTotal =
      outputVatAmount +
      inputVatDeductibleAmount +
      vatOnGoodsPurchasesAbroadAmount +
      vatOnServicesPurchasesAbroadAmount +
      Math.abs(adjustments);

    const internationalValueTotal =
      rubrikAGoodsEuPurchaseValue +
      rubrikAServicesEuPurchaseValue +
      rubrikBGoodsEuSaleValue +
      rubrikBServicesEuSaleValue +
      rubrikCOtherVatExemptSuppliesValue;

    const anyDeclaredAmounts = !isZero(monetaryTotal) || !isZero(internationalValueTotal);

    if (filingType === "zero") {
      if (anyDeclaredAmounts) {
        errors.push("Zero filing cannot contain VAT or international declaration amounts.");
      }

      if (hadTaxableActivity === true) {
        errors.push("Zero filing conflicts with hadTaxableActivity=true.");
      }
    }

    if ((filingType === "regular" || filingType === "correction") && hadTaxableActivity === false && anyDeclaredAmounts) {
      warnings.push("Amounts were provided while hadTaxableActivity=false.");
    }

    if (hadTaxableActivity === true && !anyDeclaredAmounts) {
      warnings.push("hadTaxableActivity=true but all declared amounts are zero.");
    }

    if (
      (vatOnGoodsPurchasesAbroadAmount > 0 || vatOnServicesPurchasesAbroadAmount > 0) &&
      isZero(rubrikAGoodsEuPurchaseValue) &&
      isZero(rubrikAServicesEuPurchaseValue)
    ) {
      warnings.push("Abroad purchase VAT is declared but Rubrik A values are zero.");
    }

    if (
      (rubrikBGoodsEuSaleValue > 0 || rubrikBServicesEuSaleValue > 0) &&
      isZero(outputVatAmount)
    ) {
      warnings.push("Rubrik B values exist while outputVatAmount is zero. Confirm domestic/exempt treatment.");
    }

    const netVatAmount = outputVatAmount - inputVatDeductibleAmount + adjustments;
    const resultType = netVatAmount > 0 ? "payable" : netVatAmount < 0 ? "refund" : "zero";

    const periodDays =
      start && end ? Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1 : null;

    const result = {
      valid: errors.length === 0,
      errors,
      warnings,
      derived: {
        netVatAmount,
        resultType,
        claimAmount: Math.abs(netVatAmount),
        periodDays,
        totalInternationalValue: internationalValueTotal,
        currency: "DKK"
      }
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "evaluate_dk_vat_filing_obligation",
  "Evaluates Danish VAT filing obligation, cadence, and return type from basic taxpayer facts.",
  {
    isVatRegistered: z.boolean(),
    annualTaxableTurnoverDkk: z.number().min(0),
    isNewBusiness: z.boolean().default(false),
    optedMonthly: z.boolean().default(false),
    optedQuarterly: z.boolean().default(false),
    hasActivityThisPeriod: z.boolean(),
    hasSubmittedReturn: z.boolean().default(false),
    returnDueDatePassed: z.boolean().default(false),
    reportsEuSalesWithoutVat: z.boolean().default(false)
  },
  async ({
    isVatRegistered,
    annualTaxableTurnoverDkk,
    isNewBusiness,
    optedMonthly,
    optedQuarterly,
    hasActivityThisPeriod,
    hasSubmittedReturn,
    returnDueDatePassed,
    reportsEuSalesWithoutVat
  }) => {
    const mustRegister = annualTaxableTurnoverDkk >= 50000;
    const cadenceReason: string[] = [];

    if (!isVatRegistered) {
      const result = {
        filingObligation: "none",
        registration: {
          mustRegister,
          recommendation: mustRegister
            ? "Register for VAT now (turnover threshold reached)."
            : "No mandatory VAT registration from turnover threshold alone."
        },
        returnType: "none",
        filingCadence: "none",
        complianceStatus: "not_applicable",
        risks: mustRegister ? ["Operating above threshold without VAT registration risk."] : []
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }

    let filingCadence: "monthly" | "quarterly" | "half_yearly";

    if (optedMonthly || annualTaxableTurnoverDkk > 50000000) {
      filingCadence = "monthly";
      cadenceReason.push(
        optedMonthly ? "Taxpayer opted in for monthly reporting." : "Turnover above DKK 50M."
      );
    } else if (optedQuarterly || isNewBusiness || annualTaxableTurnoverDkk >= 5000000) {
      filingCadence = "quarterly";
      if (optedQuarterly) {
        cadenceReason.push("Taxpayer opted in for quarterly reporting.");
      }

      if (isNewBusiness) {
        cadenceReason.push("New businesses are typically placed on quarterly cadence.");
      }

      if (annualTaxableTurnoverDkk >= 5000000) {
        cadenceReason.push("Turnover at or above DKK 5M.");
      }
    } else {
      filingCadence = "half_yearly";
      cadenceReason.push("Turnover below DKK 5M and no cadence override.");
    }

    const returnType = hasActivityThisPeriod ? "regular" : "zero";

    const risks: string[] = [];
    if (!hasSubmittedReturn && returnDueDatePassed) {
      risks.push("Return appears overdue; late filing can trigger fees or estimated assessment.");
    }

    if (reportsEuSalesWithoutVat) {
      risks.push("EU sales without VAT may require separate periodic reporting obligations.");
    }

    const result = {
      filingObligation: "required",
      registration: {
        mustRegister,
        recommendation: "Already VAT registered."
      },
      returnType,
      filingCadence,
      cadenceReason,
      complianceStatus: hasSubmittedReturn
        ? "submitted"
        : returnDueDatePassed
          ? "overdue"
          : "due",
      risks
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server failed to start:", error);
  process.exit(1);
});
