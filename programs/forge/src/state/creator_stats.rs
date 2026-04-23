use anchor_lang::prelude::*;

// Per-creator reputation account. Seeds: [b"creator_stats", creator.as_ref()]
#[account]
pub struct CreatorStats {
    pub creator: Pubkey,
    pub markets_created: u64,
    pub markets_resolved: u64,
    pub undisputed_resolutions: u64,
    pub trust_score: u8,
    pub total_fees_earned: u64,
    pub bump: u8,
}

impl CreatorStats {
    // 8   discriminator
    // 32  creator
    // 8   markets_created
    // 8   markets_resolved
    // 8   undisputed_resolutions
    // 1   trust_score
    // 8   total_fees_earned
    // 1   bump
    // 32  buffer
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 1 + 8 + 1 + 32;
}
