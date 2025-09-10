use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use crate::constants::ADMIN_KEY;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use anchor_spl::token_interface;
use crate::state::GlobalPackPool;

// initialize token vault associated with given KOL + global pack treasury account, then TRANSFER 940M TO IT using transfer_to_pack_vault()
#[derive(Accounts)]
#[instruction(kol_ticker: String)]
pub struct InitTokenVault<'info> {
    #[account(
        mut,
        seeds = [b"global_pack_pool"],
        bump
    )]
    pub global_pack_pool: Account<'info, GlobalPackPool>,

    #[account(
        mut,
        address = ADMIN_KEY
    )]
    pub admin: Signer<'info>,

    /// The token mint for the vault
    #[account(
        mint::token_program = token_program
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    // owned by the global pack pool
    #[account(
        init,
        payer = admin,
        token::mint = mint,
        token::authority = global_pack_pool,
        seeds = [b"token_vault", kol_ticker.as_bytes(), global_pack_pool.key().as_ref()],
        bump,
        token::token_program = token_program
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> InitTokenVault<'info> {
    pub fn handler(ctx: Context<InitTokenVault>, kol_ticker: String) -> Result<()> {
        
        msg!("Token vault initialized for KOL: {} with mint: {}", 
             kol_ticker, 
             ctx.accounts.mint.key());
        
        Ok(())
    }
}