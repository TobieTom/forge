use anchor_lang::prelude::*;
use crate::errors::ErrorCode as ForgeError;

const DECIMALS: u128 = 1_000_000;
const DECIMALS_I: i128 = 1_000_000;
const LN2: i128 = 693_147;

// ln(x) where x is 6dp fixed-point. Returns 6dp fixed-point.
// Algorithm: ln(x) = 2*(t + t³/3 + t⁵/5 + t⁷/7 + t⁹/9), t = (x-1)/(x+1).
// Range reduction: ln(x) = ln(x/2) + ln(2) for x > 4.0,
//                  ln(x) = ln(2x) - ln(2) for x < 0.25.
pub fn ln_fixed(x: u128) -> Result<i128> {
    if x == 0 {
        return Err(ForgeError::InvalidInput.into());
    }
    if x == DECIMALS {
        return Ok(0);
    }
    if x > 4 * DECIMALS {
        return Ok(ln_fixed(x / 2)? + LN2);
    }
    if x < DECIMALS / 4 {
        return Ok(ln_fixed(x * 2)? - LN2);
    }

    // t = (x - 1) / (x + 1), in 6dp
    let num = x as i128 - DECIMALS_I;
    let den = x as i128 + DECIMALS_I;
    let t = num * DECIMALS_I / den;
    let t2 = t * t / DECIMALS_I;

    let term1 = t;
    let term3 = t * t2 / DECIMALS_I / 3;
    let t4 = t2 * t2 / DECIMALS_I;
    let term5 = t * t4 / DECIMALS_I / 5;
    let t6 = t4 * t2 / DECIMALS_I;
    let term7 = t * t6 / DECIMALS_I / 7;
    let t8 = t6 * t2 / DECIMALS_I;
    let term9 = t * t8 / DECIMALS_I / 9;
    let t10 = t8 * t2 / DECIMALS_I;
    let term11 = t * t10 / DECIMALS_I / 11;
    let t12 = t10 * t2 / DECIMALS_I;
    let term13 = t * t12 / DECIMALS_I / 13;

    Ok(2 * (term1 + term3 + term5 + term7 + term9 + term11 + term13))
}

// exp(x) where x is 6dp fixed-point (can be negative). Returns 6dp fixed-point.
// Taylor series for |x| <= 2.0, doubling reduction for larger x.
// For negative x: exp(x) = DECIMALS² / exp(-x).
pub fn exp_fixed(x: i128) -> Result<u128> {
    const MAX: i128 = 20 * DECIMALS_I;
    if x > MAX || x < -MAX {
        return Err(ForgeError::InvalidInput.into());
    }
    if x == 0 {
        return Ok(DECIMALS);
    }
    if x < 0 {
        let pos = exp_fixed(-x)?;
        return Ok(DECIMALS * DECIMALS / pos);
    }
    // Range reduction: exp(x) = exp(x - ln2) * 2 until x <= 2.0
    if x > 2 * DECIMALS_I {
        let reduced = exp_fixed(x - LN2)?;
        return Ok(reduced * 2);
    }

    // Taylor: 1 + x + x²/2! + x³/3! + ... + x⁹/9!
    // All xN represent x^N in 6dp (i.e. true x^N / DECIMALS^(N-1)).
    let d = DECIMALS_I;
    let x2 = x * x / d;
    let x3 = x2 * x / d;
    let x4 = x3 * x / d;
    let x5 = x4 * x / d;
    let x6 = x5 * x / d;
    let x7 = x6 * x / d;
    let x8 = x7 * x / d;
    let x9 = x8 * x / d;

    let result = d
        + x
        + x2 / 2
        + x3 / 6
        + x4 / 24
        + x5 / 120
        + x6 / 720
        + x7 / 5040
        + x8 / 40320
        + x9 / 362880;

    Ok(result as u128)
}

// Numerically stable log-sum-exp: log(Σ exp(q_i / b)) in 6dp.
// Subtracts max(q_i/b) before summing to prevent overflow.
pub fn log_sum_exp(quantities: &[i64], b: u64) -> Result<i128> {
    if quantities.is_empty() || b == 0 {
        return Err(ForgeError::InvalidInput.into());
    }

    let b_i = b as i128;
    let max_q = *quantities.iter().max().unwrap() as i128;
    let max_scaled = max_q * DECIMALS_I / b_i;

    let mut sum: u128 = 0;
    for &q in quantities {
        let qi = q as i128;
        let exponent = (qi - max_q) * DECIMALS_I / b_i;
        sum += exp_fixed(exponent)?;
    }

    let ln_sum = ln_fixed(sum)?;
    Ok(ln_sum + max_scaled)
}

// C(q) = b * log_sum_exp(q, b) / DECIMALS. Returns 6dp USDG.
pub fn cost_function(quantities: &[i64], b: u64) -> Result<i128> {
    let lse = log_sum_exp(quantities, b)?;
    Ok(b as i128 * lse / DECIMALS_I)
}

