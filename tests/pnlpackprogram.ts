import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Pnlpackprogram } from "../target/types/pnlpackprogram";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo, 
  getAccount,
  TOKEN_PROGRAM_ID 
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
      9
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
    
    const mintAmount = BigInt("1000000000000000000");
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
    console.log("Admin token balance (human readable):", Number(tokenAccount.amount) / Math.pow(10, 9));
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
    const kols = ["ELONMUSK", "VITALIK", "CZ"];
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

});