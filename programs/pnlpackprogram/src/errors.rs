use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Not enough KOLs provided")]
    NotEnoughKols,

    #[msg("Invalid pack PDA")]
    InvalidPackPda,

    #[msg("Seed longer than 32 bytes")] 
    InvalidSeedLength,
}
