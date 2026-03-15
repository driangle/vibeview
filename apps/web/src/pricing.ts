import type { Usage } from "./types";

interface ModelPricing {
  inputPerM: number;
  outputPerM: number;
  cacheReadPerM: number;
  cacheWritePerM: number;
}

type PricingTable = Record<string, ModelPricing>;

let pricingTable: PricingTable = {};
let loaded = false;

export async function loadPricing(): Promise<void> {
  if (loaded) return;
  try {
    const res = await fetch("/api/pricing");
    if (res.ok) {
      pricingTable = await res.json();
      loaded = true;
    }
  } catch {
    // Pricing will remain empty — costs show as $0.00.
  }
}

function lookupPricing(model: string): ModelPricing | undefined {
  if (model in pricingTable) return pricingTable[model];
  for (const [base, pricing] of Object.entries(pricingTable)) {
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
