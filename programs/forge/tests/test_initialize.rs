use anchor_lang::{
    prelude::Pubkey,
    solana_program::{instruction::Instruction, system_instruction},
    AccountDeserialize, InstructionData, ToAccountMetas,
};
use litesvm::LiteSVM;
use solana_clock::Clock;
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_program_pack::Pack;
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;
use spl_associated_token_account_interface::program::ID as ATA_PROGRAM_ID;
use spl_token_interface::{
    instruction as token_ix,
    state::{Account as TokenAccount, Mint as MintState},
    ID as TOKEN_PROGRAM_ID,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

fn program_bytes() -> &'static [u8] {
    include_bytes!("../../../target/deploy/forge.so")
}

fn send(svm: &mut LiteSVM, ixs: &[Instruction], payer: &Keypair, extra: &[&Keypair]) {
    let hash = svm.latest_blockhash();
    // Deduplicate: extra signers with the same pubkey as payer are redundant.
    let mut all: Vec<&Keypair> = vec![payer];
    for k in extra {
        if k.pubkey() != payer.pubkey() {
            all.push(k);
        }
    }
    let msg = Message::new_with_blockhash(ixs, Some(&payer.pubkey()), &hash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &all).unwrap();
    svm.send_transaction(tx).expect("transaction failed");
}

fn set_clock(svm: &mut LiteSVM, unix_timestamp: i64) {
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = unix_timestamp;
    svm.set_sysvar(&clock);
}

fn get_token_balance(svm: &LiteSVM, acct: &Pubkey) -> u64 {
    let data = svm.get_account(acct).expect("token account missing").data;
    TokenAccount::unpack(&data).expect("unpack failed").amount
}

fn setup_mint(svm: &mut LiteSVM, payer: &Keypair) -> Keypair {
    let mint_kp = Keypair::new();
    let space = MintState::LEN;
    let lamports = svm.minimum_balance_for_rent_exemption(space);
    let create_ix = system_instruction::create_account(
        &payer.pubkey(),
        &mint_kp.pubkey(),
        lamports,
        space as u64,
        &TOKEN_PROGRAM_ID,
    );
    let init_ix = token_ix::initialize_mint2(
        &TOKEN_PROGRAM_ID,
        &mint_kp.pubkey(),
        &payer.pubkey(),
        None,
        6,
    )
    .unwrap();
    send(svm, &[create_ix, init_ix], payer, &[&mint_kp]);
    mint_kp
}

fn setup_token_account(
    svm: &mut LiteSVM,
    payer: &Keypair,
    mint: &Pubkey,
    owner: &Pubkey,
) -> Keypair {
    let acct_kp = Keypair::new();
    let space = TokenAccount::LEN;
    let lamports = svm.minimum_balance_for_rent_exemption(space);
    let create_ix = system_instruction::create_account(
        &payer.pubkey(),
        &acct_kp.pubkey(),
        lamports,
        space as u64,
        &TOKEN_PROGRAM_ID,
    );
    let init_ix =
        token_ix::initialize_account3(&TOKEN_PROGRAM_ID, &acct_kp.pubkey(), mint, owner).unwrap();
    send(svm, &[create_ix, init_ix], payer, &[&acct_kp]);
    acct_kp
}

fn mint_tokens(
    svm: &mut LiteSVM,
    payer: &Keypair,
    mint: &Pubkey,
    dest: &Pubkey,
    mint_auth: &Keypair,
    amount: u64,
) {
    let ix = token_ix::mint_to(&TOKEN_PROGRAM_ID, mint, dest, &mint_auth.pubkey(), &[], amount)
        .unwrap();
    send(svm, &[ix], payer, &[mint_auth]);
}

fn system_id() -> Pubkey {
    anchor_lang::solana_program::system_program::ID
}

