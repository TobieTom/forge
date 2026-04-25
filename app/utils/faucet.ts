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

const FAUCET_PROGRAM_ID = new PublicKey('ENyEbNq3P7vDhwnVoH2ZK7sJbtWikastzuLVH6fcg84');
const MOCK_USDC_MINT = new PublicKey('2HKByQFYJ48sQatPwLxr6DCwuV8o4b5dVZrwUNgVqvaA');

export async function mintTestUSDC(
  connection: Connection,
  wallet: WalletContextState,
): Promise<string> {
  if (!wallet.connected || !wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const user = wallet.publicKey;
  const ata = await getAssociatedTokenAddress(MOCK_USDC_MINT, user);

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
        { pubkey: user,              isSigner: true,  isWritable: true  },
        { pubkey: MOCK_USDC_MINT,    isSigner: false, isWritable: true  },
        { pubkey: ata,               isSigner: false, isWritable: true  },
        { pubkey: TOKEN_PROGRAM_ID,  isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId,     isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY,          isSigner: false, isWritable: false },
      ],
      data: Buffer.from([]),
    }),
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = user;

  const sig = await wallet.sendTransaction(tx, connection);
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });

  return sig;
}

export async function getUSDCBalance(
  connection: Connection,
  walletPubkey: PublicKey,
): Promise<number> {
  const ata = await getAssociatedTokenAddress(MOCK_USDC_MINT, walletPubkey);
  try {
    const account = await getAccount(connection, ata);
    return Number(account.amount) / 1_000_000; // USDC has 6 decimals
  } catch {
    return 0;
  }
}
