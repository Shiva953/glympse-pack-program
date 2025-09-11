mod instructions;
mod state;
mod constants;
mod errors;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("Cn3xRT72q5c99rMZKseUF8TkTFrpWTFBqMoLs3pNu2ZX");

#[program]
pub mod pnlpackprogram {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn init_global_pack_pool(ctx: Context<InitGlobalPackPool>, total_kols: u8) -> Result<()> {
        InitGlobalPackPool::handler(ctx, total_kols)
    }

    pub fn transfer_to_pack_pool(ctx: Context<TransferToPackPool>, amount: u64) -> Result<()> {
        TransferToPackPool::handler(ctx, amount)
    }

    // pub fn init_token_vault(ctx: Context<InitTokenVault>, kol_ticker: String) -> Result<()> {
    //     InitTokenVault::handler(ctx, kol_ticker)
    // }

    // pub fn transfer_kol_tokens_to_vault(ctx: Context<TransferKolTokensToVault>, kol_ticker: String, amount: u64) -> Result<()> {
    //     TransferKolTokensToVault::handler(ctx, kol_ticker, amount)
    // }

    // // New combined instruction
    // pub fn init_kol_token_vault_and_transfer(ctx: Context<InitKolTokenVaultAndTransfer>, kol_ticker: String, amount: u64) -> Result<()> {
    //     InitKolTokenVaultAndTransfer::handler(ctx, kol_ticker, amount)
    // }

    // Super combined instruction: mint 1B tokens to admin + init vault + 940M tokens admin->vault transfer
    pub fn mint_and_init_kol_token_vault_and_transfer(ctx: Context<MintAndInitKolTokenVaultAndTransfer>, kol_ticker: String, total_supply: u64, vault_transfer_amount: u64) -> Result<()> {
        MintAndInitKolTokenVaultAndTransfer::handler(ctx, kol_ticker, total_supply, vault_transfer_amount)
    }

    pub fn pack_reveal(ctx: Context<PackReveal>, kol_a: String, kol_b: String, kol_c: String, kol_d: String) -> Result<()> {
        PackReveal::handler(ctx, kol_a, kol_b, kol_c, kol_d)
    }

    pub fn transfer_to_individual_pack(ctx: Context<TransferToIndividualPack>, kol: String, amount: u64) -> Result<()> {
        TransferToIndividualPack::handler(ctx, kol, amount)
    }

    pub fn claim_from_pack(ctx: Context<ClaimFromPack>, kol_a: String, kol_b: String, kol_c: String, kol_d: String, amount_per_kol: u64) -> Result<()> {
        ClaimFromPack::handler(ctx, kol_a, kol_b, kol_c, kol_d, amount_per_kol)
    }
}

#[derive(Accounts)]
pub struct Initialize {}