use anchor_lang::prelude::*;

// Global singleton PDA. Seeds: [b"market_counter"]
#[account]
pub struct MarketCounter {
    pub count: u64,
    pub bump: u8,
}

impl MarketCounter {
    // 8  discriminator
    // 8  count
    // 1  bump
    pub const LEN: usize = 17;
}
