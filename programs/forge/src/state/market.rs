use anchor_lang::prelude::*;

// Core market account. Seeds: [b"market", authority.as_ref(), market_id_bytes.as_ref()]
#[account]
pub struct Market {
    pub authority: Pubkey,
    pub market_id: u64,
    /// Max 256 bytes of UTF-8 content.
    pub description: String,
    /// Max 8 outcomes, each name max 32 bytes.
    pub outcomes: Vec<String>,
    /// LS-LMSR share quantities, one per outcome.
    pub quantities: Vec<i64>,
    pub b: u64,
    pub b_alpha: u64,
    pub b_min: u64,
    pub total_volume: u64,
    pub subsidy_vault: Pubkey,
    pub creator_fee_bps: u16,
    pub resolution_bond: u64,
    pub resolved: bool,
    pub winning_outcome: Option<u8>,
    pub resolution_timestamp: i64,
    pub dispute_window_end: i64,
    pub disputed: bool,
    pub created_at: i64,
    pub market_type: u8,
    pub bump: u8,
}

impl Market {
    // 8          discriminator
    // 32         authority
    // 8          market_id
    // 4 + 256    description  (4-byte length prefix + max 256 bytes content)
    // 4 + 288    outcomes     (4-byte prefix + 8 items × (4-byte prefix + 32 bytes content))
    // 4 + 64     quantities   (4-byte prefix + 8 items × 8 bytes)
    // 8          b
    // 8          b_alpha
    // 8          b_min
    // 8          total_volume
    // 32         subsidy_vault
    // 2          creator_fee_bps
    // 8          resolution_bond
    // 1          resolved
    // 2          winning_outcome  (1 Option discriminant + 1 u8)
    // 8          resolution_timestamp
    // 8          dispute_window_end
    // 1          disputed
    // 8          created_at
    // 1          market_type
    // 1          bump
    // 64         buffer
    // ─────────────────────────────────────────────────────────
    // Total: 8+32+8+260+292+68+8+8+8+8+32+2+8+1+2+8+8+1+8+1+1+64 = 836
    pub const LEN: usize = 8      // discriminator
        + 32                      // authority
        + 8                       // market_id
        + 4 + 256                 // description
        + 4 + (8 * (4 + 32))     // outcomes
        + 4 + (8 * 8)             // quantities
        + 8                       // b
        + 8                       // b_alpha
        + 8                       // b_min
        + 8                       // total_volume
        + 32                      // subsidy_vault
        + 2                       // creator_fee_bps
        + 8                       // resolution_bond
        + 1                       // resolved
        + 2                       // winning_outcome
        + 8                       // resolution_timestamp
        + 8                       // dispute_window_end
        + 1                       // disputed
        + 8                       // created_at
        + 1                       // market_type
        + 1                       // bump
        + 64;                     // buffer
}
