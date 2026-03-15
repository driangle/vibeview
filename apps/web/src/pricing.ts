import type { Usage } from "./types";

interface ModelPricing {
  inputPerM: number;
  outputPerM: number;
  cacheReadPerM: number;
  cacheWritePerM: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4": {
    inputPerM: 15, outputPerM: 75, cacheReadPerM: 1.5, cacheWritePerM: 18.75,
  },
  "claude-sonnet-4": {
    inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.30, cacheWritePerM: 3.75,
  },
  "claude-haiku-4": {
    inputPerM: 0.80, outputPerM: 4, cacheReadPerM: 0.08, cacheWritePerM: 1,
  },
};

function lookupPricing(model: string): ModelPricing | undefined {
  if (model in MODEL_PRICING) return MODEL_PRICING[model];
  for (const [base, pricing] of Object.entries(MODEL_PRICING)) {
    if (model.startsWith(base)) return pricing;
  }
  return undefined;
}

export function calculateCost(model: string, usage: Usage): number {
  const p = lookupPricing(model);
  if (!p) return 0;
  return (
    usage.input_tokens * p.inputPerM +
    usage.output_tokens * p.outputPerM +
    usage.cache_read_input_tokens * p.cacheReadPerM +
    usage.cache_creation_input_tokens * p.cacheWritePerM
  ) / 1_000_000;
}
