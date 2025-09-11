use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked};
use crate::instructions::pack_reveal::Pack;

#[derive(Accounts)]
#[instruction(kol_a: String, kol_b: String, kol_c: String, kol_d: String)]
pub struct ClaimFromPack<'info> {
  #[account(
    mut,
    seeds = [b"pack", kol_a.as_bytes(), kol_b.as_bytes(), kol_c.as_bytes(), kol_d.as_bytes()],
    bump = pack.bump
  )]
  pub pack: Box<Account<'info, Pack>>,

  #[account(mut)]
  pub user: Signer<'info>,

  #[account(mut, mint::token_program = token_program)]
  pub mint_kol_a: Box<InterfaceAccount<'info, Mint>>,
  #[account(
    mut,
    associated_token::mint = mint_kol_a,
    associated_token::authority = pack,
    associated_token::token_program = token_program,
  )]
  pub pack_kol_a_ta: Box<InterfaceAccount<'info, TokenAccount>>,
  #[account(
    init_if_needed,
    payer = user,
    associated_token::mint = mint_kol_a,
    associated_token::authority = user,
    associated_token::token_program = token_program,
  )]
  pub user_kol_a_ta: Box<InterfaceAccount<'info, TokenAccount>>,

  #[account(mut, mint::token_program = token_program)]
  pub mint_kol_b: Box<InterfaceAccount<'info, Mint>>,
  #[account(
    mut,
    associated_token::mint = mint_kol_b,
    associated_token::authority = pack,
    associated_token::token_program = token_program,
  )]
  pub pack_kol_b_ta: Box<InterfaceAccount<'info, TokenAccount>>,
  #[account(
    init_if_needed,
    payer = user,
    associated_token::mint = mint_kol_b,
    associated_token::authority = user,
    associated_token::token_program = token_program,
  )]
  pub user_kol_b_ta: Box<InterfaceAccount<'info, TokenAccount>>,

  #[account(mut, mint::token_program = token_program)]
  pub mint_kol_c: Box<InterfaceAccount<'info, Mint>>,
  #[account(
    mut,
    associated_token::mint = mint_kol_c,
    associated_token::authority = pack,
    associated_token::token_program = token_program,
  )]
  pub pack_kol_c_ta: Box<InterfaceAccount<'info, TokenAccount>>,
  #[account(
    init_if_needed,
    payer = user,
    associated_token::mint = mint_kol_c,
    associated_token::authority = user,
    associated_token::token_program = token_program,
  )]
  pub user_kol_c_ta: Box<InterfaceAccount<'info, TokenAccount>>,

  #[account(mut, mint::token_program = token_program)]
  pub mint_kol_d: Box<InterfaceAccount<'info, Mint>>,
  #[account(
    mut,
    associated_token::mint = mint_kol_d,
    associated_token::authority = pack,
    associated_token::token_program = token_program,
  )]
  pub pack_kol_d_ta: Box<InterfaceAccount<'info, TokenAccount>>,
  #[account(
    init_if_needed,
    payer = user,
    associated_token::mint = mint_kol_d,
    associated_token::authority = user,
    associated_token::token_program = token_program,
  )]
  pub user_kol_d_ta: Box<InterfaceAccount<'info, TokenAccount>>,

  pub system_program: Program<'info, System>,
  pub token_program: Interface<'info, TokenInterface>,
  pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> ClaimFromPack<'info> {
  pub fn handler(ctx: Context<ClaimFromPack>, kol_a: String, kol_b: String, kol_c: String, kol_d: String, amount_per_kol: u64) -> Result<()> {
    let pack = &ctx.accounts.pack;
    let signer_seeds: &[&[&[u8]]] = &[&[
      b"pack",
      pack.kol_a.as_bytes(),
      pack.kol_b.as_bytes(),
      pack.kol_c.as_bytes(),
      pack.kol_d.as_bytes(),
      &[pack.bump],
    ]];

    fn xfer<'a, 'info>(
      token_program: AccountInfo<'info>,
      from: AccountInfo<'info>,
      to: AccountInfo<'info>,
      mint: AccountInfo<'info>,
      authority: AccountInfo<'info>,
      signer_seeds: &[&[&[u8]]],
      amount: u64,
      decimals: u8,
    ) -> Result<()> {
      let accounts = TransferChecked { from, mint, to, authority };
      let cpi = CpiContext::new_with_signer(token_program, accounts, signer_seeds);
      transfer_checked(cpi, amount, decimals)
    }

    xfer(
      ctx.accounts.token_program.to_account_info(),
      ctx.accounts.pack_kol_a_ta.to_account_info(),
      ctx.accounts.user_kol_a_ta.to_account_info(),
      ctx.accounts.mint_kol_a.to_account_info(),
      ctx.accounts.pack.to_account_info(),
      signer_seeds,
      amount_per_kol,
      ctx.accounts.mint_kol_a.decimals,
    )?;

    xfer(
      ctx.accounts.token_program.to_account_info(),
      ctx.accounts.pack_kol_b_ta.to_account_info(),
      ctx.accounts.user_kol_b_ta.to_account_info(),
      ctx.accounts.mint_kol_b.to_account_info(),
      ctx.accounts.pack.to_account_info(),
      signer_seeds,
      amount_per_kol,
      ctx.accounts.mint_kol_b.decimals,
    )?;

    xfer(
      ctx.accounts.token_program.to_account_info(),
      ctx.accounts.pack_kol_c_ta.to_account_info(),
      ctx.accounts.user_kol_c_ta.to_account_info(),
      ctx.accounts.mint_kol_c.to_account_info(),
      ctx.accounts.pack.to_account_info(),
      signer_seeds,
      amount_per_kol,
      ctx.accounts.mint_kol_c.decimals,
    )?;

    xfer(
      ctx.accounts.token_program.to_account_info(),
      ctx.accounts.pack_kol_d_ta.to_account_info(),
      ctx.accounts.user_kol_d_ta.to_account_info(),
      ctx.accounts.mint_kol_d.to_account_info(),
      ctx.accounts.pack.to_account_info(),
      signer_seeds,
      amount_per_kol,
      ctx.accounts.mint_kol_d.decimals,
    )?;

    Ok(())
  }
}