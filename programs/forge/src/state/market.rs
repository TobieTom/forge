use anchor_lang::prelude::*;

// TODO: Define the Market account struct.
//
// Fields will include:
//   - authority: Pubkey        — market creator
//   - resolver: Pubkey         — permitted to resolve the market
//   - outcome_count: u8        — number of discrete outcomes (2–16)
//   - outcome_shares: Vec<u64> — cumulative shares per outcome (q vector)
//   - liquidity_param: u64     — LS-LMSR b parameter (scaled fixed-point)
//   - subsidy: u64             — total lamports deposited as initial subsidy
//   - resolved: bool           — whether the market has been resolved
//   - winning_outcome: Option<u8> — index of the winning outcome after resolution
//   - expiry_ts: i64           — Unix timestamp after which resolution is permitted
//   - bump: u8                 — PDA bump seed
