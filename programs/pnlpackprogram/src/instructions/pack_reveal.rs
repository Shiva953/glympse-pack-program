use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use crate::constants::ADMIN_KEY;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use anchor_spl::token_interface;
use crate::state::GlobalPackPool;

#[derive(Accounts)]
#[instruction(kol_a: String, kol_b: String, kol_c: String, kol_d: String)]
pub struct PackReveal<'info> {
    #[account(
        mut,
        seeds = [b"global_pack_pool"],
        bump
    )]
    pub global_pack_pool: Box<Account<'info, GlobalPackPool>>,

    #[account(
        mut,
        address = ADMIN_KEY
    )]
    pub admin: Signer<'info>,
    
    #[account(
        init,
        payer = admin,
        space = 8 + std::mem::size_of::<Pack>(),
        seeds = [
            b"pack",
            kol_a.as_bytes(),
            kol_b.as_bytes(),
            kol_c.as_bytes(),
            kol_d.as_bytes()
        ],
        bump
    )]
    pub pack_account: Box<Account<'info, Pack>>,

    #[account(
        mut,
        mint::token_program = token_program,
    )]
    pub mint_kol_a: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = mint_kol_a,
        associated_token::authority = pack_account,
        associated_token::token_program = token_program,
    )]
    pub pack_kol_a_ta: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        mint::token_program = token_program,
    )]
    pub mint_kol_b: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = mint_kol_b,
        associated_token::authority = pack_account,
        associated_token::token_program = token_program,
    )]
    pub pack_kol_b_ta: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        mint::token_program = token_program,
    )]
    pub mint_kol_c: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = mint_kol_c,
        associated_token::authority = pack_account,
        associated_token::token_program = token_program,
    )]
    pub pack_kol_c_ta: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        mint::token_program = token_program,
    )]
    pub mint_kol_d: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = mint_kol_d,
        associated_token::authority = pack_account,
        associated_token::token_program = token_program,
    )]
    pub pack_kol_d_ta: Box<InterfaceAccount<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> PackReveal<'info> {
    pub fn handler(
        ctx: Context<PackReveal>, 
        kol_a: String,
        kol_b: String, 
        kol_c: String,
        kol_d: String,
    ) -> Result<()> {
        msg!("🔵 [PackReveal] Initializing Pack data for KOLs: {}, {}, {}, {}", kol_a, kol_b, kol_c, kol_d);
        let pack = &mut ctx.accounts.pack_account;
        pack.kol_a = kol_a.clone();
        pack.kol_b = kol_b.clone();
        pack.kol_c = kol_c.clone();
        pack.kol_d = kol_d.clone();
        pack.bump = ctx.bumps.pack_account;

        msg!("🟢 [PackReveal] Pack struct initialized: kol_a={}, kol_b={}, kol_c={}, kol_d={}, bump={}", pack.kol_a, pack.kol_b, pack.kol_c, pack.kol_d, pack.bump);
        msg!("✅ [PackReveal] Pack accounts and ATAs initialized");
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Pack {
    #[max_len(16)]
    pub kol_a: String,
    #[max_len(16)]
    pub kol_b: String,
    #[max_len(16)]
    pub kol_c: String,
    #[max_len(16)]
    pub kol_d: String,
    pub bump: u8,
}