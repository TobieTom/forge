pub mod constants;
pub mod errors;
pub mod instructions;
pub mod math;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use errors::*;
pub use instructions::*;
pub use state::*;

declare_id!("J6tbrmGmpQ7bskpUB2DXcjjDp4VwVs78haXQ7FqZ1CUi");

#[program]
pub mod forge {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        description: String,
        outcomes: Vec<String>,
        initial_b: u64,
        creator_fee_bps: u16,
        resolution_timestamp: i64,
        market_type: u8,
    ) -> Result<()> {
        instructions::create_market::handler(
            ctx,
            description,
            outcomes,
            initial_b,
            creator_fee_bps,
            resolution_timestamp,
            market_type,
        )
    }

    pub fn buy_shares(
        ctx: Context<BuyShares>,
        outcome_idx: u8,
        shares: u64,
        max_cost: u64,
    ) -> Result<()> {
        instructions::buy_shares::handler(ctx, outcome_idx, shares, max_cost)
    }

    pub fn sell_shares(
        ctx: Context<SellShares>,
        outcome_idx: u8,
        shares: u64,
        min_proceeds: u64,
    ) -> Result<()> {
        instructions::sell_shares::handler(ctx, outcome_idx, shares, min_proceeds)
    }
}
