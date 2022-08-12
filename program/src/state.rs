use bytemuck::{from_bytes, from_bytes_mut, Pod, Zeroable};
use fixed::types::I80F48;
use num_enum::TryFromPrimitive;
use solana_program::account_info::AccountInfo;
use solana_program::program_error::ProgramError;
use solana_program::program_pack::{IsInitialized, Sealed};
use solana_program::pubkey::Pubkey;
use std::cell::{Ref, RefMut};
use std::mem::size_of;
use mango::state::{MAX_PAIRS};




pub trait Loadable: Pod {
    fn load_mut<'a>(account: &'a AccountInfo) -> Result<RefMut<'a, Self>, ProgramError> {
        Ok(RefMut::map(account.try_borrow_mut_data()?, |data| {
            from_bytes_mut(data)
        }))
    }
    fn load<'a>(account: &'a AccountInfo) -> Result<Ref<'a, Self>, ProgramError> {
        Ok(Ref::map(account.try_borrow_data()?, |data| {
            from_bytes(data)
        }))
    }
    fn load_from_bytes(data: &[u8]) -> Result<&Self, ProgramError> {
        Ok(from_bytes(data))
    }
}

macro_rules! impl_loadable {
    ($type_name:ident) => {
        unsafe impl Zeroable for $type_name {}
        unsafe impl Pod for $type_name {}
        impl Loadable for $type_name {}
    };
}



#[repr(packed)]
#[derive(Clone, Copy)] 
pub struct FundData {

    pub is_initialized: bool,
    pub signer_nonce: u8,
    pub block_deposits: bool,
    pub paused_for_settlement: bool,
    pub no_of_investments: u32,
    pub no_of_pending_withdrawals: u32,
    pub no_of_settle_withdrawals: u32,

    /// Minimum Amount
    pub min_amount: u64,

    /// Performance Fee Percentage
    pub performance_fee_percentage: I80F48,

    /// Fund AUM
    pub total_amount: I80F48,

    /// Performance Fee
    pub performance_fee: I80F48,
    
    /// Performance indicator of Fund
    pub current_index: I80F48,

    /// Fund Deposits
    pub pending_deposits: u64,

    /// Pending Withdrawals
    pub pending_withdrawals: u64,

    /// Wallet Address of the Manager
    pub manager_account: Pubkey,

    /// Vault token account
    pub usdc_vault_key: Pubkey,

    /// Mango account for the fund
    pub mango_account: Pubkey,

    // Delegate for Manager to call place/cancel
    pub delegate: Pubkey,

    pub force_settle: ForceSettleData

}
impl_loadable!(FundData);

#[repr(packed)]
#[derive(Clone, Copy)]
pub struct ForceSettleData {
    pub share: I80F48,
    pub ready_for_settlement: bool,
    pub spot: [bool; MAX_PAIRS],
    pub perps: [bool; MAX_PAIRS],
} impl_loadable!(ForceSettleData);


#[repr(packed)]
#[derive(Clone, Copy)]
pub struct InvestorData {
    pub is_initialized: bool,
    pub investment_status: InvestmentStatus,
    pub padding: [u8; 6],

    /// The Initial deposit (in USDC tokens)
    pub amount: u64,

    /// index at time of deposit activation
    pub start_index: I80F48,

    /// Returns set at time of withdraw execution
    pub returns: u64,

    /// Investor wallet address
    pub owner: Pubkey,

    /// Invested Fund 
    pub fund: Pubkey,

    pub extra_padding: [u8; 160],

}
impl_loadable!(InvestorData);

#[repr(u8)] 
#[derive(PartialEq, Debug, Clone, Copy)] 
 pub enum InvestmentStatus { 
     Inactive = 0, 
     PendingDeposit, //1
     Active, //2
     PendingWithdraw, //3
     PendingForceSettlement, //4
     ReadyToClaim //5
 }

impl Sealed for InvestorData {}
impl IsInitialized for InvestorData {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

impl Sealed for FundData {}
impl IsInitialized for FundData {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

impl FundData {
    pub fn load_mut_checked<'a>(
        account: &'a AccountInfo,
        program_id: &Pubkey,
    ) -> Result<RefMut<'a, Self>, ProgramError> {
        assert_eq!(account.data_len(), size_of::<Self>());
        assert_eq!(account.owner, program_id);

        let data = Self::load_mut(account)?;
        Ok(data)
    }
    pub fn load_checked<'a>(
        account: &'a AccountInfo,
        program_id: &Pubkey,
    ) -> Result<Ref<'a, Self>, ProgramError> {
        assert_eq!(account.data_len(), size_of::<Self>());
        assert_eq!(account.owner, program_id);

        let data = Self::load(account)?;
        Ok(data)
    }

    pub fn check_force_settled(&self) -> Result<(bool, bool), ProgramError> {
        let spot_settled = self.force_settle.spot.iter().eq(&[false; MAX_PAIRS]);
        let perp_settled = self.force_settle.perps.iter().eq(&[false; MAX_PAIRS]);
        Ok((spot_settled, perp_settled))
    }
}

impl InvestorData {
    pub fn load_mut_checked<'a>(
        account: &'a AccountInfo,
        program_id: &Pubkey,
    ) -> Result<RefMut<'a, Self>, ProgramError> {
        assert_eq!(account.data_len(), size_of::<Self>());
        assert_eq!(account.owner, program_id);

        let data = Self::load_mut(account)?;
        Ok(data)
    }
    pub fn load_checked<'a>(
        account: &'a AccountInfo,
        program_id: &Pubkey,
    ) -> Result<Ref<'a, Self>, ProgramError> {
        assert_eq!(account.data_len(), size_of::<Self>());
        assert_eq!(account.owner, program_id);

        let data = Self::load(account)?;
        Ok(data)
    }
}
