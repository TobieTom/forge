use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{constants::DECIMALS, errors::ErrorCode, state::*};

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump = position.bump,
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

    pub usdg_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimWinnings>) -> Result<()> {
    // ── Validate ─────────────────────────────────────────────────────────────
    require!(ctx.accounts.market.resolved, ErrorCode::MarketNotResolved);
    require!(!ctx.accounts.market.disputed, ErrorCode::MarketNotDisputed);
    require!(
        Clock::get()?.unix_timestamp > ctx.accounts.market.dispute_window_end,
        ErrorCode::DisputeWindowActive
    );
    require!(
        ctx.accounts.market.winning_outcome.is_some(),
        ErrorCode::MarketNotResolved
    );

    // ── Winning shares ───────────────────────────────────────────────────────
    let winning_idx = ctx.accounts.market.winning_outcome.unwrap() as usize;
    require!(
        winning_idx < ctx.accounts.position.shares.len(),
        ErrorCode::InvalidOutcomeIndex
    );
    let winning_shares = ctx.accounts.position.shares[winning_idx];
    require!(winning_shares > 0, ErrorCode::InvalidInput);

    // ── Payout: 1 winning share = DECIMALS USDG (1.0 USDG at 6dp) ───────────
    let payout = (winning_shares as u64).saturating_mul(DECIMALS);

    // ── Transfer from subsidy_vault → user, signed by market PDA ─────────────
    let market_authority = ctx.accounts.market.authority;
    let market_id_bytes  = ctx.accounts.market.market_id.to_le_bytes();
    let market_bump      = ctx.accounts.market.bump;

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
        payout,
    )?;

    // ── Zero out position to prevent double-claim ─────────────────────────────
    for share in ctx.accounts.position.shares.iter_mut() {
        *share = 0;
    }
    ctx.accounts.position.cost_basis = 0;

    Ok(())
}
