import { strict as assert } from "node:assert";

import {
  TokenAccumulator,
  calculateCost,
  detectModel,
} from "../apps/server/src/agent/pricing.js";

// 1000 input + 500 output on Sonnet 4 = 0.003 + 0.0075 = 0.0105
const cost = calculateCost(1000, 500, "claude-sonnet-4-20250514");
assert.equal(cost, 0.0105);
console.log("calculateCost(1000,500,sonnet4) =", cost, "OK");

// Default model is Sonnet 4 when omitted.
assert.equal(calculateCost(1000, 500), 0.0105);
console.log("default model = Sonnet 4 OK");

// Unknown model falls back to Sonnet 4.
assert.equal(calculateCost(1000, 500, "made-up-model"), 0.0105);
console.log("unknown model falls back to Sonnet 4 OK");

// Opus 4: 1000 input + 500 output = 0.015 + 0.0375 = 0.0525
assert.equal(calculateCost(1000, 500, "claude-opus-4-20250514"), 0.0525);
console.log("Opus 4 pricing OK");

// Accumulator from 0, two addUsage calls.
const acc = new TokenAccumulator();
acc.addUsage(1000, 500, "claude-sonnet-4-20250514");
acc.addUsage(2000, 1000, "claude-sonnet-4-20250514");
assert.equal(acc.totalInputTokens, 3000);
assert.equal(acc.totalOutputTokens, 1500);
assert.equal(acc.totalTokens, 4500);
assert.equal(acc.totalCost, 0.0315); // 0.0105 + 0.021
console.log(
  "accumulator from 0:",
  acc.totalInputTokens,
  acc.totalOutputTokens,
  acc.totalTokens,
  acc.totalCost,
  "OK",
);

// Accumulator initialized with a baseline (resume).
const resumed = new TokenAccumulator({
  inputTokens: 3000,
  outputTokens: 1500,
  cost: 0.0315,
});
resumed.addUsage(1000, 500, "claude-sonnet-4-20250514");
assert.equal(resumed.totalInputTokens, 4000);
assert.equal(resumed.totalOutputTokens, 2000);
assert.equal(resumed.totalTokens, 6000);
assert.equal(resumed.totalCost, 0.042); // 0.0315 + 0.0105
console.log(
  "resumed accumulator:",
  resumed.totalInputTokens,
  resumed.totalOutputTokens,
  resumed.totalTokens,
  resumed.totalCost,
  "OK",
);

// Model detection from different event shapes.
assert.equal(detectModel({ model: "claude-opus-4-20250514" }), "claude-opus-4-20250514");
assert.equal(
  detectModel({ message: { model: "claude-sonnet-4-20250514" } }),
  "claude-sonnet-4-20250514",
);
assert.equal(detectModel({ metadata: { model: "x" } }), "x");
assert.equal(detectModel({ type: "result" }), null);
console.log("detectModel OK");

console.log("\nAll cost accounting checks passed.");
