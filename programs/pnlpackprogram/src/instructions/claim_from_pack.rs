use anchor_lang::prelude::*;
use anchor_lang::system_program;

#[derive(Accounts)]
pub struct ClaimFromPack<'info> {
  #[account(
    mut,
    seeds = [b"pack", kol_a_ticker.as_ref(), kol_b_ticker.as_ref(), kol_c_ticker.as_ref(), kol_d_ticker.as_ref()],
    bump
  )]
  pub pack: Account<'info, Pack>,

  #[account(mut)]
  pub user: Signer<'info>,

  pub system_program: Program<'info, System>,
}

impl<'info> ClaimFromPack<'info> {
  pub fn handler(_ctx: Context<ClaimFromPack>, pack_id: String, claim_amount: u64) -> Result<()> {
    Ok(())
  }
}