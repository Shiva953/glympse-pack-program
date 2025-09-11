use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked};
use crate::state::GlobalPackPool;
use super::pack_reveal::Pack;

#[derive(Accounts)]
#[instruction(kol: String)]
pub struct TransferToIndividualPack<'info> {
    #[account(
        mut,
        seeds = [b"global_pack_pool"],
        bump
    )]
    pub global_pack_pool: Account<'info, GlobalPackPool>,

    #[account(
        mut,
        seeds = [
            b"pack",
            pack_account.kol_a.as_bytes(),
            pack_account.kol_b.as_bytes(),
            pack_account.kol_c.as_bytes(),
            pack_account.kol_d.as_bytes(),
        ],
        bump = pack_account.bump
    )]
    pub pack_account: Account<'info, Pack>,

    #[account(
        mut,
        mint::token_program = token_program,
    )]
    pub kol_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds = [b"token_vault", kol.as_bytes(), global_pack_pool.key().as_ref()],
        bump,
        token::mint = kol_mint,
        token::authority = global_pack_pool,
        token::token_program = token_program
    )]
    pub kol_token_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = kol_mint,
        associated_token::authority = pack_account,
        associated_token::token_program = token_program,
    )]
    pub pack_kol_ta: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> TransferToIndividualPack<'info> {
    pub fn handler(
        ctx: Context<TransferToIndividualPack>,
        kol: String,
        amount: u64,
    ) -> Result<()> {
        msg!("🔵 [TransferToIndividualPack] Transferring {} tokens for {}", amount, kol);

        let bump = ctx.bumps.global_pack_pool;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"global_pack_pool",
            &[bump]
        ]];

        let accounts = TransferChecked {
            from: ctx.accounts.kol_token_vault.to_account_info(),
            mint: ctx.accounts.kol_mint.to_account_info(),
            to: ctx.accounts.pack_kol_ta.to_account_info(),
            authority: ctx.accounts.global_pack_pool.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            accounts,
            signer_seeds,
        );
        transfer_checked(cpi_ctx, amount, ctx.accounts.kol_mint.decimals)?;
        msg!("✅ [TransferToIndividualPack] Transferred {} tokens to pack ATA", amount);
        Ok(())
    }
}
