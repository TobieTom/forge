use anchor_lang::prelude::*;

// TODO: Define the MarketCounter account struct.
//
// This is a global singleton PDA used to assign monotonically increasing
// IDs to each new market, ensuring unique PDAs even if metadata is identical.
//
// Fields will include:
//   - count: u64               — total markets ever created (next market's ID)
//   - bump: u8                 — PDA bump seed
