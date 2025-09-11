import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Pnlpackprogram } from "../target/types/pnlpackprogram";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo, 
  getAccount,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync 
} from "@solana/spl-token";
import adminKeypair from "./admin.json";

// Use explicit provider options to reduce stale blockhash issues
const confirmOpts: anchor.web3.ConfirmOptions = {
  commitment: "confirmed",
  preflightCommitment: "confirmed",
  skipPreflight: false,
  maxRetries: 5,
};
const defaultProvider = anchor.AnchorProvider.env();
const provider = new anchor.AnchorProvider(defaultProvider.connection, defaultProvider.wallet, confirmOpts);
anchor.setProvider(provider);

async function retryRpc<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    const msg = String(e);
    if (retries > 0 && /Blockhash not found/i.test(msg)) {
      // refresh blockhash
      await provider.connection.getLatestBlockhash("confirmed");
      return retryRpc(fn, retries - 1);
    }
    throw e;
  }
}

// Pretty logging helpers
function banner(title: string) {
  console.log("\n========================================");
  console.log(title);
  console.log("========================================\n");
}
function step(title: string) {
  console.log(`\n▶ ${title}`);
}
function kv(label: string, value: string | number | boolean) {
  console.log(`  • ${label}: ${value}`);
}


describe("pnlpackprogram", () => {
  const admin = anchor.web3.Keypair.fromSecretKey(new Uint8Array(adminKeypair));

  const program = anchor.workspace.pnlpackprogram as Program<Pnlpackprogram>;
  const connection = provider.connection;

  let mintAddress: PublicKey;
  let adminTokenAccount: PublicKey;

  it("Is initialized!", async () => {
    banner("INIT PROGRAM TEST");
    const tx = await program.methods.initialize().rpc();
    kv("Initialize tx", tx);
  });

  it("[TEST1] Initializes the global packs pool(treasury) where all the raise money goes", async () => {
    banner("TEST1: INIT GLOBAL PACK POOL (TREASURY)");
    const total_kols = 50;
    kv("Total KOLs", total_kols);
    const [globalPackPoolAccount] =  anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("global_pack_pool")], program.programId)
    kv("Global Pack Pool PDA", globalPackPoolAccount.toString());

    step("Send init_global_pack_pool");
    const tx = await program.methods.initGlobalPackPool(total_kols)
    .accountsPartial({
      admin: admin.publicKey,
      globalPackPool: globalPackPoolAccount
    })
    .signers([admin])
    .rpc({commitment: "confirmed"});
    kv("Tx", tx);
  });

  it("[TEST2] Transfer 0.1 SOL from user to pool during pack raise", async () => {
    banner("TEST2: TRANSFER 0.1 SOL TO POOL");
    const [globalPackPoolAccount] =  anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("global_pack_pool")], program.programId)
    const amount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

    const balanceBefore = await connection.getBalance(globalPackPoolAccount)
    kv("Treasury balance (before, SOL)", balanceBefore/LAMPORTS_PER_SOL);

    step("Send transfer_to_pack_pool");
    const tx = await program.methods.transferToPackPool(amount)
    .accountsPartial({
      globalPackPool: globalPackPoolAccount,
      user: admin.publicKey,
    })
    .signers([admin])
    .rpc({commitment: "confirmed"});
    kv("Tx", tx);

    const balanceAfter = await connection.getBalance(globalPackPoolAccount)
    kv("Treasury balance (after, SOL)", balanceAfter/LAMPORTS_PER_SOL);
  });

  it("[SETUP] Create test token mint and mint 1B tokens to admin", async () => {
    banner("SETUP: CREATE TEST MINT + MINT 1B TO ADMIN");
    
    mintAddress = await createMint(
      connection,
      admin,
      admin.publicKey,
      admin.publicKey,
      6 // 6 decimals
    );
    kv("Mint", mintAddress.toString());
    
    const tokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      mintAddress,
      admin.publicKey
    );
    adminTokenAccount = tokenAccountInfo.address;
    kv("Admin ATA", adminTokenAccount.toString());
    
    const mintAmount = BigInt("1000000000000000"); // 1B * 10^6
    step("Mint 1B tokens to admin");
    await mintTo(
      connection,
      admin,
      mintAddress,
      adminTokenAccount,
      admin.publicKey,
      mintAmount
    );
    const tokenAccount = await getAccount(connection, adminTokenAccount);
    kv("Admin token balance (human)", Number(tokenAccount.amount) / Math.pow(10, 6));
  });

  it("[TEST8] SUPER COMBINED: Create mint, mint 1B tokens, initialize vault, and transfer 940M from admin->vault in minimal transactions", async () => {
    banner("TEST8: SUPER COMBINED FLOW (MINT + VAULT + TRANSFER)");
    
    const kolTicker = "SUPER";
    const totalSupply = new anchor.BN("1000000000000000"); // 1B tokens with 6 decimals
    const vaultTransferAmount = new anchor.BN("940000000000000"); // 940M tokens with 6 decimals
    kv("KOL", kolTicker);
    kv("Total supply", totalSupply.toString());
    kv("Vault transfer", vaultTransferAmount.toString());
    
    const [globalPackPoolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_pack_pool")], 
      program.programId
    );
    kv("Global Pack Pool PDA", globalPackPoolAccount.toString());
    
    // CREATING THE MINT FIRST
    step("Create new mint");
    const newMintKeypair = anchor.web3.Keypair.generate();
    await createMint(
      connection,
      admin,
      admin.publicKey, 
      admin.publicKey, 
      6, 
      newMintKeypair 
    );
    kv("New mint", newMintKeypair.publicKey.toString());
    
    const adminTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      newMintKeypair.publicKey,
      admin.publicKey
    );
    kv("Admin ATA", adminTokenAccountInfo.address.toString());
    
    step("Derive token vault PDA");
    const [tokenVaultAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("token_vault"),
        Buffer.from(kolTicker),
        globalPackPoolAccount.toBuffer()
      ],
      program.programId
    );
    kv("Token vault PDA", tokenVaultAccount.toString());
    
    const adminBalanceBefore = await getAccount(connection, adminTokenAccountInfo.address);
    kv("Admin balance before (human)", Number(adminBalanceBefore.amount) / Math.pow(10, 6));
    
    const startTime = Date.now();
    step("Execute super combined instruction");
    const tx = await program.methods.mintAndInitKolTokenVaultAndTransfer(
        kolTicker, 
        totalSupply, 
        vaultTransferAmount
      )
      .accountsPartial({
        globalPackPool: globalPackPoolAccount,
        admin: admin.publicKey,
        mint: newMintKeypair.publicKey,
        adminTokenAccount: adminTokenAccountInfo.address,
        tokenVault: tokenVaultAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([admin])
      .rpc({ commitment: "confirmed" });
    const endTime = Date.now();
    kv("Tx", tx);
    kv("Exec time (ms)", endTime - startTime);
    
    const adminBalanceAfter = await getAccount(connection, adminTokenAccountInfo.address);
    const expectedAdminBalance = 60000000; // 60M tokens
    const actualAdminBalance = Number(adminBalanceAfter.amount) / Math.pow(10, 6);
    kv("Admin balance after (human)", actualAdminBalance);
    kv("Expected admin balance", expectedAdminBalance);
    
    const vaultBalanceAfter = await getAccount(connection, tokenVaultAccount);
    const expectedVaultBalance = 940000000; // 940M tokens
    const actualVaultBalance = Number(vaultBalanceAfter.amount) / Math.pow(10, 6);
    kv("Vault balance (human)", actualVaultBalance);
    kv("Expected vault balance", expectedVaultBalance);
    kv("Vault mint", vaultBalanceAfter.mint.toString());
    kv("Vault owner", vaultBalanceAfter.owner.toString());
    kv("Expected mint", newMintKeypair.publicKey.toString());
    kv("Expected owner (pool)", globalPackPoolAccount.toString());

    let allChecksPassed = true;
    if (!(Math.abs(actualAdminBalance - expectedAdminBalance) < 0.001)) allChecksPassed = false;
    if (!(Math.abs(actualVaultBalance - expectedVaultBalance) < 0.001)) allChecksPassed = false;
    if (vaultBalanceAfter.mint.toString() !== newMintKeypair.publicKey.toString()) allChecksPassed = false;
    if (vaultBalanceAfter.owner.toString() !== globalPackPoolAccount.toString()) allChecksPassed = false;
    kv("All verifications", allChecksPassed ? "PASSED ✅" : "FAILED ❌");
  });

  it("[TEST9] pack_reveal initializes pack PDA and four ATAs, then transfers 40k each(total 160K)", async () => {
    banner("TEST9: PACK REVEAL + TRANSFER 40K EACH TO PACK ATAs");
    const [globalPackPoolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_pack_pool")],
      program.programId
    );
    kv("Global Pack Pool PDA", globalPackPoolAccount.toString());

    // Prepare four KOLs and mints, initialize their vaults using the combined instruction
    const kols = ["KOLA", "KOLB", "KOLC", "KOLD"]; // short tickers
    const kolMints: PublicKey[] = [];
    const kolVaults: PublicKey[] = [];

    banner("PHASE A: SETUP 4 KOL MINTS + VAULTS (MINT + INIT + TRANSFER)");
    for (const kol of kols) {
      step(`Create mint + ATA for ${kol}`);
      const mintKeypair = anchor.web3.Keypair.generate();
      await createMint(connection, admin, admin.publicKey, admin.publicKey, 6, mintKeypair);
      kv("Mint", mintKeypair.publicKey.toString());

      const adminAta = await getOrCreateAssociatedTokenAccount(
        connection,
        admin,
        mintKeypair.publicKey,
        admin.publicKey
      );
      kv("Admin ATA", adminAta.address.toString());

      const [tokenVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("token_vault"), Buffer.from(kol), globalPackPoolAccount.toBuffer()],
        program.programId
      );
      kv("Token vault PDA", tokenVaultPda.toString());

      const supply = new anchor.BN("1000000000000"); // 1,000,000 * 10^6
      const toVault = new anchor.BN("900000000000"); // 900,000 * 10^6
      step(`Super-combined: mint+init+transfer for ${kol}`);
      const tx = await program.methods
        .mintAndInitKolTokenVaultAndTransfer(kol, supply, toVault)
        .accountsPartial({
          globalPackPool: globalPackPoolAccount,
          admin: admin.publicKey,
          mint: mintKeypair.publicKey,
          adminTokenAccount: adminAta.address,
          tokenVault: tokenVaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([admin])
        .rpc({ commitment: "confirmed" });
      kv("Tx", tx);

      kolMints.push(mintKeypair.publicKey);
      kolVaults.push(tokenVaultPda);
    }

    banner("PHASE B: DERIVE PACK PDA + ATAs, THEN CALL pack_reveal");
    step("Derive pack PDA");
    const [packPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("pack"),
        Buffer.from(kols[0]),
        Buffer.from(kols[1]),
        Buffer.from(kols[2]),
        Buffer.from(kols[3]),
      ],
      program.programId
    );
    kv("Pack PDA", packPda.toString());

    const packAtas = kolMints.map((mint, idx) => {
      const ata = getAssociatedTokenAddressSync(mint, packPda, true, TOKEN_PROGRAM_ID);
      kv(`Expected Pack ATA [${idx}]`, ata.toString());
      return ata;
    });

    step("Call pack_reveal");
    try {
      const tx = await retryRpc(() =>
        program.methods
          .packReveal(kols[0], kols[1], kols[2], kols[3])
          .accountsPartial({
            globalPackPool: globalPackPoolAccount,
            admin: admin.publicKey,
            packAccount: packPda,
            mintKolA: kolMints[0],
            packKolATa: packAtas[0],
            mintKolB: kolMints[1],
            packKolBTa: packAtas[1],
            mintKolC: kolMints[2],
            packKolCTa: packAtas[2],
            mintKolD: kolMints[3],
            packKolDTa: packAtas[3],
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([admin])
          .rpc({ commitment: "confirmed" })
      );
      kv("pack_reveal tx", tx);
    } catch (e: any) {
      console.error("pack_reveal failed:", e);
      if (e.logs) console.error("Program logs:", e.logs);
      throw e;
    }

    banner("PHASE C: TRANSFER 40K OF EACH KOL TO PACK ATAs");
    const transferAmount = new anchor.BN("40000000000"); // 40,000 * 10^6
    for (let i = 0; i < 4; i++) {
      const kol = kols[i];
      step(`Transfer 40k ${kol} -> pack ATA`);
      kv("Mint", kolMints[i].toString());
      kv("Vault", kolVaults[i].toString());
      kv("Pack ATA", packAtas[i].toString());
      try {
        const tx = await retryRpc(() =>
          program.methods
            .transferToIndividualPack(kol, transferAmount)
            .accountsPartial({
              globalPackPool: globalPackPoolAccount,
              packAccount: packPda,
              kolMint: kolMints[i],
              kolTokenVault: kolVaults[i],
              packKolTa: packAtas[i],
              tokenProgram: TOKEN_PROGRAM_ID,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([admin])
            .rpc({ commitment: "confirmed" })
        );
        kv("transfer_to_individual_pack tx", tx);
      } catch (e: any) {
        console.error(`transfer_to_individual_pack failed for ${kol}:`, e);
        if (e.logs) console.error("Program logs:", e.logs);
        throw e;
      }
    }

    banner("PHASE D: VERIFY PACK ATAs (owner/mint/balance)");
    for (let i = 0; i < 4; i++) {
      step(`Verify Pack ATA[${i}]`);
      const ataInfo = await getAccount(connection, packAtas[i]);
      kv("Mint (actual)", ataInfo.mint.toString());
      kv("Mint (expected)", kolMints[i].toString());
      kv("Owner (actual)", ataInfo.owner.toString());
      kv("Owner (expected)", packPda.toString());
      kv("Amount (human)", Number(ataInfo.amount) / Math.pow(10, 6));

      if (ataInfo.owner.toString() !== packPda.toString()) {
        throw new Error(`Pack ATA[${i}] owner mismatch`);
      }
      if (ataInfo.mint.toString() !== kolMints[i].toString()) {
        throw new Error(`Pack ATA[${i}] mint mismatch`);
      }
      if (ataInfo.amount.toString() !== transferAmount.toString()) {
        throw new Error(`Pack ATA[${i}] amount mismatch; expected ${transferAmount.toString()}, got ${ataInfo.amount.toString()}`);
      }
      kv(`Pack ATA[${i}]`, "OK ✅");
    }

    banner("PHASE E: CLAIM 40K OF EACH KOL FROM PACK TO USER");
    const userAtas = kolMints.map((mint, idx) => {
      const ata = getAssociatedTokenAddressSync(mint, admin.publicKey, false, TOKEN_PROGRAM_ID);
      kv(`Expected User ATA [${idx}]`, ata.toString());
      return ata;
    });

    // Balances before claim
    const userBalancesBefore: bigint[] = [];
    const packBalancesBefore: bigint[] = [];
    for (let i = 0; i < 4; i++) {
      const uAcc = await getAccount(connection, userAtas[i]).catch(() => null); // might not exist yet
      userBalancesBefore.push(uAcc ? uAcc.amount : 0n);
      const pAcc = await getAccount(connection, packAtas[i]);
      packBalancesBefore.push(pAcc.amount);
    }

    try {
      step("Call claim_from_pack");
      const tx = await retryRpc(() =>
        program.methods
          .claimFromPack(kols[0], kols[1], kols[2], kols[3], transferAmount)
          .accountsPartial({
            pack: packPda,
            user: admin.publicKey,
            // A
            mintKolA: kolMints[0],
            packKolATa: packAtas[0],
            userKolATa: userAtas[0],
            // B
            mintKolB: kolMints[1],
            packKolBTa: packAtas[1],
            userKolBTa: userAtas[1],
            // C
            mintKolC: kolMints[2],
            packKolCTa: packAtas[2],
            userKolCTa: userAtas[2],
            // D
            mintKolD: kolMints[3],
            packKolDTa: packAtas[3],
            userKolDTa: userAtas[3],
            // programs
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([admin])
          .rpc({ commitment: "confirmed" })
      );
      kv("claim_from_pack tx", tx);
    } catch (e: any) {
      console.error("claim_from_pack failed:", e);
      if (e.logs) console.error("Program logs:", e.logs);
      throw e;
    }

    banner("PHASE F: VERIFY USER + PACK BALANCES AFTER CLAIM");
    for (let i = 0; i < 4; i++) {
      step(`Verify after claim [${i}]`);
      const userAcc = await getAccount(connection, userAtas[i]);
      const packAcc = await getAccount(connection, packAtas[i]);
      kv("User ATA (actual)", userAcc.amount.toString());
      kv("User ATA (expected add)", transferAmount.toString());
      kv("Pack ATA (actual)", packAcc.amount.toString());
      kv("Pack ATA (expected)", "0");

      // User increased by +40k, Pack decreased by -40k
      const expectedUser = (userBalancesBefore[i] + BigInt(transferAmount.toString())).toString();
      if (userAcc.amount.toString() !== expectedUser) {
        throw new Error(`User ATA[${i}] amount mismatch; expected ${expectedUser}, got ${userAcc.amount.toString()}`);
      }
      if (packAcc.amount !== 0n) {
        throw new Error(`Pack ATA[${i}] expected 0 after claim, got ${packAcc.amount.toString()}`);
      }
      kv(`Post-claim [${i}]`, "OK ✅");
    }

    banner("✅ TEST9 COMPLETE: PACK CREATED + FUNDED + CLAIMED TO USER (40K EACH)");
  });

  

});