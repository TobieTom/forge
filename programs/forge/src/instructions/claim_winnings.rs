use anchor_lang::prelude::*;

// TODO: Implement the claim_winnings instruction.
//
// After resolution, holders of the winning outcome's shares redeem for lamports.
// Steps:
//   1. Verify market.resolved == true.
//   2. Verify position.outcome_index == market.winning_outcome.
//   3. Compute payout = position.shares (1 share = 1 lamport at resolution).
//      (Exact payout formula TBD based on protocol design.)
//   4. Transfer payout from market vault to the position owner.
//   5. Close the Position account and return rent to the owner.
//
// Accounts: market (PDA), position (PDA, mut, close = owner), owner (signer),
//           market_vault (mut), system_program.
