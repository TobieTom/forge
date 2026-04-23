use anchor_lang::prelude::*;

// TODO: Implement the create_market instruction.
//
// This instruction initializes a new Market PDA and optionally a MarketCounter
// PDA. The creator specifies:
//   - outcome_count: number of discrete outcomes
//   - expiry_ts: resolution deadline (Unix timestamp)
//   - resolver: pubkey allowed to call resolve_market
//   - initial subsidy (via deposit_subsidy or bundled here — TBD)
//
// The liquidity parameter b is derived from the initial subsidy amount using
// the LS-LMSR formula: b = subsidy / ln(outcome_count).
//
// Accounts: market (PDA), market_counter (PDA), creator, creator_stats (PDA),
//           system_program.
