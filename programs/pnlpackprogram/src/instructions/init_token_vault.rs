use anchor_lang::prelude::*;
use anchor_lang::system_program;

#[derive(Accounts)]
pub struct InitTokenVault<'info> {
  #[account(
    init,
    payer = admin,
    token::mint = mint,
    token::authority = global_pack_pool,
    seeds = [b"token_vault", kol_name.as_ref, kol_id.as_ref(), global_pack_pool.key()],
    bump,
    space = 8 + TokenVault::INIT_SPACE
  )]
  pub token_vault: Account<'info, TokenAccount>,

  #[account(
    mut,
    address = ADMIN_KEY
  )]
  pub admin: Signer<'info>,

  pub system_program: Program<'info, System>,
}

impl<'info> InitTokenVault<'info> {
  pub fn handler(_ctx: Context<InitTokenVault>, kol_id: String, kol_name: String) -> Result<()> {
    // initialize the token vault account for the KOL 
    Ok(())
  }
}