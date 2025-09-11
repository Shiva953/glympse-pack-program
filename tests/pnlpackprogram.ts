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

describe("pnlpackprogram", () => {
  const admin = anchor.web3.Keypair.fromSecretKey(new Uint8Array(adminKeypair));
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.pnlpackprogram as Program<Pnlpackprogram>;
  const provider = anchor.getProvider();
  const connection = provider.connection;

  let mintAddress: PublicKey;
  let adminTokenAccount: PublicKey;

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  it("[TEST1] Initializes the global packs pool(treasury) where all the raise money goes", async () => {
    const total_kols = 50;
    console.log("50 TOP KOLS FROM LEADERBOARD")
    const [globalPackPoolAccount] =  anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("global_pack_pool")], program.programId)
    console.log("Global Pack Pool Account: ", globalPackPoolAccount.toString())

    console.log("Creating Packs treasury....")
    const tx = await program.methods.initGlobalPackPool(total_kols)
    .accountsPartial({
      admin: admin.publicKey,
      globalPackPool: globalPackPoolAccount
    })
    .signers([admin])
    .rpc({commitment: "confirmed"});
    console.log("Created global pack treasury pool: ", tx);
  });

  it("[TEST2] Transfer 0.1 SOL from user to pool during pack raise", async () => {

    const [globalPackPoolAccount] =  anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("global_pack_pool")], program.programId)
    const amount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

    const balanceBefore = await connection.getBalance(globalPackPoolAccount)
    const balanceBeforeInSOL = balanceBefore/LAMPORTS_PER_SOL;
    console.log("PACK POOL TREASURY BALANCE(BEFORE)", balanceBeforeInSOL)

    const tx = await program.methods.transferToPackPool(amount)
    .accountsPartial({
      globalPackPool: globalPackPoolAccount,
      user: admin.publicKey,
    })
    .signers([admin])
    .rpc({commitment: "confirmed"});

    const balanceAfter = await connection.getBalance(globalPackPoolAccount)
    const balanceAfterInSOL = balanceAfter/LAMPORTS_PER_SOL;
    console.log("PACK POOL TREASURY BALANCE(AFTER): ", balanceAfterInSOL)

    console.log("Successfully transferred 0.1 SOL to pack global pool", tx);
  });

  it("[SETUP] Create test token mint and mint 1B tokens to admin", async () => {
    console.log("Creating test token mint...");
    
    mintAddress = await createMint(
      connection,
      admin,
      admin.publicKey,
      admin.publicKey,
      6 // Changed to 6 decimals as specified
    );
    
    console.log("Token mint created:", mintAddress.toString());
    
    const tokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      mintAddress,
      admin.publicKey
    );
    adminTokenAccount = tokenAccountInfo.address;
    
    console.log("Admin token account:", adminTokenAccount.toString());
    
    // Mint 1B tokens with 6 decimals: 1,000,000,000 * 10^6
    const mintAmount = BigInt("1000000000000000");
    await mintTo(
      connection,
      admin,
      mintAddress,
      adminTokenAccount,
      admin.publicKey,
      mintAmount
    );
    
    const tokenAccount = await getAccount(connection, adminTokenAccount);
    console.log("Admin token balance:", tokenAccount.amount.toString());
    console.log("Admin token balance (human readable):", Number(tokenAccount.amount) / Math.pow(10, 6));
  });

  it("[TEST3] Initialize pack token vault for KOL", async () => {
    const kolTicker = "GAINZY";
    console.log(`Initializing token vault for KOL: ${kolTicker}`);
    
    const [globalPackPoolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_pack_pool")], 
      program.programId
    );
    
    const [tokenVaultAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("token_vault"),
        Buffer.from(kolTicker),
        globalPackPoolAccount.toBuffer()
      ],
      program.programId
    );
    
    console.log("Global pack pool:", globalPackPoolAccount.toString());
    console.log("Token vault PDA:", tokenVaultAccount.toString());
    console.log("Mint address:", mintAddress.toString());
    
    const tx = await program.methods.initTokenVault(kolTicker)
      .accountsPartial({
        globalPackPool: globalPackPoolAccount,
        admin: admin.publicKey,
        mint: mintAddress,
        tokenVault: tokenVaultAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([admin])
      .rpc({ commitment: "confirmed" });
    
    console.log("Token vault initialized successfully:", tx);
    
    try {
      const vaultInfo = await getAccount(connection, tokenVaultAccount);
      console.log("Token vault created successfully!");
      console.log("Vault mint:", vaultInfo.mint.toString());
      console.log("Vault owner:", vaultInfo.owner.toString());
      console.log("Vault balance:", vaultInfo.amount.toString());
    } catch (error) {
      console.error("Failed to fetch token vault info:", error);
    }
  });

  it("[TEST4] Initialize multiple token vaults for different KOLs", async () => {
    const kols = ["ELON", "VITALIK", "CZ"];
    const [globalPackPoolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_pack_pool")], 
      program.programId
    );
    
    for (const kolTicker of kols) {
      console.log(`\nInitializing token vault for KOL: ${kolTicker}`);
      
      const [tokenVaultAccount] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("token_vault"),
          Buffer.from(kolTicker),
          globalPackPoolAccount.toBuffer()
        ],
        program.programId
      );
      
      const tx = await program.methods.initTokenVault(kolTicker)
        .accountsPartial({
          globalPackPool: globalPackPoolAccount,
          admin: admin.publicKey,
          mint: mintAddress,
          tokenVault: tokenVaultAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([admin])
        .rpc({ commitment: "confirmed" });
      
      console.log(`${kolTicker} token vault initialized:`, tx);
      
      const vaultInfo = await getAccount(connection, tokenVaultAccount);
      console.log(`${kolTicker} vault address:`, tokenVaultAccount.toString());
      console.log(`${kolTicker} vault balance:`, vaultInfo.amount.toString());
    }
  });

  it("[TEST5] Transfer 940M tokens from admin to token vault", async () => {
    const kolTicker = "GAINZY";
    const transferAmount = new anchor.BN("940000000000000"); // 940M tokens with 6 decimals
    
    console.log(`Transferring 940M tokens to ${kolTicker} vault...`);
    
    const [globalPackPoolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_pack_pool")], 
      program.programId
    );
    
    const [tokenVaultAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("token_vault"),
        Buffer.from(kolTicker),
        globalPackPoolAccount.toBuffer()
      ],
      program.programId
    );
    
    const adminTokenAccountPDA = getAssociatedTokenAddressSync(
      mintAddress,
      admin.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    const adminBalanceBefore = await getAccount(connection, adminTokenAccountPDA);
    const vaultBalanceBefore = await getAccount(connection, tokenVaultAccount);
    
    console.log("Admin balance before:", Number(adminBalanceBefore.amount) / Math.pow(10, 6));
    console.log("Vault balance before:", Number(vaultBalanceBefore.amount) / Math.pow(10, 6));
    
    const tx = await program.methods.transferKolTokensToVault(kolTicker, transferAmount)
      .accountsPartial({
        globalPackPool: globalPackPoolAccount,
        admin: admin.publicKey,
        mint: mintAddress,
        adminTokenAccount: adminTokenAccountPDA,
        tokenVault: tokenVaultAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([admin])
      .rpc({ commitment: "confirmed" });
    
    console.log("Transfer completed successfully:", tx);
    
    const adminBalanceAfter = await getAccount(connection, adminTokenAccountPDA);
    const vaultBalanceAfter = await getAccount(connection, tokenVaultAccount);
    
    console.log("Admin balance after:", Number(adminBalanceAfter.amount) / Math.pow(10, 6));
    console.log("Vault balance after:", Number(vaultBalanceAfter.amount) / Math.pow(10, 6));
    
    const transferredAmount = Number(vaultBalanceAfter.amount) - Number(vaultBalanceBefore.amount);
    const expectedTransfer = 940000000; 
    
    console.log("Transferred amount:", transferredAmount / Math.pow(10, 6));
    console.log("Expected transfer:", expectedTransfer);
    
    if (Math.abs(transferredAmount / Math.pow(10, 6) - expectedTransfer) < 0.001) {
      console.log("✅ Transfer amount verified: 940M tokens successfully transferred!");
    } else {
      console.log("❌ Transfer amount mismatch!");
    }
  });

  it("[TEST8] SUPER COMBINED: Create mint, mint 1B tokens, initialize vault, and transfer 940M in minimal transactions", async () => {
    console.log("\n🚀🚀 SUPER COMBINED TEST: Mint creation → Mint tokens → Init vault → Transfer tokens");
    console.log("Target: Reduce from 4 transactions to 2 transactions total");
    
    const kolTicker = "SUPER";
    const totalSupply = new anchor.BN("1000000000000000"); // 1B tokens with 6 decimals
    const vaultTransferAmount = new anchor.BN("940000000000000"); // 940M tokens with 6 decimals
    
    const [globalPackPoolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_pack_pool")], 
      program.programId
    );
    
    // CREATING THE MINT FIRST
    console.log("\n📋 TRANSACTION 1: Creating new token mint...");
    const newMintKeypair = anchor.web3.Keypair.generate();
    
    const createMintTx = await createMint(
      connection,
      admin,
      admin.publicKey, 
      admin.publicKey, 
      6, 
      newMintKeypair 
    );
    
    console.log("✅ Mint created:", newMintKeypair.publicKey.toString());
    
    const adminTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      newMintKeypair.publicKey,
      admin.publicKey
    );
    
    console.log("✅ Admin token account created:", adminTokenAccountInfo.address.toString());
    
    // Transaction 2: COMBINED - Mint 1B tokens->admin + Init KOL Token Vault + Transfer 940M admin -> vault
    console.log("\n🎯 TRANSACTION 2: SUPER COMBINED INSTRUCTION");
    console.log("- Minting 1B tokens to admin");
    console.log("- Initializing token vault");
    console.log("- Transferring 940M tokens to vault");
    
    const [tokenVaultAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("token_vault"),
        Buffer.from(kolTicker),
        globalPackPoolAccount.toBuffer()
      ],
      program.programId
    );
    
    console.log("Accounts:");
    console.log("- Global pack pool:", globalPackPoolAccount.toString());
    console.log("- Admin:", admin.publicKey.toString());
    console.log("- Mint:", newMintKeypair.publicKey.toString());
    console.log("- Admin token account:", adminTokenAccountInfo.address.toString());
    console.log("- Token vault PDA:", tokenVaultAccount.toString());
    
    const adminBalanceBefore = await getAccount(connection, adminTokenAccountInfo.address);
    console.log("Admin token balance before:", Number(adminBalanceBefore.amount) / Math.pow(10, 6));
    
    const startTime = Date.now();
    
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
    const executionTime = endTime - startTime;
    
    console.log("✅ SUPER COMBINED TRANSACTION COMPLETED:", tx);
    console.log("⏱️  Execution time:", executionTime + "ms");
    

    console.log("\n📊 VERIFICATION:");
    
    // Check admin balance (should have 1B - 940M = 60M tokens)
    const adminBalanceAfter = await getAccount(connection, adminTokenAccountInfo.address);
    const expectedAdminBalance = 60000000; // 60M tokens
    const actualAdminBalance = Number(adminBalanceAfter.amount) / Math.pow(10, 6);
    
    console.log("Admin token balance after:", actualAdminBalance);
    console.log("Expected admin balance:", expectedAdminBalance);
    
    // Check vault balance (should have 940M tokens)
    const vaultBalanceAfter = await getAccount(connection, tokenVaultAccount);
    const expectedVaultBalance = 940000000; // 940M tokens
    const actualVaultBalance = Number(vaultBalanceAfter.amount) / Math.pow(10, 6);
    
    console.log("Vault token balance:", actualVaultBalance);
    console.log("Expected vault balance:", expectedVaultBalance);
    
    console.log("Vault mint:", vaultBalanceAfter.mint.toString());
    console.log("Vault owner:", vaultBalanceAfter.owner.toString());
    console.log("Expected mint:", newMintKeypair.publicKey.toString());
    console.log("Expected owner (global pack pool):", globalPackPoolAccount.toString());
    

    let allChecksPassed = true;
    
    if (Math.abs(actualAdminBalance - expectedAdminBalance) < 0.001) {
      console.log("✅ Admin balance check PASSED");
    } else {
      console.log("❌ Admin balance check FAILED");
      allChecksPassed = false;
    }
    
    if (Math.abs(actualVaultBalance - expectedVaultBalance) < 0.001) {
      console.log("✅ Vault balance check PASSED");
    } else {
      console.log("❌ Vault balance check FAILED");
      allChecksPassed = false;
    }
    
    if (vaultBalanceAfter.mint.toString() === newMintKeypair.publicKey.toString()) {
      console.log("✅ Vault mint verification PASSED");
    } else {
      console.log("❌ Vault mint verification FAILED");
      allChecksPassed = false;
    }
    
    if (vaultBalanceAfter.owner.toString() === globalPackPoolAccount.toString()) {
      console.log("✅ Vault authority verification PASSED");
    } else {
      console.log("❌ Vault authority verification FAILED");
      allChecksPassed = false;
    }
    
    console.log("\n🎉 SUPER COMBINED TRANSACTION SUMMARY:");
    console.log("📈 Transaction reduction: 4 → 2 transactions (50% reduction!)");
    console.log("⚡ Operations completed in single instruction:");
    console.log("   1. ✅ Minted 1B tokens to admin");
    console.log("   2. ✅ Initialized token vault");
    console.log("   3. ✅ Transferred 940M tokens to vault");
    console.log("⏱️  Total execution time:", executionTime + "ms");
    console.log("🎯 All verifications:", allChecksPassed ? "PASSED ✅" : "FAILED ❌");
    
    if (allChecksPassed) {
      console.log("\n🔥🔥 SUPER COMBINED INSTRUCTION SUCCESS! 🔥🔥");
      console.log("Ready for production deployment with 50% fewer transactions!");
    }
  });

  // // NEW TEST: Combined instruction to initialize vault and transfer tokens in one transaction
  // it("[TEST6] Initialize token vault and transfer 940M tokens in single transaction (COMBINED)", async () => {
  //   const kolTicker = "COMBT";
  //   const transferAmount = new anchor.BN("940000000000000"); // 940M tokens with 6 decimals
    
  //   console.log(`\n🚀 COMBINED TRANSACTION: Initializing vault and transferring 940M tokens for ${kolTicker}...`);
    
  //   const [globalPackPoolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [Buffer.from("global_pack_pool")], 
  //     program.programId
  //   );
    
  //   const [tokenVaultAccount] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from("token_vault"),
  //       Buffer.from(kolTicker),
  //       globalPackPoolAccount.toBuffer()
  //     ],
  //     program.programId
  //   );
    
  //   const adminTokenAccountPDA = getAssociatedTokenAddressSync(
  //     mintAddress,
  //     admin.publicKey,
  //     false,
  //     TOKEN_PROGRAM_ID
  //   );
    
  //   // Get admin balance before
  //   const adminBalanceBefore = await getAccount(connection, adminTokenAccountPDA);
  //   console.log("Admin balance before:", Number(adminBalanceBefore.amount) / Math.pow(10, 6));
    
  //   console.log("Global pack pool:", globalPackPoolAccount.toString());
  //   console.log("Token vault PDA:", tokenVaultAccount.toString());
  //   console.log("Admin token account:", adminTokenAccountPDA.toString());
  //   console.log("Mint address:", mintAddress.toString());
    
  //   // Execute combined instruction
  //   const tx = await program.methods.initKolTokenVaultAndTransfer(kolTicker, transferAmount)
  //     .accountsPartial({
  //       globalPackPool: globalPackPoolAccount,
  //       admin: admin.publicKey,
  //       mint: mintAddress,
  //       adminTokenAccount: adminTokenAccountPDA,
  //       tokenVault: tokenVaultAccount,
  //       systemProgram: anchor.web3.SystemProgram.programId,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
  //       rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //     })
  //     .signers([admin])
  //     .rpc({ commitment: "confirmed" });
    
  //   console.log("✅ Combined transaction completed successfully:", tx);
    
  //   // Verify results
  //   const adminBalanceAfter = await getAccount(connection, adminTokenAccountPDA);
  //   const vaultBalanceAfter = await getAccount(connection, tokenVaultAccount);
    
  //   console.log("\n📊 RESULTS:");
  //   console.log("Admin balance after:", Number(adminBalanceAfter.amount) / Math.pow(10, 6));
  //   console.log("Vault balance after:", Number(vaultBalanceAfter.amount) / Math.pow(10, 6));
    
  //   // Verify vault was created and has correct properties
  //   console.log("Vault mint:", vaultBalanceAfter.mint.toString());
  //   console.log("Vault owner:", vaultBalanceAfter.owner.toString());
    
  //   // Verify transfer amount
  //   const transferredAmount = Number(vaultBalanceAfter.amount);
  //   const expectedTransfer = 940000000000000; // 940M with 6 decimals
    
  //   console.log("Transferred amount (raw):", transferredAmount.toString());
  //   console.log("Expected transfer (raw):", expectedTransfer.toString());
  //   console.log("Transferred amount (human):", transferredAmount / Math.pow(10, 6));
  //   console.log("Expected transfer (human):", expectedTransfer / Math.pow(10, 6));
    
  //   if (transferredAmount === expectedTransfer) {
  //     console.log("✅ COMBINED TRANSACTION SUCCESS: Vault initialized and 940M tokens transferred!");
  //     console.log("🎉 Transaction count reduced from 2 to 1!");
  //   } else {
  //     console.log("❌ Transfer amount mismatch!");
  //     console.log("Difference:", Math.abs(transferredAmount - expectedTransfer));
  //   }
    
  //   // Additional verification that vault is properly configured
  //   if (vaultBalanceAfter.mint.toString() === mintAddress.toString()) {
  //     console.log("✅ Vault mint verification passed");
  //   } else {
  //     console.log("❌ Vault mint verification failed");
  //   }
    
  //   // Verify admin tokens were deducted
  //   const adminTokensUsed = Number(adminBalanceBefore.amount) - Number(adminBalanceAfter.amount);
  //   if (adminTokensUsed === expectedTransfer) {
  //     console.log("✅ Admin token deduction verification passed");
  //   } else {
  //     console.log("❌ Admin token deduction verification failed");
  //     console.log("Expected deduction:", expectedTransfer);
  //     console.log("Actual deduction:", adminTokensUsed);
  //   }
  // });

});