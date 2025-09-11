use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::solana_program::{
  program::invoke_signed,
  system_instruction,
  sysvar::rent::Rent,
};
use anchor_spl::associated_token::AssociatedToken;
use crate::constants::ADMIN_KEY;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked};
use anchor_spl::token_interface;
use crate::state::GlobalPackPool;
use std::collections::HashSet;

// STEP 2: Create pack account with known KOLs
#[derive(Accounts)]
#[instruction(kol_a: String, kol_b: String, kol_c: String, kol_d: String)]
pub struct CreatePack<'info> {
    #[account(
        init,
        seeds = [b"pack", kol_a.as_ref(), kol_b.as_ref(), kol_c.as_ref(), kol_d.as_ref()],
        payer = admin,
        space = 8 + std::mem::size_of::<Pack>(), // 8 bytes for discriminator + Pack size
        bump
    )]
    pub pack: Account<'info, Pack>,
    #[account(
        mut,
        address = ADMIN_KEY
    )]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreatePack<'info> {
    pub fn handler(
        ctx: Context<CreatePack>,
        kol_a: String,
        kol_b: String,
        kol_c: String,
        kol_d: String,
    ) -> Result<()> {
        let pack = &mut ctx.accounts.pack;
        
        pack.kol_a = kol_a.clone();
        pack.kol_b = kol_b.clone();
        pack.kol_c = kol_c.clone();
        pack.kol_d = kol_d.clone();
        pack.bump = ctx.bumps.pack;
        
        msg!("Pack created successfully!");
        msg!("Pack PDA: {}", ctx.accounts.pack.key());
        msg!("Final pack state - KOL_A: {}, KOL_B: {}, KOL_C: {}, KOL_D: {}, bump: {}", 
             pack.kol_a, pack.kol_b, pack.kol_c, pack.kol_d, pack.bump);
        msg!("Seeds used: pack + {} + {} + {} + {}", kol_a, kol_b, kol_c, kol_d);
        
        emit!(PackCreated {
            pack_address: ctx.accounts.pack.key(),
            kol_a: kol_a.clone(),
            kol_b: kol_b.clone(),
            kol_c: kol_c.clone(),
            kol_d: kol_d.clone(),
            bump: pack.bump,
        });
        
        Ok(())
    }
}