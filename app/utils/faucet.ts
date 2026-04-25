import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { sha256 } from '@noble/hashes/sha256';

const FAUCET_PROGRAM_ID = new PublicKey('ENyEbNq3P7vDhwnVoH2ZK7sJbtWikastzuLVH6fcg84');
const MOCK_USDC_MINT = new PublicKey('2HKByQFYJ48sQatPwLxr6DCwuV8o4b5dVZrwUNgVqvaA');

// Anchor discriminator: first 8 bytes of sha256("global:faucet_mint")
const FAUCET_MINT_DISCRIMINATOR = Buffer.from(sha256('global:faucet_mint')).slice(0, 8);

export async function mintTestUSDC(
  connection: Connection,
  wallet: WalletContextState,
): Promise<string> {
  if (!wallet.connected || !wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const user = wallet.publicKey;
  const ata = await getAssociatedTokenAddress(MOCK_USDC_MINT, user);

  console.log('Faucet accounts:', {
    user: user.toString(),
    userTokenAccount: ata.toString(),
    mint: MOCK_USDC_MINT.toString(),
  });

  const tx = new Transaction();

  // Create ATA if it doesn't exist
  try {
    await getAccount(connection, ata);
  } catch {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        ata,
        user,
        MOCK_USDC_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
  }

  tx.add(
    new TransactionInstruction({
      programId: FAUCET_PROGRAM_ID,
      keys: [
        { pubkey: user,                        isSigner: true,  isWritable: true  },
        { pubkey: MOCK_USDC_MINT,              isSigner: false, isWritable: true  },
        { pubkey: ata,                         isSigner: false, isWritable: true  },
        { pubkey: TOKEN_PROGRAM_ID,            isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId,     isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY,          isSigner: false, isWritable: false },
      ],
      data: FAUCET_MINT_DISCRIMINATOR,
    }),
  );

  console.log('Faucet discriminator:', FAUCET_MINT_DISCRIMINATOR.toString('hex'));

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = user;

  try {
    const sig = await wallet.sendTransaction(tx, connection);
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
    return sig;
  } catch (error: unknown) {
    const err = error as { message?: string; logs?: string[] };
    console.error('Faucet error full:', error);
    console.error('Faucet error message:', err?.message);
    console.error('Faucet error logs:', err?.logs);
    throw new Error(err?.message || 'Faucet failed');
  }
}

export async function getUSDCBalance(
  connection: Connection,
  walletPubkey: PublicKey,
): Promise<number> {
  try {
    const ata = await getAssociatedTokenAddress(MOCK_USDC_MINT, walletPubkey);
    const account = await getAccount(connection, ata);
    return Number(account.amount) / 1_000_000; // USDC has 6 decimals
  } catch {
    return 0;
  }
}
