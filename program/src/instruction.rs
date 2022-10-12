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

    InvestorCancelWithdrawRequest,

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

            17 => FundInstruction::InvestorCancelWithdrawRequest,

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

    let instr = FundInstruction::Initialize { min_amount, performance_fee_bps };
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn create_lockup(
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    manager_pk: &Pubkey,
    mango_program_pk: &Pubkey,
    mango_group_pk: &Pubkey, 
    mango_account_pk: &Pubkey,
    mango_cache_pk: &Pubkey,
    root_bank_pk: &Pubkey,
    node_bank_pk: &Pubkey,
    vault_pk: &Pubkey,
    token_program_pk: &Pubkey,
    manager_usdc_vault_pk: &Pubkey,
    open_orders_pks: &[Pubkey],
    amount: u64
) -> Result<Instruction, ProgramError> {
    let mut accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new(*manager_pk, true),
        AccountMeta::new_readonly(*mango_program_pk, false),
        AccountMeta::new(*mango_group_pk, false),
        AccountMeta::new(*mango_account_pk, false),
        AccountMeta::new(*mango_cache_pk, false),
        AccountMeta::new(*root_bank_pk, false),
        AccountMeta::new(*node_bank_pk, false),
        AccountMeta::new(*vault_pk, false),
        AccountMeta::new_readonly(*token_program_pk, false),
        AccountMeta::new(*manager_usdc_vault_pk, false),
    ];
    accounts.extend(open_orders_pks.iter().map(|pk| AccountMeta::new_readonly(*pk, false)));
    let instr = FundInstruction::CreateLockup { amount };
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn investor_deposit(
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    investor_state_pk: &Pubkey,
    investor_pk: &Pubkey,
    investor_usdc_vault_pk: &Pubkey,
    fund_usdc_vault_pk: &Pubkey,
    token_program_pk: &Pubkey,
    amount: u64,
) -> Result<Instruction, ProgramError> {
    let accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new(*investor_state_pk, false),
        AccountMeta::new(*investor_pk, true),
        AccountMeta::new(*investor_usdc_vault_pk, false),
        AccountMeta::new(*fund_usdc_vault_pk, false),
        AccountMeta::new_readonly(*token_program_pk, false)
    ];

    let instr = FundInstruction::InvestorDeposit { amount };
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn change_privacy(
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    manager_pk: &Pubkey,
    status: bool
) -> Result<Instruction, ProgramError> {
    let accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new(*manager_pk, true),
    ];

    let instr = FundInstruction::ChangeFundPrivacy { status };
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn process_deposits(
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    manager_pk: &Pubkey,
    mango_program_pk: &Pubkey,
    mango_group_pk: &Pubkey, 
    mango_account_pk: &Pubkey,
    mango_cache_pk: &Pubkey,
    root_bank_pk: &Pubkey,
    node_bank_pk: &Pubkey,
    vault_pk: &Pubkey,
    token_program_pk: &Pubkey,
    fund_usdc_vault_pk: &Pubkey,
    open_orders_pks: &[Pubkey],
    investors_pks: &[Pubkey],
) -> Result<Instruction, ProgramError> {
    let mut accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new(*manager_pk, true),
        AccountMeta::new_readonly(*mango_program_pk, false),
        AccountMeta::new(*mango_group_pk, false),
        AccountMeta::new(*mango_account_pk, false),
        AccountMeta::new(*mango_cache_pk, false),
        AccountMeta::new(*root_bank_pk, false),
        AccountMeta::new(*node_bank_pk, false),
        AccountMeta::new(*vault_pk, false),
        AccountMeta::new_readonly(*token_program_pk, false),
        AccountMeta::new(*fund_usdc_vault_pk, false),
    ];
    accounts.extend(open_orders_pks.iter().map(|pk| AccountMeta::new_readonly(*pk, false)));
    accounts.extend(investors_pks.iter().map(|pk| AccountMeta::new(*pk, false)));
    let instr = FundInstruction::ProcessDeposits;
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn investor_request_withdraw(
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    investor_state_pk: &Pubkey,
    investor_pk: &Pubkey
) -> Result<Instruction, ProgramError> {
    let accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new(*investor_state_pk, false),
        AccountMeta::new_readonly(*investor_pk, true),
    ];
    
    let instr = FundInstruction::InvestorRequestWithdraw;
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn investor_withdraw(
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    investor_state_pk: &Pubkey,
    investor_pk: &Pubkey,
    investor_usdc_vault_pk: &Pubkey,
    fund_usdc_vault_pk: &Pubkey,
    token_program_pk: &Pubkey,
    amount: u64,
) -> Result<Instruction, ProgramError> {
    let accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new(*investor_state_pk, false),
        AccountMeta::new(*investor_pk, true),
        AccountMeta::new(*investor_usdc_vault_pk, false),
        AccountMeta::new(*fund_usdc_vault_pk, false),
        AccountMeta::new_readonly(*token_program_pk, false)
    ];

    let instr = FundInstruction::InvestorWithdraw;
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn release_lockup (
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    manager_pk: &Pubkey,
    mango_program_pk: &Pubkey,
    mango_group_pk: &Pubkey,
    mango_account_pk: &Pubkey,
    mango_cache_pk: &Pubkey,
    root_bank_pk: &Pubkey,
    node_bank_pk: &Pubkey,
    vault_pk: &Pubkey,
    signer_pk: &Pubkey,
    manager_token_vault_pk: &Pubkey,
    token_program_pk: &Pubkey,
    open_orders_pks: &[Pubkey],
) -> Result<Instruction, ProgramError> {
    let mut accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new(*manager_pk, false),
        AccountMeta::new_readonly(*mango_program_pk, true),
        AccountMeta::new(*mango_group_pk, false),
        AccountMeta::new(*mango_cache_pk, false),
        AccountMeta::new(*mango_account_pk, false),
        AccountMeta::new(*root_bank_pk, false),
        AccountMeta::new(*node_bank_pk, false),
        AccountMeta::new(*vault_pk, false),
        AccountMeta::new(*signer_pk, false),
        AccountMeta::new(*manager_token_vault_pk, false),
        AccountMeta::new_readonly(*token_program_pk, false),
    ];

    accounts.extend(open_orders_pks.iter().map(|f| AccountMeta::new_readonly(*f, false),));

    let instr = FundInstruction::ReleaseLockup { };
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn process_withdraws(
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    manager_pk: &Pubkey,
    mango_program_pk: &Pubkey,
    mango_group_pk: &Pubkey, 
    mango_account_pk: &Pubkey,
    mango_cache_pk: &Pubkey,
    root_bank_pk: &Pubkey,
    node_bank_pk: &Pubkey,
    vault_pk: &Pubkey,
    signer_pk: &Pubkey,
    token_program_pk: &Pubkey,
    fund_usdc_vault_pk: &Pubkey,
    open_orders_pks: &[Pubkey],
    investors_pks: &[Pubkey],
) -> Result<Instruction, ProgramError> {
    let mut accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new(*manager_pk, true),
        AccountMeta::new_readonly(*mango_program_pk, false),
        AccountMeta::new(*mango_group_pk, false),
        AccountMeta::new(*mango_account_pk, false),
        AccountMeta::new(*mango_cache_pk, false),
        AccountMeta::new(*root_bank_pk, false),
        AccountMeta::new(*node_bank_pk, false),
        AccountMeta::new(*vault_pk, false),
        AccountMeta::new(*signer_pk, false),
        AccountMeta::new_readonly(*token_program_pk, false),
        AccountMeta::new(*fund_usdc_vault_pk, false),
    ];
    accounts.extend(open_orders_pks.iter().map(|pk| AccountMeta::new_readonly(*pk, false)));
    accounts.extend(investors_pks.iter().map(|pk| AccountMeta::new(*pk, false)));
    let instr = FundInstruction::ProcessWithdraws;
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn claim_performnace_fee(
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    manager_pk: &Pubkey,
    mango_program_pk: &Pubkey,
    mango_group_pk: &Pubkey, 
    mango_account_pk: &Pubkey,
    mango_cache_pk: &Pubkey,
    root_bank_pk: &Pubkey,
    node_bank_pk: &Pubkey,
    vault_pk: &Pubkey,
    signer_pk: &Pubkey,
    token_program_pk: &Pubkey,
    manager_usdc_vault_pk: &Pubkey,
    open_orders_pks: &[Pubkey],
) -> Result<Instruction, ProgramError> {
    let mut accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new(*manager_pk, true),
        AccountMeta::new_readonly(*mango_program_pk, false),
        AccountMeta::new(*mango_group_pk, false),
        AccountMeta::new(*mango_account_pk, false),
        AccountMeta::new(*mango_cache_pk, false),
        AccountMeta::new(*root_bank_pk, false),
        AccountMeta::new(*node_bank_pk, false),
        AccountMeta::new(*vault_pk, false),
        AccountMeta::new(*signer_pk, false),
        AccountMeta::new_readonly(*token_program_pk, false),
        AccountMeta::new(*manager_usdc_vault_pk, false),
    ];
    accounts.extend(open_orders_pks.iter().map(|pk| AccountMeta::new_readonly(*pk, false)));
    let instr = FundInstruction::ClaimPerformanceFee;
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn set_mango_delegate(
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    manager_pk: &Pubkey,
    mango_program_pk: &Pubkey,
    mango_group_pk: &Pubkey,
    mango_account_pk: &Pubkey,
    delegate_pk: &Pubkey,
) -> Result<Instruction, ProgramError> {
    let accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new(*manager_pk, true),
        AccountMeta::new_readonly(*mango_program_pk, false),
        AccountMeta::new(*mango_group_pk, false),
        AccountMeta::new(*mango_account_pk, false),
        AccountMeta::new(*delegate_pk, false),
    ];

    let instr = FundInstruction::SetMangoDelegate;
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn pause_for_settlement(
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    mango_program_pk: &Pubkey,
    mango_group_pk: &Pubkey,
    mango_account_pk: &Pubkey,
    default_pk: &Pubkey,
) -> Result<Instruction, ProgramError> {
    let accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new_readonly(*mango_program_pk, false),
        AccountMeta::new(*mango_group_pk, false),
        AccountMeta::new(*mango_account_pk, false),
        AccountMeta::new(*default_pk, false),
    ];

    let instr = FundInstruction::PauseForSettlement;
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn init_force_settle(
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    mango_program_pk: &Pubkey,
    mango_group_pk: &Pubkey,
    mango_account_pk: &Pubkey,
    mango_cache_pk: &Pubkey,
    open_orders_pks: &[Pubkey],
    investors_pks: &[Pubkey],
) -> Result<Instruction, ProgramError> {
    let mut accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new_readonly(*mango_program_pk, true),
        AccountMeta::new(*mango_group_pk, false),
        AccountMeta::new(*mango_account_pk, false),
        AccountMeta::new(*mango_cache_pk, false)
    ];

    accounts.extend(open_orders_pks.iter().map(|f| AccountMeta::new_readonly(*f, false)));
    accounts.extend(investors_pks.iter().map(|f| AccountMeta::new(*f, false)));

    let instr = FundInstruction::InitForceSettle;
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn force_update_perp(
    program_id: &Pubkey,
    mango_program_pk: &Pubkey,
    mango_group_pk: &Pubkey,
    mango_account_pk: &Pubkey,
    fund_pda_pk: &Pubkey,
    mango_cache_pk: &Pubkey,
    perp_market_pk: &Pubkey,
    bids_pk: &Pubkey,
    asks_pk: &Pubkey,
    event_queue_pk: &Pubkey,
    referrer_mango_account_pk: &Pubkey,
    packed_open_orders_pks: &[Pubkey],
) -> Result<Instruction, ProgramError> {
    let mut accounts = vec![
        AccountMeta::new_readonly(*mango_program_pk, true),
        AccountMeta::new(*mango_group_pk, false),
        AccountMeta::new(*mango_account_pk, false),
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new(*mango_cache_pk, false),
        AccountMeta::new(*perp_market_pk, false),
        AccountMeta::new(*bids_pk, false),
        AccountMeta::new(*asks_pk, false),
        AccountMeta::new(*event_queue_pk, false),
        AccountMeta::new(*referrer_mango_account_pk, false),
    ];

    accounts.extend(packed_open_orders_pks.iter().map(|f| AccountMeta::new_readonly(*f, false)));

    let instr = FundInstruction::ForceUpdatePerp;
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn force_update_spot(
    program_id: &Pubkey,
    mango_program_pk: &Pubkey,
    mango_group_pk: &Pubkey,
    mango_account_pk: &Pubkey,
    fund_pda_pk: &Pubkey,
    mango_cache_pk: &Pubkey,
    dex_prog_pk: &Pubkey,
    spot_market_pk: &Pubkey,
    bids_pk: &Pubkey,
    asks_pk: &Pubkey,
    dex_request_queue_pk: &Pubkey,
    dex_event_queue_pk: &Pubkey,
    dex_base_pk: &Pubkey,
    dex_quote_pk: &Pubkey,
    base_root_bank_pk: &Pubkey,
    base_node_bank_pk: &Pubkey,
    base_vault_pk: &Pubkey,
    quote_root_bank_pk: &Pubkey,
    quote_node_bank_pk: &Pubkey,
    quote_vault_pk: &Pubkey,
    signer_pk: &Pubkey,
    dex_signer_pk: &Pubkey,
    msrm_or_srm_vault_pk: &Pubkey,
    token_program_pk: &Pubkey,
    packed_open_orders_pks: &[Pubkey],
    open_order_index: u8,
) -> Result<Instruction, ProgramError> {
    let mut accounts = vec![
        AccountMeta::new_readonly(*mango_program_pk, true),
        AccountMeta::new(*mango_group_pk, false),
        AccountMeta::new(*mango_account_pk, false),
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new(*mango_cache_pk, false),
        AccountMeta::new_readonly(*dex_prog_pk, false),
        AccountMeta::new(*spot_market_pk, false),
        AccountMeta::new(*bids_pk, false),
        AccountMeta::new(*asks_pk, false),
        AccountMeta::new(*dex_request_queue_pk, false),
        AccountMeta::new(*dex_event_queue_pk, false),
        AccountMeta::new(*dex_base_pk, false),
        AccountMeta::new(*dex_quote_pk, false),
        AccountMeta::new(*base_root_bank_pk, false),
        AccountMeta::new(*base_node_bank_pk, false),
        AccountMeta::new(*base_vault_pk, false),
        AccountMeta::new(*quote_root_bank_pk, false),
        AccountMeta::new(*quote_node_bank_pk, false),
        AccountMeta::new(*quote_vault_pk, false),
        AccountMeta::new(*signer_pk, false),
        AccountMeta::new(*dex_signer_pk, false),
        AccountMeta::new(*msrm_or_srm_vault_pk, false),
        AccountMeta::new_readonly(*token_program_pk, false),
    ];

    accounts.extend(packed_open_orders_pks.iter().map(|f| AccountMeta::new_readonly(*f, false)));

    let instr = FundInstruction::ForceUpdateSpot { open_order_index: open_order_index };
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn force_withdraws(
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    mango_program_pk: &Pubkey,
    mango_group_pk: &Pubkey,
    mango_account_pk: &Pubkey,
    mango_cache_pk: &Pubkey,
    root_bank_pk: &Pubkey,
    node_bank_pk: &Pubkey,
    vault_pk: &Pubkey,
    signer_pk: &Pubkey,
    fund_usdc_vault_pk: &Pubkey,
    token_program_pk: &Pubkey,
    open_orders_pks: &[Pubkey],
    investors_pks: &[Pubkey],
) -> Result<Instruction, ProgramError> {
    let mut accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new_readonly(*mango_program_pk, true),
        AccountMeta::new(*mango_group_pk, false),
        AccountMeta::new(*mango_account_pk, false),
        AccountMeta::new(*mango_cache_pk, false),
        AccountMeta::new(*root_bank_pk, false),
        AccountMeta::new(*node_bank_pk, false),
        AccountMeta::new(*vault_pk, false),
        AccountMeta::new(*signer_pk, false),
        AccountMeta::new(*fund_usdc_vault_pk, false),
        AccountMeta::new_readonly(*token_program_pk, false),
    ];

    accounts.extend(open_orders_pks.iter().map(|f| AccountMeta::new_readonly(*f, false)));
    accounts.extend(investors_pks.iter().map(|f| AccountMeta::new(*f, false)));

    let instr = FundInstruction::ForceWithdraws { };
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}

pub fn reset_mango_delegate(
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    mango_program_pk: &Pubkey,
    mango_group_pk: &Pubkey,
    mango_account_pk: &Pubkey,
    delegate_pk: &Pubkey,
    status: u8,
) -> Result<Instruction, ProgramError> {
    let accounts = vec![
        AccountMeta::new(*fund_pda_pk, false),
        AccountMeta::new_readonly(*mango_program_pk, false),
        AccountMeta::new(*mango_group_pk, false),
        AccountMeta::new(*mango_account_pk, false),
        AccountMeta::new(*delegate_pk, false),
    ];

    let instr = FundInstruction::ResetMangoDelegate { };
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}


pub fn investor_cancel_withdraw_request (
    program_id: &Pubkey,
    fund_pda_pk: &Pubkey,
    investor_state_pk: &Pubkey,
    investor_pk: &Pubkey,
) -> Result<Instruction, ProgramError> {
    let accounts = vec![
        AccountMeta::new(*fund_pda_pk, true),
        AccountMeta::new(*investor_state_pk, false),
        AccountMeta::new(*investor_pk, false),
    ];

    let instr = FundInstruction::InvestorCancelWithdrawRequest {};
    let data = instr.pack();
    Ok(Instruction { program_id: *program_id, accounts, data })
}