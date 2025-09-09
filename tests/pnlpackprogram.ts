import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Pnlpackprogram } from "../target/types/pnlpackprogram";
import {Connection, LAMPORTS_PER_SOL} from "@solana/web3.js"
import adminKeypair from "./admin.json"

describe("pnlpackprogram", () => {
  // Configure the client to use the local cluster.
  const admin = anchor.web3.Keypair.fromSecretKey(new Uint8Array(adminKeypair));
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.pnlpackprogram as Program<Pnlpackprogram>;
  const provider = anchor.getProvider();
  const connection = provider.connection;

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  it("[TEST1] Initializes the global packs pool(treasury) where all the raise money goes", async () => {
    // only call this ixn from the admin side
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
    .signers([admin]) //in this case admin is the user
    .rpc({commitment: "confirmed"});

    const balanceAfter = await connection.getBalance(globalPackPoolAccount)
    const balanceAfterInSOL = balanceAfter/LAMPORTS_PER_SOL;
    console.log("PACK POOL TREASURY BALANCE(AFTER): ", balanceAfterInSOL)

    console.log("Successfully transferred 0.1 SOL to pack global pool", tx);
  });

});
