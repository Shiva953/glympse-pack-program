use anchor_lang::prelude::*;
use anchor_lang::system_program;

#[derive(Accounts)]
pub struct TransferKolTokensToVault<'info> {
  #[account(
    mut,
    seeds = [b"token_vault", kol_name.as_ref, kol_id.as_ref(), global_pack_pool.key()],
    bump
  )]
  pub token_vault: Account<'info, TokenVault>,

  #[account(
    mut,
    seeds = [b"global_pack_pool"],
    bump
  )]
  pub global_pack_pool: Account<'info, GlobalPackPool>,

  #[account(mut)]
  pub admin: Signer<'info>,

  pub system_program: Program<'info, System>,
}

impl<'info> TransferKolTokensToVault<'info> {
  pub fn handler(_ctx: Context<TransferKolTokensToVault>, kol_id: String, kol_name: String, amount: u64) -> Result<()> {
    // 94% from pool -> vault
    Ok(())
  }
}