fn rent_id() -> Pubkey {
    solana_sdk_ids::sysvar::rent::ID
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[test]
fn test_initialize() {
    let program_id = forge::id();
    let payer = Keypair::new();
    let mut svm = LiteSVM::new();
    svm.add_program(program_id, program_bytes()).unwrap();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();

    let instruction = Instruction::new_with_bytes(
        program_id,
        &forge::instruction::Initialize {}.data(),
        forge::accounts::Initialize {}.to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[instruction], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[payer]).unwrap();

    let res = svm.send_transaction(tx);
    assert!(res.is_ok());
}

#[test]
fn test_full_lifecycle() {
    let program_id = forge::id();
    let mut svm = LiteSVM::new();
    svm.add_program(program_id, program_bytes()).unwrap();

    let authority = Keypair::new();
    let user = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&user.pubkey(), 10_000_000_000).unwrap();

    set_clock(&mut svm, 1_000);

    let mint_kp = setup_mint(&mut svm, &authority);
    let mint = mint_kp.pubkey();

    let creator_acct_kp = setup_token_account(&mut svm, &authority, &mint, &authority.pubkey());
    let creator_acct = creator_acct_kp.pubkey();
    let user_acct_kp = setup_token_account(&mut svm, &authority, &mint, &user.pubkey());
    let user_acct = user_acct_kp.pubkey();

    mint_tokens(&mut svm, &authority, &mint, &creator_acct, &authority, 100_000_000);
    mint_tokens(&mut svm, &authority, &mint, &user_acct, &authority, 100_000_000);

    // ── CREATE MARKET ─────────────────────────────────────────────────────────
    let initial_b: u64 = 5_000_000;
    let creator_fee_bps: u16 = 30;
    let resolution_timestamp: i64 = 1_000 + 3_600;
    let market_id: u64 = 0;

    let (market_counter_pda, _) =
        Pubkey::find_program_address(&[b"market_counter"], &program_id);
    let (market_pda, _) = Pubkey::find_program_address(
        &[b"market", authority.pubkey().as_ref(), &market_id.to_le_bytes()],
        &program_id,
    );
    let (subsidy_vault_pda, _) =
        Pubkey::find_program_address(&[b"subsidy_vault", market_pda.as_ref()], &program_id);
    let (creator_stats_pda, _) = Pubkey::find_program_address(
        &[b"creator_stats", authority.pubkey().as_ref()],
        &program_id,
    );

    let create_market_ix = Instruction::new_with_bytes(
        program_id,
        &forge::instruction::CreateMarket {
            description: "Will SOL close above $100 on May 1 2026?".to_string(),
            outcomes: vec!["YES".to_string(), "NO".to_string()],
            initial_b,
            creator_fee_bps,
            resolution_timestamp,
            market_type: 0,
        }
        .data(),
        forge::accounts::CreateMarket {
            authority: authority.pubkey(),
            market_counter: market_counter_pda,
            market: market_pda,
            subsidy_vault: subsidy_vault_pda,
            creator_stats: creator_stats_pda,
            creator_usdg_account: creator_acct,
            usdg_mint: mint,
            token_program: TOKEN_PROGRAM_ID,
            associated_token_program: ATA_PROGRAM_ID,
            system_program: system_id(),
            rent: rent_id(),
        }
        .to_account_metas(None),
    );
    send(&mut svm, &[create_market_ix], &authority, &[]);

    // Verify market account
    let market_data = svm.get_account(&market_pda).unwrap().data;
    let market =
        forge::Market::try_deserialize(&mut market_data.as_slice()).expect("deserialize Market");
    assert_eq!(market.b, initial_b);
    assert_eq!(market.market_id, 0);
    assert_eq!(market.outcomes, vec!["YES", "NO"]);
    assert!(!market.resolved);
    assert_eq!(market.resolution_timestamp, resolution_timestamp);

    let resolution_bond = (initial_b / 20).max(1_000_000);
    let total_deposit = initial_b + resolution_bond;
    assert_eq!(get_token_balance(&svm, &creator_acct), 100_000_000 - total_deposit);
    assert_eq!(get_token_balance(&svm, &subsidy_vault_pda), total_deposit);

    // ── BUY SHARES ────────────────────────────────────────────────────────────
    // With b=5_000_000 and DECIMALS=1_000_000, the exponent = shares*DECIMALS/b must
    // be large enough that the fixed-point cost is detectable (> 0).
    // Buying 6 shares: exponent = 6*1e6/5e6 = 1 → cost ≈ 5 atomic units > 0.
    let shares_to_buy: u64 = 6;
    let max_cost: u64 = 1_000; // actual cost ≈ 5 atomic units

    let (position_pda, _) = Pubkey::find_program_address(
        &[b"position", market_pda.as_ref(), user.pubkey().as_ref()],
        &program_id,
    );

    let user_balance_before_buy = get_token_balance(&svm, &user_acct);

    let buy_ix = Instruction::new_with_bytes(
        program_id,
        &forge::instruction::BuyShares {
            outcome_idx: 0,
            shares: shares_to_buy,
            max_cost,
        }
        .data(),
        forge::accounts::BuyShares {
            user: user.pubkey(),
            market: market_pda,
            position: position_pda,
            subsidy_vault: subsidy_vault_pda,
            user_usdg_account: user_acct,
            creator_usdg_account: creator_acct,
            usdg_mint: mint,
            token_program: TOKEN_PROGRAM_ID,
            system_program: system_id(),
            rent: rent_id(),
        }
        .to_account_metas(None),
    );
    send(&mut svm, &[buy_ix], &user, &[]);

    let pos_data = svm.get_account(&position_pda).unwrap().data;
    let position =
        forge::Position::try_deserialize(&mut pos_data.as_slice()).expect("deserialize Position");
    assert_eq!(position.shares[0], shares_to_buy as i64);
    assert_eq!(position.shares[1], 0);

    let user_balance_after_buy = get_token_balance(&svm, &user_acct);
    let cost_paid = user_balance_before_buy - user_balance_after_buy;
    assert!(cost_paid > 0 && cost_paid <= max_cost);

    // ── SELL SHARES ───────────────────────────────────────────────────────────
    // Selling 2 shares from [6, 0] → [4, 0].
    // Exponent drops to 0 (4*1e6/5e6=0 truncated), cost ≈ -5 atomic units → proceeds = 5.
    let shares_to_sell: u64 = 2;
    let user_balance_before_sell = get_token_balance(&svm, &user_acct);

    let sell_ix = Instruction::new_with_bytes(
        program_id,
        &forge::instruction::SellShares {
            outcome_idx: 0,
            shares: shares_to_sell,
            min_proceeds: 0,
        }
        .data(),
        forge::accounts::SellShares {
            user: user.pubkey(),
            market: market_pda,
            position: position_pda,
            subsidy_vault: subsidy_vault_pda,
            user_usdg_account: user_acct,
            usdg_mint: mint,
            token_program: TOKEN_PROGRAM_ID,
            system_program: system_id(),
        }
        .to_account_metas(None),
    );
    send(&mut svm, &[sell_ix], &user, &[]);

    let pos_data = svm.get_account(&position_pda).unwrap().data;
    let position =
        forge::Position::try_deserialize(&mut pos_data.as_slice()).expect("deserialize Position");
    assert_eq!(position.shares[0], (shares_to_buy - shares_to_sell) as i64);

    let user_balance_after_sell = get_token_balance(&svm, &user_acct);
    assert!(user_balance_after_sell > user_balance_before_sell, "received sell proceeds");

    // ── RESOLVE MARKET ────────────────────────────────────────────────────────
    set_clock(&mut svm, resolution_timestamp + 1);

    let resolve_ix = Instruction::new_with_bytes(
        program_id,
        &forge::instruction::ResolveMarket { winning_outcome: 0 }.data(),
        forge::accounts::ResolveMarket {
            authority: authority.pubkey(),
            market: market_pda,
            creator_stats: creator_stats_pda,
            system_program: system_id(),
        }
        .to_account_metas(None),
    );
    send(&mut svm, &[resolve_ix], &authority, &[]);

    let market_data = svm.get_account(&market_pda).unwrap().data;
    let market =
        forge::Market::try_deserialize(&mut market_data.as_slice()).expect("deserialize Market");
    assert!(market.resolved);
    assert_eq!(market.winning_outcome, Some(0));

    // ── CLAIM WINNINGS ────────────────────────────────────────────────────────
    let dispute_window_end = resolution_timestamp + 259_200; // DISPUTE_WINDOW_SECONDS = 72h
    set_clock(&mut svm, dispute_window_end + 1);

    let user_balance_before_claim = get_token_balance(&svm, &user_acct);

    let claim_ix = Instruction::new_with_bytes(
        program_id,
        &forge::instruction::ClaimWinnings {}.data(),
        forge::accounts::ClaimWinnings {
            user: user.pubkey(),
            market: market_pda,
            position: position_pda,
            subsidy_vault: subsidy_vault_pda,
            user_usdg_account: user_acct,
            usdg_mint: mint,
            token_program: TOKEN_PROGRAM_ID,
            system_program: system_id(),
        }
        .to_account_metas(None),
    );
    send(&mut svm, &[claim_ix], &user, &[]);

    let winning_shares = (shares_to_buy - shares_to_sell) as u64;
    let expected_payout = winning_shares * 1_000_000; // DECIMALS = 1_000_000
    let user_balance_after_claim = get_token_balance(&svm, &user_acct);
    assert_eq!(user_balance_after_claim - user_balance_before_claim, expected_payout);

    let pos_data = svm.get_account(&position_pda).unwrap().data;
    let position =
        forge::Position::try_deserialize(&mut pos_data.as_slice()).expect("deserialize Position");
    assert!(position.shares.iter().all(|&s| s == 0), "position zeroed after claim");
}

// ── Devnet smoke test (ignored, requires network + deployed program) ───────────

#[test]
#[ignore]
fn test_devnet_program_exists() {
    let output = std::process::Command::new("solana")
        .args(["account", "J6tbrmGmpQ7bskpUB2DXcjjDp4VwVs78haXQ7FqZ1CUi", "--url", "devnet"])
        .output()
        .expect("solana CLI not found");
    assert!(
        output.status.success(),
        "program not found on devnet: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("executable: true"),
        "program should be executable: {}",
        stdout
    );
}
