use anchor_lang::prelude::*;

// TODO: Define the Position account struct.
//
// Fields will include:
//   - owner: Pubkey            — wallet that holds this position
//   - market: Pubkey           — the market this position belongs to
//   - outcome_index: u8        — which outcome's shares are held
//   - shares: u64              — number of shares owned (scaled fixed-point)
//   - bump: u8                 — PDA bump seed
