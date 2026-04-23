use anchor_lang::prelude::*;

#[constant]
pub const SEED: &str = "anchor";

pub const MAX_OUTCOMES: usize = 8;
pub const MAX_DESCRIPTION_LEN: usize = 256;
pub const MAX_OUTCOME_NAME_LEN: usize = 32;
pub const CREATOR_FEE_BPS_MAX: u16 = 200;
pub const B_ALPHA_DEFAULT: u64 = 10_000;
pub const CREATOR_FEE_DEFAULT_BPS: u16 = 30;
pub const DISPUTE_WINDOW_SECONDS: i64 = 259_200; // 72 hours
pub const BOND_MIN_LAMPORTS: u64 = 1_000_000;    // 1 USDG in 6dp
pub const DECIMALS: u64 = 1_000_000;
