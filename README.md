# FORGE

Permissionless prediction market primitive on Solana.

LS-LMSR with bounded loss, zero impermanent loss, and self-calibrating liquidity. Works at $1 or $1M on the same codebase.

## Architecture

- **Core invariant**: Liquidity-Sensitive Logarithmic Market Scoring Rule (LS-LMSR)
- **Liquidity**: Protocol is the market maker. Zero cold-start problem.
- **Scale**: `b` parameter auto-calibrates with volume. No manual recapitalization.
- **Multi-outcome**: Binary and categorical markets (up to 8 outcomes) on the same codebase.
- **Composable**: Any Solana program can integrate via CPI.

## Program Structure
programs/forge/src/
├── math/lmsr.rs       # Fixed-point LMSR math (no floats)
├── state/             # Market, Position, CreatorStats accounts
├── instructions/      # All instruction handlers
└── errors.rs          # Program error codes

## Development

### Prerequisites
- Rust 1.95+
- Solana CLI 2.1.21+
- Anchor CLI 1.0.1+
- Node.js 20+

### Build
```bash
anchor build
```

### Test
```bash
anchor test
```

## License

MIT
