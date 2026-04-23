use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{constants::*, errors::ErrorCode, state::*};

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"market_counter"],
        bump,
        space = MarketCounter::LEN,
    )]
    pub market_counter: Account<'info, MarketCounter>,

    #[account(
        init,
        payer = authority,
        seeds = [b"market", authority.key().as_ref(), &market_counter.count.to_le_bytes()],
        bump,
        space = Market::LEN,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = authority,
        token::mint = usdg_mint,
        token::authority = market,
        seeds = [b"subsidy_vault", market.key().as_ref()],
        bump,
    )]
    pub subsidy_vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"creator_stats", authority.key().as_ref()],
        bump,
        space = CreatorStats::LEN,
    )]
    pub creator_stats: Account<'info, CreatorStats>,

    #[account(mut)]
    pub creator_usdg_account: Account<'info, TokenAccount>,

    pub usdg_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateMarket>,
    description: String,
    outcomes: Vec<String>,
    initial_b: u64,
    creator_fee_bps: u16,
    resolution_timestamp: i64,
    market_type: u8,
) -> Result<()> {
    // ── Validate inputs ──────────────────────────────────────────────────────
    require!(
        outcomes.len() >= 2 && outcomes.len() <= MAX_OUTCOMES,
        ErrorCode::MaxOutcomesExceeded
    );
    require!(
        description.len() <= MAX_DESCRIPTION_LEN,
        ErrorCode::MarketDescriptionTooLong
    );
    for name in &outcomes {
        require!(name.len() <= MAX_OUTCOME_NAME_LEN, ErrorCode::OutcomeNameTooLong);
    }
    require!(creator_fee_bps <= CREATOR_FEE_BPS_MAX, ErrorCode::Unauthorized);
    let now = Clock::get()?.unix_timestamp;
    require!(resolution_timestamp > now, ErrorCode::InvalidInput);
    require!(initial_b >= BOND_MIN_LAMPORTS, ErrorCode::InsufficientSubsidy);

    // ── Bond and deposit amounts ─────────────────────────────────────────────
    let resolution_bond = (initial_b / 20).max(BOND_MIN_LAMPORTS);
    let total_deposit = initial_b
        .checked_add(resolution_bond)
        .ok_or(ErrorCode::InvalidInput)?;

    // ── Transfer USDG from creator to subsidy vault ──────────────────────────
    token::transfer(
        CpiContext::new(
            Token::id(),
            Transfer {
                from: ctx.accounts.creator_usdg_account.to_account_info(),
                to: ctx.accounts.subsidy_vault.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        total_deposit,
    )?;

    // ── Market counter ───────────────────────────────────────────────────────
    let market_id = ctx.accounts.market_counter.count;
    ctx.accounts.market_counter.count += 1;
    ctx.accounts.market_counter.bump = ctx.bumps.market_counter;

    // ── Initialize market ────────────────────────────────────────────────────
    let n = outcomes.len();
    let market = &mut ctx.accounts.market;
    market.authority          = ctx.accounts.authority.key();
    market.market_id          = market_id;
    market.description        = description;
    market.outcomes           = outcomes;
    market.quantities         = vec![0i64; n];
    market.b                  = initial_b;
    market.b_alpha            = B_ALPHA_DEFAULT;
    market.b_min              = initial_b;
    market.total_volume       = 0;
    market.subsidy_vault      = ctx.accounts.subsidy_vault.key();
    market.creator_fee_bps    = creator_fee_bps;
    market.resolution_bond    = resolution_bond;
    market.resolved           = false;
    market.winning_outcome    = None;
    market.resolution_timestamp = resolution_timestamp;
    market.dispute_window_end = resolution_timestamp + DISPUTE_WINDOW_SECONDS;
    market.disputed           = false;
    market.created_at         = now;
    market.market_type        = market_type;
    market.bump               = ctx.bumps.market;

    // ── Update creator stats ─────────────────────────────────────────────────
    let stats = &mut ctx.accounts.creator_stats;
    stats.creator          = ctx.accounts.authority.key();
    stats.bump             = ctx.bumps.creator_stats;
    stats.markets_created += 1;
    stats.trust_score = ((stats.undisputed_resolutions as u128 * 100)
        / (stats.markets_resolved.max(1) as u128))
        .min(255) as u8;

    Ok(())
}