// C(q_after) - C(q_before). Positive = user pays, negative = user receives.
pub fn trade_cost(
    quantities: &[i64],
    outcome_idx: usize,
    delta: i64,
    b: u64,
) -> Result<i128> {
    if outcome_idx >= quantities.len() || b == 0 || delta == 0 {
        return Err(ForgeError::InvalidInput.into());
    }
    let c_before = cost_function(quantities, b)?;
    let mut after = quantities.to_vec();
    after[outcome_idx] = after[outcome_idx]
        .checked_add(delta)
        .ok_or(ForgeError::InvalidInput)?;
    let c_after = cost_function(&after, b)?;
    Ok(c_after - c_before)
}

// Spot price of outcome i. Returns 6dp (0..=1_000_000).
// Uses log-sum-exp trick: subtract max(q) before exp to prevent overflow,
// then normalize directly — no ln needed for probability computation.
pub fn price(quantities: &[i64], outcome_idx: usize, b: u64) -> Result<u64> {
    if outcome_idx >= quantities.len() || b == 0 {
        return Err(ForgeError::InvalidInput.into());
    }
    let b_i = b as i128;
    let max_q = *quantities.iter().max().unwrap() as i128;

    let mut total: u128 = 0;
    for &q in quantities {
        let exponent = (q as i128 - max_q) * DECIMALS_I / b_i;
        total += exp_fixed(exponent)?;
    }

    let qi = quantities[outcome_idx] as i128;
    let numerator = exp_fixed((qi - max_q) * DECIMALS_I / b_i)?;
    Ok((numerator * DECIMALS / total) as u64)
}

// Prices for all outcomes. Guaranteed to sum to 1_000_000 ±1 via adjustment.
pub fn all_prices(quantities: &[i64], b: u64) -> Result<Vec<u64>> {
    if quantities.is_empty() || b == 0 {
        return Err(ForgeError::InvalidInput.into());
    }
    let b_i = b as i128;
    let max_q = *quantities.iter().max().unwrap() as i128;

    let mut numerators: Vec<u128> = Vec::with_capacity(quantities.len());
    let mut total: u128 = 0;
    for &q in quantities {
        let exponent = (q as i128 - max_q) * DECIMALS_I / b_i;
        let e = exp_fixed(exponent)?;
        numerators.push(e);
        total += e;
    }

    let mut prices: Vec<u64> = numerators
        .iter()
        .map(|&n| (n * DECIMALS / total) as u64)
        .collect();

    // Rounding correction: assign remainder to the largest bucket.
    let sum: u64 = prices.iter().sum();
    let target = DECIMALS as u64;
    if sum != target {
        let max_idx = prices
            .iter()
            .enumerate()
            .max_by_key(|(_, &v)| v)
            .map(|(i, _)| i)
            .unwrap();
        if sum < target {
            prices[max_idx] += target - sum;
        } else {
            prices[max_idx] = prices[max_idx].saturating_sub(sum - target);
        }
    }
    Ok(prices)
}

// LS-LMSR dynamic b update. b_new = max(b_min, b_alpha * total_volume / DECIMALS).
pub fn update_b(_current_b: u64, total_volume: u64, b_alpha: u64, b_min: u64) -> u64 {
    let computed = (b_alpha as u128 * total_volume as u128 / DECIMALS) as u64;
    computed.max(b_min)
}

