#[derive(Accounts)]
pub struct PackReveal<'info> {
  #[account(
    init,
    seeds = [b"pack", kol_a_ticker.as_ref(), kol_b_ticker.as_ref(), kol_c_ticker.as_ref(), kol_d_ticker.as_ref()],
    payer = admin,
    bump
  )]
  pub pack: Account<'info, Pack>,

  #[account(
    mut,
    address = ADMIN_KEY
  )]
  pub admin: Signer<'info>,

  pub system_program: Program<'info, System>,
}

impl<'info> PackReveal<'info> {
  pub fn handler(_ctx: Context<PackReveal>, ) -> Result<()> {
    // 1. init pack account
    // 2. choose 4 random KOLs
    // 3. init 4 associated KOL token accounts for the pack account
    // 2. transfer from 4 associated KOLs token vaults(authority is global pack pool) -> pack account
    Ok(())
  }
}