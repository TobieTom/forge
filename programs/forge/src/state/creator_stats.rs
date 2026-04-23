use anchor_lang::prelude::*;

// TODO: Define the CreatorStats account struct.
//
// Fields will include:
//   - authority: Pubkey        — the creator this stats account belongs to
//   - markets_created: u64     — total number of markets created by this authority
//   - bump: u8                 — PDA bump seed