// Maximum protocol loss = b * ln(n_outcomes) / DECIMALS.
pub fn max_loss(b: u64, n_outcomes: usize) -> Result<u64> {
    if n_outcomes == 0 {
        return Err(ForgeError::InvalidInput.into());
    }
    let n_fixed = (n_outcomes as u128) * DECIMALS;
    let ln_n = ln_fixed(n_fixed)?;
    Ok((b as i128 * ln_n / DECIMALS_I) as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn diff(a: i128, b: i128) -> i128 {
        (a - b).abs()
    }

    // ── ln_fixed ─────────────────────────────────────────────────────────────

    #[test]
    fn test_ln_one() {
        assert_eq!(ln_fixed(1_000_000).unwrap(), 0);
    }

    #[test]
    fn test_ln_e() {
        let r = ln_fixed(2_718_282).unwrap();
        assert!(diff(r, 1_000_000) <= 100, "ln(e)={}", r);
    }

    #[test]
    fn test_ln_half() {
        let r = ln_fixed(500_000).unwrap();
        assert!(diff(r, -693_147) <= 100, "ln(0.5)={}", r);
    }

    #[test]
    fn test_ln_zero_errors() {
        assert!(ln_fixed(0).is_err());
    }

    #[test]
    fn test_ln_large() {
        // ln(10) ≈ 2_302_585
        let r = ln_fixed(10_000_000).unwrap();
        assert!(diff(r, 2_302_585) <= 500, "ln(10)={}", r);
    }

    // ── exp_fixed ────────────────────────────────────────────────────────────

    #[test]
    fn test_exp_zero() {
        assert_eq!(exp_fixed(0).unwrap(), 1_000_000);
    }

    #[test]
    fn test_exp_one() {
        let r = exp_fixed(1_000_000).unwrap();
        assert!(diff(r as i128, 2_718_282) <= 100, "exp(1)={}", r);
    }

    #[test]
    fn test_exp_neg_one() {
        let r = exp_fixed(-1_000_000).unwrap();
        assert!(diff(r as i128, 367_879) <= 100, "exp(-1)={}", r);
    }

    #[test]
    fn test_exp_out_of_range() {
        assert!(exp_fixed(21_000_000).is_err());
        assert!(exp_fixed(-21_000_000).is_err());
    }

    // ── price / all_prices ───────────────────────────────────────────────────

    #[test]
    fn test_equal_prices_binary() {
        let q = [0i64, 0i64];
        let b = 1_000_000u64;
        let p0 = price(&q, 0, b).unwrap();
        let p1 = price(&q, 1, b).unwrap();
        assert!(diff(p0 as i128, 500_000) <= 1, "p0={}", p0);
        assert!(diff(p1 as i128, 500_000) <= 1, "p1={}", p1);
    }

    #[test]
    fn test_equal_prices_three_outcomes() {
        let q = [0i64, 0i64, 0i64];
        let b = 1_000_000u64;
        let expected = 1_000_000i64 / 3;
        for i in 0..3 {
            let p = price(&q, i, b).unwrap();
            assert!((p as i64 - expected).abs() <= 1, "outcome {} price={}", i, p);
        }
    }

    #[test]
    fn test_price_after_buy() {
        let q = [100i64, 0i64];
        let b = 1_000_000u64;
        let p_yes = price(&q, 0, b).unwrap();
        let p_no = price(&q, 1, b).unwrap();
        assert!(p_yes > 500_000, "YES={}", p_yes);
        assert!(p_no < 500_000, "NO={}", p_no);
    }

    #[test]
    fn test_all_prices_sum() {
        let q = [50i64, 20i64, 80i64, 10i64];
        let b = 2_000_000u64;
        let prices = all_prices(&q, b).unwrap();
        let sum: u64 = prices.iter().sum();
        assert!((sum as i64 - 1_000_000).abs() <= 1, "sum={}", sum);
    }

    #[test]
    fn test_all_prices_sum_equal() {
        let q = [0i64, 0i64, 0i64];
        let b = 500_000u64;
        let prices = all_prices(&q, b).unwrap();
        let sum: u64 = prices.iter().sum();
        assert!((sum as i64 - 1_000_000).abs() <= 1, "sum={}", sum);
    }

    // ── trade_cost ───────────────────────────────────────────────────────────

    #[test]
    fn test_trade_cost_buy_positive() {
        let q = [0i64, 0i64];
        let cost = trade_cost(&q, 0, 100, 1_000_000).unwrap();
        assert!(cost > 0, "buy cost={}", cost);
    }

    #[test]
    fn test_trade_cost_sell_negative() {
        let q = [1000i64, 0i64];
        let cost = trade_cost(&q, 0, -100, 1_000_000).unwrap();
        assert!(cost < 0, "sell cost={}", cost);
    }

    #[test]
    fn test_trade_cost_invalid() {
        let q = [0i64, 0i64];
        assert!(trade_cost(&q, 5, 1, 1_000_000).is_err());
        assert!(trade_cost(&q, 0, 0, 1_000_000).is_err());
        assert!(trade_cost(&q, 0, 1, 0).is_err());
    }

    // ── update_b ─────────────────────────────────────────────────────────────

    #[test]
    fn test_update_b_never_below_min() {
        assert_eq!(update_b(5_000_000, 0, 10_000, 100_000), 100_000);
        assert_eq!(update_b(5_000_000, 1, 10_000, 100_000), 100_000);
    }

    #[test]
    fn test_update_b_scales_with_volume() {
        // b_alpha=10_000 (α=0.01), volume=10_000_000_000 → b_new=100_000_000
        let b = update_b(0, 10_000_000_000, 10_000, 100_000);
        assert_eq!(b, 100_000_000);
    }

    // ── max_loss ─────────────────────────────────────────────────────────────

    #[test]
    fn test_max_loss_binary() {
        let ml = max_loss(1_000_000, 2).unwrap();
        assert!(diff(ml as i128, 693_147) <= 200, "max_loss={}", ml);
    }

    #[test]
    fn test_max_loss_zero_errors() {
        assert!(max_loss(1_000_000, 0).is_err());
    }
}
