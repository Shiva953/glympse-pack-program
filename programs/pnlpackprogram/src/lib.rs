mod instructions;
mod state;
mod constants;
mod errors;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("Fn7BgzorgkmKfDJobqqaHeLxrfcvcobXoJsUMPeGmBUD");

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
}

#[derive(Accounts)]
pub struct Initialize {}