use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::GlobalPackPool;

#[derive(Accounts)]
pub struct TransferToPackPool<'info> {
    #[account(
        mut,
        seeds = [b"global_pack_pool"],
        bump
    )]
    pub global_pack_pool: Account<'info, GlobalPackPool>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> TransferToPackPool<'info> {
    pub fn handler(ctx: Context<TransferToPackPool>, amount: u64) -> Result<()> {
        // sol transfer to pack pool during the raise period
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.global_pack_pool.to_account_info(),
            },
        );

        system_program::transfer(cpi_context, amount)?;

        Ok(())
    }
}