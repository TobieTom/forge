use anchor_lang::prelude::*;

use crate::{errors::ErrorCode, state::*};

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"creator_stats", authority.key().as_ref()],
        bump = creator_stats.bump,
    )]
    pub creator_stats: Account<'info, CreatorStats>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<ResolveMarket>, winning_outcome: u8) -> Result<()> {
    // ── Validate ─────────────────────────────────────────────────────────────
    require!(
        ctx.accounts.authority.key() == ctx.accounts.market.authority,
        ErrorCode::Unauthorized
    );
    require!(!ctx.accounts.market.resolved, ErrorCode::MarketAlreadyResolved);
    require!(!ctx.accounts.market.disputed, ErrorCode::MarketNotDisputed);
    require!(
        Clock::get()?.unix_timestamp >= ctx.accounts.market.resolution_timestamp,
        ErrorCode::InvalidInput
    );
    require!(
        (winning_outcome as usize) < ctx.accounts.market.outcomes.len(),
        ErrorCode::InvalidOutcomeIndex
    );

    // ── Resolve market ───────────────────────────────────────────────────────
    ctx.accounts.market.resolved       = true;
    ctx.accounts.market.winning_outcome = Some(winning_outcome);

    // ── Update creator stats ─────────────────────────────────────────────────
    let stats = &mut ctx.accounts.creator_stats;
    stats.markets_resolved       += 1;
    stats.undisputed_resolutions += 1;
    stats.trust_score = if stats.markets_resolved == 0 {
        100
    } else {
        ((stats.undisputed_resolutions as u128)
            .saturating_mul(100)
            .saturating_div(stats.markets_resolved as u128))
        .min(255) as u8
    };

    Ok(())
}
