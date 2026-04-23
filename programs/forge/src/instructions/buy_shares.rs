use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::ErrorCode,
    math::lmsr::{trade_cost, update_b},
    state::*,
};

#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init_if_needed,
        payer = user,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump,
        space = Position::LEN,
    )]
    pub position: Account<'info, Position>,

    #[account(
        mut,
        seeds = [b"subsidy_vault", market.key().as_ref()],
        bump,
    )]
    pub subsidy_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_usdg_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator_usdg_account: Account<'info, TokenAccount>,

    pub usdg_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<BuyShares>,
    outcome_idx: u8,
    shares: u64,
    max_cost: u64,
) -> Result<()> {
    // ── Cache readonly fields before any mutable borrows ─────────────────────
    let resolved        = ctx.accounts.market.resolved;
    let n_outcomes      = ctx.accounts.market.outcomes.len();
    let market_b        = ctx.accounts.market.b;
    let market_b_alpha  = ctx.accounts.market.b_alpha;
    let market_b_min    = ctx.accounts.market.b_min;
    let market_volume   = ctx.accounts.market.total_volume;
    let fee_bps         = ctx.accounts.market.creator_fee_bps;
    let market_key      = ctx.accounts.market.key();

    // ── Validate ─────────────────────────────────────────────────────────────
    require!(!resolved, ErrorCode::MarketAlreadyResolved);
    require!(
        (outcome_idx as usize) < n_outcomes,
        ErrorCode::InvalidOutcomeIndex
    );
    require!(shares > 0 && max_cost > 0, ErrorCode::InvalidInput);

    // ── Cost via LS-LMSR ─────────────────────────────────────────────────────
    let cost = trade_cost(
        &ctx.accounts.market.quantities,
        outcome_idx as usize,
        shares as i64,
        market_b,
    )?;
    require!(cost > 0, ErrorCode::InvalidDelta);
    let cost_u64 = cost as u64;
    require!(cost_u64 <= max_cost, ErrorCode::SlippageExceeded);

    // ── Fee split ─────────────────────────────────────────────────────────────
    let creator_fee = cost_u64.saturating_mul(fee_bps as u64) / 10_000;
    let vault_amount = cost_u64.saturating_sub(creator_fee);

    // ── Transfer vault portion (user → subsidy vault) ─────────────────────────
    token::transfer(
        CpiContext::new(
            Token::id(),
            Transfer {
                from: ctx.accounts.user_usdg_account.to_account_info(),
                to:   ctx.accounts.subsidy_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        vault_amount,
    )?;

    // ── Transfer creator fee (user → creator) ─────────────────────────────────
    if creator_fee > 0 {
        token::transfer(
            CpiContext::new(
                Token::id(),
                Transfer {
                    from: ctx.accounts.user_usdg_account.to_account_info(),
                    to:   ctx.accounts.creator_usdg_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            creator_fee,
        )?;
    }

    // ── Update market state ───────────────────────────────────────────────────
    let new_volume = market_volume.saturating_add(shares);
    let new_b      = update_b(market_b, new_volume, market_b_alpha, market_b_min);

    ctx.accounts.market.quantities[outcome_idx as usize] =
        ctx.accounts.market.quantities[outcome_idx as usize].saturating_add(shares as i64);
    ctx.accounts.market.total_volume = new_volume;
    ctx.accounts.market.b            = new_b;

    // ── Update position ───────────────────────────────────────────────────────
    if ctx.accounts.position.shares.is_empty() {
        ctx.accounts.position.owner  = ctx.accounts.user.key();
        ctx.accounts.position.market = market_key;
        ctx.accounts.position.shares = vec![0i64; n_outcomes];
        ctx.accounts.position.bump   = ctx.bumps.position;
    }
    ctx.accounts.position.shares[outcome_idx as usize] =
        ctx.accounts.position.shares[outcome_idx as usize].saturating_add(shares as i64);
    ctx.accounts.position.cost_basis =
        ctx.accounts.position.cost_basis.saturating_add(vault_amount);

    Ok(())
}
