use anchor_lang::prelude::*;

// TODO: Implement LS-LMSR (Liquidity-Sensitive Logarithmic Market Scoring Rule) math.
//
// This module will contain:
//   - cost(q, b): cost function C(q) = b * ln(sum(exp(q_i / b)))
//   - price(q, b, i): spot price for outcome i = exp(q_i / b) / sum(exp(q_j / b))
//   - cost_of_trade(q, b, delta, i): net cost to buy/sell delta shares of outcome i
//   - liquidity_param(subsidy): derive liquidity parameter b from subsidy amount
//
// All arithmetic must use fixed-point integer math (no floating point).
// Overflow safety and precision loss must be carefully handled.
