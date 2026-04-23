use anchor_lang::prelude::*;

// Per-(market, owner) share position. Seeds: [b"position", market.as_ref(), owner.as_ref()]
#[account]
pub struct Position {
    pub owner: Pubkey,
    pub market: Pubkey,
    /// One entry per outcome, same length as market.outcomes.
    pub shares: Vec<i64>,
    pub cost_basis: u64,
    pub bump: u8,
}

impl Position {
    // 8        discriminator
    // 32       owner
    // 32       market
    // 4 + 64   shares vec (4-byte prefix + 8 outcomes * 8 bytes each)
    // 8        cost_basis
    // 1        bump
    // 64       buffer
    pub const LEN: usize = 8 + 32 + 32 + (4 + 8 * 8) + 8 + 1 + 64;
}
