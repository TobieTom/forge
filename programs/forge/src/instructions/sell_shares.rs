use anchor_lang::prelude::*;

// TODO: Implement the sell_shares instruction.
//
// A trader sells back shares of a specific outcome to the market.
// Steps:
//   1. Verify the trader's Position holds at least `amount` shares.
//   2. Compute proceeds using LS-LMSR cost_of_trade (negative delta = sell).
//   3. Transfer proceeds in lamports from the market vault to the trader.
//   4. Update market.outcome_shares[outcome_index] -= amount.
//   5. Update or close the trader's Position PDA if shares reach zero.
//
// Accounts: market (PDA, mut), position (PDA, mut), trader (signer),
//           market_vault (mut), system_program.
