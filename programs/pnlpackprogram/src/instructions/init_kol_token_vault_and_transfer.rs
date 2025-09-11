use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use crate::constants::ADMIN_KEY;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked};
use anchor_spl::token_interface;
use crate::state::GlobalPackPool;

#[derive(Accounts)]
#[instruction(kol_ticker: String)]
pub struct InitKolTokenVaultAndTransfer<'info> {
    #[account(
        mut,
        seeds = [b"global_pack_pool"],
        bump
    )]
    pub global_pack_pool: Account<'info, GlobalPackPool>,

    #[account(
        mut,
        address = ADMIN_KEY
    )]
    pub admin: Signer<'info>,

    /// The token mint for the vault
    #[account(
        mint::token_program = token_program
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// Admin's token account (source of tokens)
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = admin,
        associated_token::token_program = token_program,
    )]
    pub admin_token_account: InterfaceAccount<'info, TokenAccount>,

    /// The token vault (destination for tokens)
    /// Owned by the global pack pool - will be initialized in this instruction
    #[account(
        init,
        payer = admin,
        token::mint = mint,
        token::authority = global_pack_pool,
        seeds = [b"token_vault", kol_ticker.as_bytes(), global_pack_pool.key().as_ref()],
        bump,
        token::token_program = token_program
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> InitKolTokenVaultAndTransfer<'info> {
    pub fn handler(ctx: Context<Self>, kol_ticker: String, amount: u64) -> Result<()> {
        
        // Log vault initialization
        msg!("Token vault initialized for KOL: {} with mint: {}", 
             kol_ticker, 
             ctx.accounts.mint.key());

        // Perform the transfer immediately after initialization
        let decimals = ctx.accounts.mint.decimals;
        
        let transfer_accounts = TransferChecked {
            from: ctx.accounts.admin_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
        );

        transfer_checked(cpi_ctx, amount, decimals)?;

        msg!(
            "Transferred {} tokens for KOL {} from admin to vault", 
            amount, 
            kol_ticker,
        );

        Ok(())
    }
}