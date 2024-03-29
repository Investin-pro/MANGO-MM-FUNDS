use arrayref::{array_ref, array_refs};
use mango::matching::{OrderType, Side};
use num_enum::TryFromPrimitive;
use serde::{Serialize, Deserialize};
use solana_program::{pubkey::Pubkey, instruction::{Instruction, AccountMeta}, program_error::ProgramError, account_info::Account};

use crate::processor::Fund;

#[repr(C)]
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]

pub enum FundInstruction {
    
    Initialize {
        min_amount: u64,
        performance_fee_bps: u64,
    },

    InvestorDeposit {
        amount: u64,
    },

    CreateLockup{
        amount: u64,
    },

    ChangeFundPrivacy{
        status: bool
    },

    InvestorWithdraw,

    InvestorRequestWithdraw,

    ClaimPerformanceFee,
    
    ProcessDeposits,

    ProcessWithdraws,

    SetMangoDelegate,

    PauseForSettlement,

    InitForceSettle,

    ForceUpdatePerp,

    ForceUpdateSpot {
        open_order_index: u8,
    },

    ReleaseLockup,

    ForceWithdraws, 

    ResetMangoDelegate
    
}

impl FundInstruction {
    pub fn unpack(input: &[u8]) -> Option<Self> {
        let (&op, data) = array_refs![input, 4; ..;];
        let op = u32::from_le_bytes(op);
        Some(match op {
            0 => {
                let data = array_ref![data, 0, 8 + 8];
                let (min_amount, performance_fee_bps) = array_refs![data, 8, 8];

                FundInstruction::Initialize {
                    min_amount: u64::from_le_bytes(*min_amount),
                    performance_fee_bps: u64::from_le_bytes(*performance_fee_bps),
                }
            }
            1 => {
                let amount = array_ref![data, 0, 8];
                FundInstruction::InvestorDeposit {
                    amount: u64::from_le_bytes(*amount),
                }
            }
            2 => FundInstruction::InvestorWithdraw,
            3 => FundInstruction::InvestorRequestWithdraw,
            4 => FundInstruction::ProcessDeposits,
            5 => FundInstruction::ProcessWithdraws,
            6 => FundInstruction::ClaimPerformanceFee,
            7 => FundInstruction::SetMangoDelegate,
            8 => FundInstruction::PauseForSettlement,
            9 => FundInstruction::InitForceSettle,
            10 => FundInstruction::ForceUpdatePerp,
            11 => {
                let open_order_index = array_ref![data, 0, 1];
                FundInstruction::ForceUpdateSpot { 
                    open_order_index: u8::from_le_bytes(*open_order_index),
                }
            },
            12 => FundInstruction::ForceWithdraws,
            13 => FundInstruction::ResetMangoDelegate,
            14 => {
                let amount = array_ref![data, 0, 8];
                FundInstruction::CreateLockup {
                    amount: u64::from_le_bytes(*amount),
                }
            }
            15 => {
                let status = array_ref![data, 0, 1];
                let status = match status {
                    [0] => false,
                    [1] => true,
                    _ => return None,
                };
                FundInstruction::ChangeFundPrivacy { status }
            }

            16 => FundInstruction::ReleaseLockup,

            _ => {
                return None;
            }
        })
    }
    pub fn pack(&self) -> Vec<u8> {
        bincode::serialize(self).unwrap()
    }
}

pub fn initialize(
    program_id: &Pubkey,
    manager_pk: &Pubkey,
    fund_pda_pk: &Pubkey,
    fund_usdc_vault_pk: &Pubkey,
    mango_program_pk: &Pubkey,
    mango_group_pk: &Pubkey, 
    mango_account_pk: &Pubkey,
    delegate_pk: &Pubkey,
    system_program_pk: &Pubkey,
    min_amount: u64,
    performance_fee_bps: u64
) -> Result<Instruction, ProgramError> {
    let accounts = vec![
        AccountMeta::new(*manager_pk, true),
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new(*fund_usdc_vault_pk, false),
        AccountMeta::new_readonly(*mango_program_pk, false),
        AccountMeta::new(*mango_group_pk, false),
        AccountMeta::new(*mango_account_pk, false),
        AccountMeta::new_readonly(*delegate_pk, false),
        AccountMeta::new_readonly(*system_program_pk, false)
    ];

    let instr = FundInstruction::Initialize { min_amount, performance_fee_bps};
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}
