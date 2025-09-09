// account structs

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GlobalPackPool {
    pub bump: u8,
    pub total_kols: u8,
}