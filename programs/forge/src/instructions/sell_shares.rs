use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::ErrorCode,
    math::lmsr::{trade_cost, update_b},
    state::*,
};

#[derive(Accounts)]
pub struct SellShares<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    // Position must already exist; selling requires a prior buy.
    #[account(
        mut,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump = position.bump,
    )]
    pub position: Account<'info, Position>,

    // Market is the token authority → market PDA signs the transfer out.
    #[account(
        mut,
        seeds = [b"subsidy_vault", market.key().as_ref()],
        bump,
    )]
    pub subsidy_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_usdg_account: Account<'info, TokenAccount>,

    pub usdg_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SellShares>,
    outcome_idx: u8,
    shares: u64,
    min_proceeds: u64,
) -> Result<()> {
    // ── Cache values before any mutable borrows ───────────────────────────────
    let resolved       = ctx.accounts.market.resolved;
    let n_outcomes     = ctx.accounts.market.outcomes.len();
    let market_b       = ctx.accounts.market.b;
    let market_b_alpha = ctx.accounts.market.b_alpha;
    let market_b_min   = ctx.accounts.market.b_min;
    let market_volume  = ctx.accounts.market.total_volume;
    let market_authority  = ctx.accounts.market.authority;
    let market_id_bytes   = ctx.accounts.market.market_id.to_le_bytes();
    let market_bump       = ctx.accounts.market.bump;

    // ── Validate ─────────────────────────────────────────────────────────────
    require!(!resolved, ErrorCode::MarketAlreadyResolved);
    require!(
        (outcome_idx as usize) < n_outcomes,
        ErrorCode::InvalidOutcomeIndex
    );
    require!(shares > 0, ErrorCode::InvalidInput);
    require!(
        ctx.accounts.position.shares.len() > outcome_idx as usize,
        ErrorCode::InvalidOutcomeIndex
    );
    require!(
        ctx.accounts.position.shares[outcome_idx as usize] >= shares as i64,
        ErrorCode::InvalidDelta
    );

    // ── Proceeds via LS-LMSR (negative delta → negative cost → user receives) ─
    let cost = trade_cost(
        &ctx.accounts.market.quantities,
        outcome_idx as usize,
        -(shares as i64),
        market_b,
    )?;
    require!(cost < 0, ErrorCode::InvalidDelta);
    let proceeds = (-cost) as u64;
    require!(proceeds >= min_proceeds, ErrorCode::SlippageExceeded);

    // ── Cost-basis reduction (proportional to shares sold) ────────────────────
    let held = ctx.accounts.position.shares[outcome_idx as usize] as u64;
    let cost_basis_reduction = ctx.accounts.position.cost_basis
        .saturating_mul(shares)
        .saturating_div(held.max(1));

    // ── Transfer proceeds (subsidy vault → user), signed by market PDA ────────
    let seeds: &[&[u8]] = &[
        b"market",
        market_authority.as_ref(),
        market_id_bytes.as_ref(),
        &[market_bump],
    ];
    let signer_seeds = &[seeds];

    token::transfer(
        CpiContext::new_with_signer(
            Token::id(),
            Transfer {
                from:      ctx.accounts.subsidy_vault.to_account_info(),
                to:        ctx.accounts.user_usdg_account.to_account_info(),
                authority: ctx.accounts.market.to_account_info(),
            },
            signer_seeds,
        ),
        proceeds,
    )?;

    // ── Update market state ───────────────────────────────────────────────────
    let new_volume = market_volume.saturating_add(shares); // volume always increases
    let new_b      = update_b(market_b, new_volume, market_b_alpha, market_b_min);

    ctx.accounts.market.quantities[outcome_idx as usize] =
        ctx.accounts.market.quantities[outcome_idx as usize].saturating_sub(shares as i64);
    ctx.accounts.market.total_volume = new_volume;
    ctx.accounts.market.b            = new_b;

    // ── Update position ───────────────────────────────────────────────────────
    ctx.accounts.position.shares[outcome_idx as usize] =
        ctx.accounts.position.shares[outcome_idx as usize].saturating_sub(shares as i64);
    ctx.accounts.position.cost_basis =
        ctx.accounts.position.cost_basis.saturating_sub(cost_basis_reduction);

    Ok(())
}
