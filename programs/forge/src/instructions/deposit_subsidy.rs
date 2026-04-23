use anchor_lang::prelude::*;

// TODO: Implement the deposit_subsidy instruction.
//
// Allows anyone to inject additional liquidity into an open market.
// Adding subsidy increases the LS-LMSR liquidity parameter b, tightening
// the spread and reducing price impact for traders.
//
// Steps:
//   1. Verify market.resolved == false.
//   2. Transfer `amount` lamports from the depositor to the market vault.
//   3. Recompute market.liquidity_param based on new total subsidy.
//   4. Update market.subsidy += amount.
//
// Accounts: market (PDA, mut), depositor (signer), market_vault (mut),
//           system_program.
