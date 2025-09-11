use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use crate::constants::ADMIN_KEY;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked, mint_to, MintTo};
use anchor_spl::token_interface;
use crate::state::GlobalPackPool;

#[derive(Accounts)]
#[instruction(kol_ticker: String)]
pub struct MintAndInitKolTokenVaultAndTransfer<'info> {
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


    #[account(
        mut,
        mint::token_program = token_program,
        mint::authority = admin, 
    )]
    pub mint: InterfaceAccount<'info, Mint>,


    #[account(
        init_if_needed,
        payer = admin,
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

impl<'info> MintAndInitKolTokenVaultAndTransfer<'info> {
    pub fn handler(ctx: Context<Self>, kol_ticker: String, total_supply: u64, vault_transfer_amount: u64) -> Result<()> {
        
        let decimals = ctx.accounts.mint.decimals;
        
        // minting 1B to admin
        msg!("Minting {} tokens to admin for KOL: {}", total_supply, kol_ticker);
        
        let mint_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.admin_token_account.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        };

        let mint_cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            mint_accounts,
        );

        mint_to(mint_cpi_ctx, total_supply)?;

        msg!("Successfully minted {} tokens to admin", total_supply);
        

        msg!("Token vault initialized for KOL: {} with mint: {}", 
             kol_ticker, 
             ctx.accounts.mint.key());

        // transfer vault_amount from admin -> vault
        msg!("Transferring {} tokens from admin to vault", vault_transfer_amount);
        
        let transfer_accounts = TransferChecked {
            from: ctx.accounts.admin_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        };

        let transfer_cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
        );

        transfer_checked(transfer_cpi_ctx, vault_transfer_amount, decimals)?;

        msg!(
            "✅ SUPER COMBINED SUCCESS for KOL {}: Minted {} tokens, initialized vault, transferred {} tokens to vault", 
            kol_ticker,
            total_supply,
            vault_transfer_amount,
        );

        Ok(())
    }
}