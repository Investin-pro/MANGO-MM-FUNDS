use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum FundError {
    #[error("FundAccount is Already Initialised")]
    FundAccountAlreadyInit,

    #[error("InvestorAccount is Already Initialised")]
    InvestorAccountAlreadyInit,

    #[error("Invorrect signature")]
    IncorrectSignature,

    #[error("Incorrect program id passed")]
    IncorrectProgramId,

    #[error("Incorrect PDA passed")]
    IncorrectPDA,

    #[error("Invalid Token Accounts passed")]
    InvalidTokenAccount,

    #[error("Invalid State Accounts passed")]
    InvalidStateAccount,

    /// Invalid instruction
    #[error("Invalid Instruction")]
    InvalidInstruction,

    /// Amount less than minimum Amount
    #[error("Amount less than minimum amount")]
    InvalidAmount,

    /// Investor Mismatch
    #[error("Investor Mismatch")]
    InvestorMismatch,

    /// Manager Mismatch
    #[error("Manager Mismatch")]
    ManagerMismatch,

    /// Maximum Number of Depositors at a time reached
    #[error("Wait for Manager Transfer")]
    DepositLimitReached,

    #[error("Stale price in account")]
    PriceStaleInAccount,

    #[error("Invalid Margin Instruction State")]
    InvalidMangoState,

    #[error("Default Error")]
    Default,
}

impl From<FundError> for ProgramError {
    fn from(e: FundError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
