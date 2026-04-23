use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{constants::BOND_MIN_LAMPORTS, errors::ErrorCode, state::*};

#[derive(Accounts)]
pub struct DepositSubsidy<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"subsidy_vault", market.key().as_ref()],
        bump,
    )]
    pub subsidy_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub contributor_usdg_account: Account<'info, TokenAccount>,

    pub usdg_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<DepositSubsidy>, amount: u64) -> Result<()> {
    // ── Validate ─────────────────────────────────────────────────────────────
    require!(!ctx.accounts.market.resolved, ErrorCode::MarketAlreadyResolved);
    require!(amount >= BOND_MIN_LAMPORTS, ErrorCode::InsufficientSubsidy);
    require!(
        Clock::get()?.unix_timestamp < ctx.accounts.market.resolution_timestamp,
        ErrorCode::InvalidInput
    );

    // ── Transfer USDG from contributor to subsidy vault ───────────────────────
    token::transfer(
        CpiContext::new(
            Token::id(),
            Transfer {
                from:      ctx.accounts.contributor_usdg_account.to_account_info(),
                to:        ctx.accounts.subsidy_vault.to_account_info(),
                authority: ctx.accounts.contributor.to_account_info(),
            },
        ),
        amount,
    )?;

    // ── Deepen market liquidity ───────────────────────────────────────────────
    ctx.accounts.market.b     = ctx.accounts.market.b.saturating_add(amount);
    ctx.accounts.market.b_min = ctx.accounts.market.b_min.saturating_add(amount);

    Ok(())
}
