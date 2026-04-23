use anchor_lang::prelude::*;

// TODO: Implement the buy_shares instruction.
//
// A trader purchases shares of a specific outcome in an open market.
// Steps:
//   1. Compute the cost of buying `amount` shares of `outcome_index` using
//      the LS-LMSR cost_of_trade function from math::lmsr.
//   2. Transfer the computed cost in lamports from the trader to the market vault.
//   3. Update market.outcome_shares[outcome_index] += amount.
//   4. Initialize or update the trader's Position PDA.
//
// Accounts: market (PDA, mut), position (PDA, init_if_needed), trader (signer),
//           market_vault, system_program.
