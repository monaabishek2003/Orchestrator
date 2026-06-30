/** Per-token pricing for a model: cost per single input/output token. */
export interface ModelPrice {
  inputPerToken: number;
  outputPerToken: number;
}

/** Convert a per-million-token rate to a per-token rate. */
const perMillion = (rate: number): number => rate / 1_000_000;

/** Default model used when detection fails. */
export const DEFAULT_MODEL = "claude-sonnet-4-20250514";

/**
 * Published Claude per-token pricing (mid-2026), stored as cost per single
 * token for direct multiplication.
 */
export const PRICING: Record<string, ModelPrice> = {
  "claude-sonnet-4-20250514": {
    inputPerToken: perMillion(3.0),
    outputPerToken: perMillion(15.0),
  },
  "claude-opus-4-20250514": {
    inputPerToken: perMillion(15.0),
    outputPerToken: perMillion(75.0),
  },
  "claude-3-5-haiku-20241022": {
    inputPerToken: perMillion(0.8),
    outputPerToken: perMillion(4.0),
  },
};

/** Round to 6 decimal places to avoid floating point drift. */
function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Look up the price for a model, falling back to the default model. */
function priceFor(model: string | undefined): ModelPrice {
  const price = (model && PRICING[model]) || PRICING[DEFAULT_MODEL];
  // PRICING[DEFAULT_MODEL] is always defined, but satisfy strict indexing.
  return price ?? { inputPerToken: 0, outputPerToken: 0 };
}

/** Safely read a string field from an unknown object. */
function readString(obj: unknown, key: string): string | undefined {
  if (obj !== null && typeof obj === "object" && key in obj) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

/** Safely read a nested object field. */
function readObject(obj: unknown, key: string): unknown {
  if (obj !== null && typeof obj === "object" && key in obj) {
    return (obj as Record<string, unknown>)[key];
  }
  return undefined;
}

/**
 * Attempt to extract a model name from a parsed stream event. Looks at
 * top-level `model`, nested `message.model`, and `metadata.model`.
 * Returns the model string if found, otherwise null.
 */
export function detectModel(event: unknown): string | null {
  return (
    readString(event, "model") ??
    readString(readObject(event, "message"), "model") ??
    readString(readObject(event, "metadata"), "model") ??
    null
  );
}

/**
 * Calculate the dollar cost for a number of input and output tokens on a given
 * model (defaults to Sonnet 4). Result is rounded to 6 decimal places.
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = DEFAULT_MODEL,
): number {
  const price = priceFor(model);
  const cost =
    inputTokens * price.inputPerToken + outputTokens * price.outputPerToken;
  return round6(cost);
}

/** Initial totals for a {@link TokenAccumulator}, e.g. when resuming a task. */
export interface AccumulatorState {
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
}

/**
 * Maintains running token and cost totals for a single task. Pure in-memory
 * accounting — no persistence or side effects.
 */
export class TokenAccumulator {
  #inputTokens: number;
  #outputTokens: number;
  #cost: number;

  constructor(initial: AccumulatorState = {}) {
    this.#inputTokens = initial.inputTokens ?? 0;
    this.#outputTokens = initial.outputTokens ?? 0;
    this.#cost = round6(initial.cost ?? 0);
  }

  /** Add token usage and recalculate cumulative cost. */
  addUsage(
    inputTokens: number,
    outputTokens: number,
    model: string = DEFAULT_MODEL,
  ): void {
    this.#inputTokens += inputTokens;
    this.#outputTokens += outputTokens;
    this.#cost = round6(
      this.#cost + calculateCost(inputTokens, outputTokens, model),
    );
  }

  get totalInputTokens(): number {
    return this.#inputTokens;
  }

  get totalOutputTokens(): number {
    return this.#outputTokens;
  }

  get totalTokens(): number {
    return this.#inputTokens + this.#outputTokens;
  }

  get totalCost(): number {
    return this.#cost;
  }
}
