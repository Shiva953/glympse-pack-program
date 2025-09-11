// account structs

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GlobalPackPool {
    pub bump: u8,
    pub total_kols: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Pack {
    pub bump: u8,
    #[max_len(16)]
    pub kol_a: String,
    #[max_len(16)]
    pub kol_b: String,
    #[max_len(16)]
    pub kol_c: String,
    #[max_len(16)]
    pub kol_d: String,
}