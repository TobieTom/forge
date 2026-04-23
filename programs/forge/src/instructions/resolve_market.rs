use anchor_lang::prelude::*;

// TODO: Implement the resolve_market instruction.
//
// The designated resolver finalizes the market by setting the winning outcome.
// Steps:
//   1. Verify signer == market.resolver.
//   2. Verify current timestamp >= market.expiry_ts (or allow early resolution).
//   3. Verify market.resolved == false.
//   4. Set market.resolved = true and market.winning_outcome = Some(outcome_index).
//
// Accounts: market (PDA, mut), resolver (signer).
