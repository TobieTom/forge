use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Market has already been resolved")]
    MarketAlreadyResolved,
    #[msg("Market has not been resolved yet")]
    MarketNotResolved,
    #[msg("Outcome index is out of range for this market")]
    InvalidOutcomeIndex,
    #[msg("Subsidy amount is insufficient to initialize the market")]
    InsufficientSubsidy,
    #[msg("Trade price moved beyond the allowed slippage tolerance")]
    SlippageExceeded,
    #[msg("Invalid input")]
    InvalidInput,
    #[msg("Signer is not authorized to perform this action")]
    Unauthorized,
    #[msg("The dispute window is still active")]
    DisputeWindowActive,
    #[msg("The dispute window has already closed")]
    DisputeWindowClosed,
    #[msg("Number of outcomes exceeds the maximum allowed")]
    MaxOutcomesExceeded,
    #[msg("Outcome name exceeds the maximum allowed length")]
    OutcomeNameTooLong,
    #[msg("Market description exceeds the maximum allowed length")]
    MarketDescriptionTooLong,
    #[msg("Resolution bond is below the minimum required amount")]
    BondTooSmall,
    #[msg("Trade delta must be non-zero")]
    InvalidDelta,
    #[msg("Market is not in a disputed state")]
    MarketNotDisputed,
}
