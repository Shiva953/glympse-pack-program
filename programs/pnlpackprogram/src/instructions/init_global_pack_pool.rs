use anchor_lang::prelude::*;
use crate::constants::ADMIN_KEY;
use crate::state::GlobalPackPool;

#[derive(Accounts)]
pub struct InitGlobalPackPool<'info> {
  #[account(
    init,
    payer = admin,
    seeds = [b"global_pack_pool"],
    bump,
    space = 8 + GlobalPackPool::INIT_SPACE
  )]
  pub global_pack_pool: Account<'info, GlobalPackPool>,

  #[account(
    mut,
    address = ADMIN_KEY
  )]
  pub admin: Signer<'info>,

  pub system_program: Program<'info, System>,
}

impl<'info> InitGlobalPackPool<'info> {
  pub fn handler(_ctx: Context<InitGlobalPackPool>, total_kols: u8) -> Result<()> {
    _ctx.accounts.global_pack_pool.total_kols = total_kols; 
    Ok(())
  }
}