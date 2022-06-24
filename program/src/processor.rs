use std::{mem::size_of, char::MAX, collections::btree_map::OccupiedEntry};
use std::num::NonZeroU64;

use bytemuck::bytes_of;
use fixed::traits::FromFixed;
use fixed::types::I80F48;
use fixed_macro::types::I80F48;

use solana_program::{
    account_info::{AccountInfo,next_account_info},
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey, rent::Rent, sysvar::Sysvar, system_program, stake::state::Delegation, clock::Clock,
};

use arrayref::{array_ref, array_refs};

use spl_token::{
    id,
    state::{Account, Mint}, 
    instruction::{burn, initialize_mint, mint_to},
};
use spl_associated_token_account::instruction::{self, AssociatedTokenAccountInstruction};

use crate::{state::Loadable};
use crate::instruction::FundInstruction;
use crate::state::{FundData, InvestorData};

use mango::ids::{mngo_token, luna_spot_market};
use mango::instruction::{cancel_all_perp_orders, consume_events, place_perp_order, withdraw, set_delegate, cancel_all_spot_orders};
use mango::state::{MangoAccount, MangoCache, MangoGroup, PerpMarket, HealthCache, HealthType, MAX_PAIRS, QUOTE_INDEX};
use mango::matching::{Side, OrderType, ExpiryType};

use serum_dex::instruction::{NewOrderInstructionV3, SelfTradeBehavior};
use serum_dex::matching::{OrderType as SerumOrderType, Side as SerumSide};
use serum_dex::state::MarketState;



// macro_rules! check {
//     ($cond:expr, $err:expr) => {
//         if !($cond) {
//             return Err(($err).into());
//         }
//     };
// }
// macro_rules! assert_eq {
//     ($x:expr, $y:expr) => {
//         if ($x != $y) {
//             return Err(FundError::Default.into());
//         }
//     };
// }



pub mod usdc_token {
    use solana_program::declare_id;
    declare_id!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
}

pub mod mango_v3 {
    use solana_program::declare_id;
    declare_id!("mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68");
}

pub const INITIAL_INDEX: I80F48 = I80F48!(1_000_000);
pub const WEEK_SECONDS: i64 = 604800;
pub const DAY_SECONDS: i64 = 86400;
pub const HOUR_SECONDS: i64 = 3600;


pub struct Fund {}

impl Fund {
    // Fund Initialize
    pub fn initialize(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        min_amount: u64,
        performance_fee_bps: u64,
    ) -> Result<(), ProgramError> {
        const NUM_FIXED: usize = 8;
        let accounts = array_ref![accounts, 0, NUM_FIXED];

        let [
            manager_ai,
            fund_pda_ai,
            fund_usdc_vault_ai,
            mango_program_ai,
            mango_group_ai, 
            mango_account_ai,
            delegate_ai,
            system_program_ai
        ] = accounts;
        

        assert!(manager_ai.is_signer);

        let fund_usdc_vault_data = parse_token_account(fund_usdc_vault_ai)?;
        assert!(fund_usdc_vault_data.mint == usdc_token::id() && fund_usdc_vault_data.owner == *fund_pda_ai.key);
        assert_eq!(mango_v3::id(), *mango_program_ai.key);
        assert!(min_amount >= 10000000);
        assert!(performance_fee_bps >= 100 && performance_fee_bps <= 8000);

        let (fund_pda, signer_nonce) = Pubkey::find_program_address(&[&manager_ai.key.to_bytes()], program_id);

        // check if pda matches
        assert_eq!(fund_pda, *fund_pda_ai.key);

        let rent = Rent::get()?;        
        let fund_size = size_of::<FundData>();
        

        // create fund pda account
        invoke_signed(
            &solana_program::system_instruction::create_account(
                &manager_ai.key,
                &fund_pda_ai.key,
                rent.minimum_balance(fund_size).max(1),
                fund_size as u64,
                &program_id,
            ),
            &[manager_ai.clone(), fund_pda_ai.clone(), system_program_ai.clone()],
            &[&[&manager_ai.key.to_bytes(), bytes_of(&signer_nonce)]]
        )?;

        invoke_signed(
            &mango::instruction::create_mango_account(
                mango_program_ai.key, 
                mango_group_ai.key, 
                mango_account_ai.key, 
                fund_pda_ai.key, 
                system_program_ai.key, 
                manager_ai.key, 
                0
            )?,
            &[
                mango_program_ai.clone(),
                mango_group_ai.clone(),
                mango_account_ai.clone(),
                fund_pda_ai.clone(),
                system_program_ai.clone(),
                manager_ai.clone()
            ],
            &[&[&manager_ai.key.to_bytes(), bytes_of(&signer_nonce)]]
        );


        invoke_signed(
            &mango::instruction::set_delegate(
                mango_program_ai.key, 
                mango_group_ai.key, 
                mango_account_ai.key, 
                fund_pda_ai.key, 
                delegate_ai.key,
            )?,
            &[
                mango_program_ai.clone(),
                mango_group_ai.clone(),
                mango_account_ai.clone(),
                fund_pda_ai.clone(),
                delegate_ai.clone()
            ],
            &[&[&manager_ai.key.to_bytes(), bytes_of(&signer_nonce)]]

        );


        let mut fund_data = FundData::load_mut(fund_pda_ai)?;

        fund_data.is_initialized = true;
        fund_data.signer_nonce = signer_nonce;
        fund_data.block_deposits = false;
        fund_data.min_amount = min_amount;
        fund_data.performance_fee_percentage = I80F48::from_num(performance_fee_bps / 100);
        fund_data.current_index = I80F48!(1.00);
        fund_data.manager_account = *manager_ai.key;
        fund_data.usdc_vault_key = *fund_usdc_vault_ai.key;
        fund_data.mango_account = *mango_account_ai.key;
        fund_data.delegate = *delegate_ai.key;

        Ok(())
    }

    // investor deposit
    pub fn investor_deposit(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        amount: u64,
    ) -> Result<(), ProgramError> {
        const NUM_FIXED: usize = 6;
        let fixed_ais = array_ref![accounts, 0, NUM_FIXED];

        let [
            fund_pda_ai, 
            investor_state_ai, 
            investor_ai, 
            investor_usdc_vault_ai, 
            fund_vault_ai, 
            token_program_ai
            ] = fixed_ais;

        let mut fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;
        let mut investor_data = InvestorData::load_mut_checked(investor_state_ai, program_id)?;

        assert!(fund_data.is_initialized());
        assert!(!fund_data.block_deposits);
        assert!(!investor_data.is_initialized());
        assert_eq!(fund_data.usdc_vault_key, *fund_vault_ai.key);
        assert_eq!(*token_program_ai.key, spl_token::id());
        assert!(amount >= fund_data.min_amount);
        assert!(investor_ai.is_signer);

     
        invoke(
            &spl_token::instruction::transfer(
                token_program_ai.key,
                investor_usdc_vault_ai.key,
                fund_vault_ai.key,
                investor_ai.key,
                &[&investor_ai.key],
                amount,
            )?, 
            &[
                investor_usdc_vault_ai.clone(),
                fund_vault_ai.clone(),
                investor_ai.clone(),
                token_program_ai.clone(),
            ]
        )?;


        // update balances
        fund_data.pending_deposits = fund_data.pending_deposits.checked_add(amount).unwrap();

        // update investor acc
        investor_data.is_initialized = true;
        investor_data.investment_status = 1;
        investor_data.amount = amount;
        investor_data.start_index = fund_data.current_index;
        investor_data.returns = amount;
        investor_data.owner = *investor_ai.key;
        investor_data.fund = *fund_pda_ai.key;

        Ok(())
    }

    
    pub fn process_deposits(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> Result<(), ProgramError> {
        const NUM_FIXED: usize = 11;
        let fixed_ais = array_ref![accounts, 0, NUM_FIXED];
        let open_orders_ais = array_ref![accounts, NUM_FIXED, MAX_PAIRS];
        let investors_ais = &accounts[NUM_FIXED+MAX_PAIRS..];
        msg!("ivnestors ais:: {:?}", investors_ais.len());
        let [ 
            fund_pda_ai,
            manager_ai, 
            mango_program_ai,
            mango_group_ai,
            mango_account_ai,
            mango_cache_ai,
            root_bank_ai,
            node_bank_ai,
            vault_ai,
            token_program_ai,
            fund_usdc_vault_ai,
        ] = fixed_ais;

        let mut fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;
        
        assert!(manager_ai.is_signer);
        assert!(!fund_data.paused_for_settlement);
        assert_eq!(fund_data.manager_account, *manager_ai.key);
        assert_eq!(mango_v3::id(), *mango_program_ai.key);
        assert_eq!(*mango_account_ai.key, fund_data.mango_account);
        
        update_amount_and_performance(
            &mut fund_data,
            mango_account_ai,
            mango_group_ai,
            mango_cache_ai,
            mango_program_ai,
            open_orders_ais,
            true,
        )?;

        let mut deposit_amount:u64 = 0;

        for i in 0..investors_ais.len() {
            msg!("Investor ai:: {:?} of {}", investors_ais[i], investors_ais.len());
            let mut investor_data = InvestorData::load_mut_checked(&investors_ais[i], program_id)?;
            assert!(investor_data.investment_status == 1 && investor_data.fund == *fund_pda_ai.key);
            deposit_amount = deposit_amount.checked_add(investor_data.amount).unwrap();
            investor_data.start_index = fund_data.current_index;
            investor_data.investment_status = 2;
            fund_data.no_of_investments = fund_data.no_of_investments.checked_add(1).unwrap();
        }

        let signer_nonce = fund_data.signer_nonce;
        let signer_seeds = [
            manager_ai.key.as_ref(),
            bytes_of(&signer_nonce),
        ];
        drop(fund_data);

        invoke_signed(
            &mango::instruction::deposit(
                mango_program_ai.key,
                mango_group_ai.key,
                mango_account_ai.key,
                fund_pda_ai.key,
                mango_cache_ai.key,
                root_bank_ai.key,
                node_bank_ai.key,
                vault_ai.key,
                fund_usdc_vault_ai.key,
                deposit_amount,
            )?,
            &[
                mango_program_ai.clone(),
                mango_group_ai.clone(),
                mango_account_ai.clone(),
                fund_pda_ai.clone(),
                mango_cache_ai.clone(),
                root_bank_ai.clone(),
                node_bank_ai.clone(),
                vault_ai.clone(),
                fund_usdc_vault_ai.clone(),
                token_program_ai.clone(),
            ],
            &[&signer_seeds],
        );

        fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;

        fund_data.pending_deposits = fund_data.pending_deposits.checked_sub(deposit_amount).unwrap();
        
        let fund_usdc_vault = parse_token_account(fund_usdc_vault_ai)?;

        assert!(fund_usdc_vault.amount >= fund_data.pending_withdrawals.checked_add(fund_data.pending_deposits).unwrap());

        update_amount_and_performance(
            &mut fund_data,
            mango_account_ai,
            mango_group_ai,
            mango_cache_ai,
            mango_program_ai,
            open_orders_ais,
            false,
        )?;

        Ok(())
    }

    pub fn investor_request_withdraw(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> Result<(), ProgramError> {
        const NUM_FIXED: usize = 3;
        let fixed_ais = array_ref![accounts, 0, NUM_FIXED];

        let [
            fund_pda_ai, 
            investor_state_ai, 
            investor_ai, 
            ] = fixed_ais;

        let mut fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;
        let mut investor_data = InvestorData::load_mut_checked(investor_state_ai, program_id)?;

        assert!(fund_data.is_initialized());
        assert!(investor_data.is_initialized());
        assert_eq!(investor_data.owner, *investor_ai.key);
        assert_eq!(investor_data.fund,*fund_pda_ai.key);
        assert!(investor_ai.is_signer);
        assert_eq!(investor_data.investment_status, 2);
        assert!(!fund_data.paused_for_settlement);
        let ts_check = Clock::get()?.unix_timestamp.checked_rem(WEEK_SECONDS).unwrap();
        assert!( ts_check <= DAY_SECONDS || ts_check >= (DAY_SECONDS + (12*HOUR_SECONDS))); //To exclude 00:00 to 12:00 UTC Every Friday

        investor_data.investment_status = 3;
        fund_data.no_of_pending_withdrawals = fund_data.no_of_pending_withdrawals.checked_add(1).unwrap();

        Ok(())
    }


    // investor withdraw
    pub fn process_withdraws(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> Result<(), ProgramError> {

        const NUM_FIXED: usize = 12;
        let fixed_ais = array_ref![accounts, 0, NUM_FIXED];
        let open_orders_ais = array_ref![accounts, NUM_FIXED, MAX_PAIRS];
        let investors_ais = &accounts[NUM_FIXED+MAX_PAIRS..];
        let [ 
            fund_pda_ai,
            manager_ai, 
            mango_program_ai,
            mango_group_ai,
            mango_account_ai,
            mango_cache_ai,
            root_bank_ai,
            node_bank_ai,
            vault_ai,
            signer_ai,
            token_program_ai,
            fund_usdc_vault_ai,
        ] = fixed_ais;

        let mut fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;

        
        assert!(manager_ai.is_signer);
        assert_eq!(fund_data.manager_account, *manager_ai.key);
        assert_eq!(mango_v3::id(), *mango_program_ai.key);
        assert_eq!(*mango_account_ai.key, fund_data.mango_account);
        assert_eq!(fund_data.usdc_vault_key, *fund_usdc_vault_ai.key);
        assert!(!fund_data.paused_for_settlement);

    
        
        update_amount_and_performance(
            &mut fund_data,
            mango_account_ai,
            mango_group_ai,
            mango_cache_ai,
            mango_program_ai,
            open_orders_ais,
            true,
        )?;

        let withdraw_amount = compute_withdraw_amount(program_id, investors_ais, fund_pda_ai, &mut fund_data, 3)?;
        msg!("Withdrawing {:?} from mango", withdraw_amount);
        let open_orders_pubkeys = open_orders_ais.clone().map(|a| *a.key);

        let signer_nonce = fund_data.signer_nonce;

        let signer_seeds = [
            manager_ai.key.as_ref(),
            bytes_of(&signer_nonce),
        ];
        drop(fund_data);

        invoke_signed(
            &mango::instruction::withdraw(
                mango_program_ai.key,
                mango_group_ai.key,
                mango_account_ai.key,
                fund_pda_ai.key,
                mango_cache_ai.key,
                root_bank_ai.key,
                node_bank_ai.key,
                vault_ai.key,
                fund_usdc_vault_ai.key,
                signer_ai.key,
                &open_orders_pubkeys,
                withdraw_amount,
                false
            )?, 
            accounts, 
            &[&signer_seeds],
        );

        fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;


        fund_data.pending_withdrawals = fund_data.pending_withdrawals.checked_add(withdraw_amount).unwrap();

        let fund_usdc_vault = parse_token_account(fund_usdc_vault_ai)?;
        assert!(fund_usdc_vault.amount >= fund_data.pending_withdrawals.checked_add(fund_data.pending_deposits).unwrap());

        update_amount_and_performance(
            &mut fund_data,
            mango_account_ai,
            mango_group_ai,
            mango_cache_ai,
            mango_program_ai,
            open_orders_ais,
            false,
        )?;

        Ok(())
    }

    pub fn pause_for_settlement(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> Result<(), ProgramError> {

        const NUM_FIXED: usize = 5;
        let accounts = array_ref![accounts, 0, NUM_FIXED];

        let [
            fund_pda_ai, 
            mango_program_ai, 
            mango_group_ai, 
            mango_account_ai,
            default_ai 
        ] = accounts;
        
        let mut fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;
        assert!(fund_data.no_of_pending_withdrawals > 0);
        assert_eq!(mango_v3::id(), *mango_program_ai.key);
        assert_eq!(*mango_account_ai.key, fund_data.mango_account);
        let ts_check = Clock::get()?.unix_timestamp.checked_rem(WEEK_SECONDS).unwrap();
        // assert!((ts_check >= DAY_SECONDS + (10*HOUR_SECONDS)) && (ts_check <= (DAY_SECONDS + (12*HOUR_SECONDS)))); //Only from 10:00 to 12:00 UTC Every Friday
        assert!(!fund_data.paused_for_settlement);
        fund_data.paused_for_settlement = true;


        let signer_nonce = fund_data.signer_nonce;
        let (manager_account, signer_nonce) = (fund_data.manager_account, fund_data.signer_nonce);
        let signer_seeds = [
            &manager_account.as_ref(),
            bytes_of(&signer_nonce),
        ];
        drop(fund_data);

        invoke_signed(
            &mango::instruction::set_delegate(
                mango_program_ai.key,
                mango_group_ai.key,
                mango_account_ai.key,
                fund_pda_ai.key,
                &system_program::ID,
            )?,
            &[
                mango_program_ai.clone(),
                mango_group_ai.clone(),
                mango_account_ai.clone(),
                fund_pda_ai.clone(),
                default_ai.clone(),
            ],
            &[&signer_seeds],
        )?;
        
        Ok(())
    }




    pub fn init_force_settle(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> Result<(), ProgramError> {

        const NUM_FIXED: usize = 5;
        let fixed_ais = array_ref![accounts, 0, NUM_FIXED];
        let open_orders_ais = array_ref![accounts, NUM_FIXED, MAX_PAIRS];
        let investors_ais = &accounts[NUM_FIXED+MAX_PAIRS..];
        let [ 
            fund_pda_ai,
            mango_program_ai,
            mango_group_ai,
            mango_account_ai,
            mango_cache_ai,
        ] = fixed_ais;

        let mut fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;
        
        assert_eq!(mango_v3::id(), *mango_program_ai.key);
        assert_eq!(*mango_account_ai.key, fund_data.mango_account);
        assert!(fund_data.paused_for_settlement);
        
        let mut mango_active_assets = update_amount_and_performance(
            &mut fund_data,
            mango_account_ai,
            mango_group_ai,
            mango_cache_ai,
            mango_program_ai,
            open_orders_ais,
            false,
        )?;

        fund_data.force_settle.share = fund_data.force_settle.share.checked_add(compute_cumulative_share(program_id, investors_ais, fund_pda_ai, &mut fund_data)?).unwrap();
        fund_data.force_settle.spot = mango_active_assets.spot;
        fund_data.force_settle.perps = mango_active_assets.perps;

        if fund_data.no_of_pending_withdrawals == fund_data.no_of_settle_withdrawals {
            fund_data.force_settle.ready_for_settlement = true;
        }

        Ok(())
    }

    pub fn force_update_perp(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> Result<(), ProgramError> {

        const NUM_FIXED: usize = 10;
        let (fixed_ais, packed_open_orders_ais) = array_refs![accounts, NUM_FIXED; ..;];
        let [
            mango_program_ai,
            mango_group_ai,             // read
            mango_account_ai,           // write
            fund_pda_ai,                // write
            mango_cache_ai,             // read
            perp_market_ai,             // write
            bids_ai,                    // write
            asks_ai,                    // write
            event_queue_ai,             // write
            referrer_mango_account_ai,  // write
        ] = fixed_ais;

        let mut fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;
        
        assert_eq!(mango_v3::id(), *mango_program_ai.key);
        assert_eq!(*mango_account_ai.key, fund_data.mango_account);
        assert!(fund_data.force_settle.ready_for_settlement);
        let perp_market_index = get_perp_index(mango_group_ai, mango_program_ai, perp_market_ai)?;
        assert!(fund_data.force_settle.perps[perp_market_index]);
        fund_data.force_settle.perps[perp_market_index] = false;
        let mut packed_open_orders = vec![];
        for i in 0..packed_open_orders_ais.len(){
            packed_open_orders.push(*packed_open_orders_ais[i].key);
        }
        
        let (side, quantity) = get_perp_vals(fund_data.force_settle.share, perp_market_index, mango_account_ai, mango_group_ai, mango_program_ai)?;
        let (manager_account, signer_nonce) = (fund_data.manager_account, fund_data.signer_nonce);
        let signer_seeds = [
            &manager_account.as_ref(),
            bytes_of(&signer_nonce),
        ];
        drop(fund_data);


        invoke_signed(
            &mango::instruction::cancel_all_perp_orders(
                mango_program_ai.key,
                mango_group_ai.key,
                mango_account_ai.key,
                fund_pda_ai.key,
                perp_market_ai.key,
                bids_ai.key,
                asks_ai.key,
                u8::MAX,
            )?,
            &[
                mango_program_ai.clone(),
                mango_group_ai.clone(),
                mango_account_ai.clone(),
                fund_pda_ai.clone(),
                perp_market_ai.clone(),
                bids_ai.clone(),
                asks_ai.clone(),
            ],
            &[&signer_seeds],
        )?;



        invoke_signed(&mango::instruction::place_perp_order2(
            mango_program_ai.key, 
            mango_group_ai.key, 
            mango_account_ai.key, 
            fund_pda_ai.key, 
            mango_cache_ai.key, 
            perp_market_ai.key, 
            bids_ai.key, 
            asks_ai.key, 
            event_queue_ai.key, 
            Some(referrer_mango_account_ai.key), 
            &packed_open_orders,
            side, 
            i64::MAX, 
            quantity, 
            i64::MAX, 
            0, 
            OrderType::Market, 
            true, 
            None, 
            u8::MAX, 
            ExpiryType::Absolute
        )?, 
        accounts.clone(), 
        &[&signer_seeds],
        )?;
        Ok(())
    }

    pub fn force_update_spot(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        open_orders_index: u8,
    ) -> Result<(), ProgramError> {

        const NUM_FIXED: usize = 23;
        let (fixed_ais, packed_open_orders_ais) = array_refs![accounts, NUM_FIXED; ..;];

        let [
            mango_program_ai,
            mango_group_ai,         // read
            mango_account_ai,       // write
            fund_pda_ai,               // read & signer
            mango_cache_ai,         // read
            dex_prog_ai,            // read
            spot_market_ai,         // write
            bids_ai,                // write
            asks_ai,                // write
            dex_request_queue_ai,   // write
            dex_event_queue_ai,     // write
            dex_base_ai,            // write
            dex_quote_ai,           // write
            base_root_bank_ai,      // read
            base_node_bank_ai,      // write
            base_vault_ai,          // write
            quote_root_bank_ai,     // read
            quote_node_bank_ai,     // write
            quote_vault_ai,         // write
            token_program_ai,          // read
            signer_ai,              // read
            dex_signer_ai,          // read
            msrm_or_srm_vault_ai,   // read
        ] = fixed_ais;

        let mut fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;
        
        assert_eq!(mango_v3::id(), *mango_program_ai.key);
        assert_eq!(*mango_account_ai.key, fund_data.mango_account);
        assert!(fund_data.force_settle.ready_for_settlement);
        let spot_market_index = get_spot_index(mango_group_ai, mango_program_ai, spot_market_ai)?;
        assert!(fund_data.force_settle.perps[spot_market_index]);
        fund_data.force_settle.perps[spot_market_index] = false;
        let (manager_account, signer_nonce) = (fund_data.manager_account, fund_data.signer_nonce);
        let mut index: usize;
        let mut packed_open_orders = vec![];
        for i in 0..packed_open_orders_ais.len(){
            packed_open_orders.push(*packed_open_orders_ais[i].key);
        }
        let (side, price, coin_lots) = get_spot_vals(
            fund_data.force_settle.share, 
            spot_market_index, mango_account_ai, 
            mango_group_ai, 
            mango_cache_ai, 
            mango_program_ai,
            spot_market_ai,
            dex_prog_ai,
        )?;
        msg!("Side: {:?}, Price {:?}, Quanitiy {:?}", side, price, coin_lots);
        let order = NewOrderInstructionV3 {
            side: side,
            limit_price: NonZeroU64::new(price).unwrap(),
            max_coin_qty: NonZeroU64::new(coin_lots).unwrap(),
            max_native_pc_qty_including_fees: NonZeroU64::new(u64::MAX).unwrap(),
            self_trade_behavior: SelfTradeBehavior::AbortTransaction,
            order_type: serum_dex::matching::OrderType::ImmediateOrCancel,
            client_order_id: 1,
            limit: 65535,
            max_ts: 0,
        };
        let signer_seeds = [
            &manager_account.as_ref(),
            bytes_of(&signer_nonce),
        ];
        drop(fund_data);



        invoke_signed(
            &mango::instruction::cancel_all_spot_orders(
                mango_program_ai.key,
                mango_group_ai.key,
                mango_cache_ai.key,
                mango_account_ai.key,
                fund_pda_ai.key,
                base_root_bank_ai.key,
                base_node_bank_ai.key,
                base_vault_ai.key,
                quote_root_bank_ai.key,
                quote_vault_ai.key,
                quote_vault_ai.key,
                spot_market_ai.key,
                bids_ai.key,
                asks_ai.key,
                &packed_open_orders[open_orders_index as usize],
                signer_ai.key,
                dex_event_queue_ai.key,
                dex_base_ai.key,
                dex_quote_ai.key,
                dex_signer_ai.key,
                dex_prog_ai.key,
                u8::MAX,
            )?,
            accounts.clone(),
            &[&signer_seeds],
        )?;



        invoke_signed(&mango::instruction::place_spot_order2(
            mango_program_ai.key, 
            mango_group_ai.key, 
            mango_account_ai.key, 
            fund_pda_ai.key, 
            mango_cache_ai.key,
            dex_prog_ai.key, 
            spot_market_ai.key, 
            bids_ai.key, 
            asks_ai.key, 
            dex_request_queue_ai.key,
            dex_event_queue_ai.key,
            dex_base_ai.key,
            dex_quote_ai.key,
            base_root_bank_ai.key,
            base_node_bank_ai.key,
            base_vault_ai.key,
            quote_root_bank_ai.key,
            quote_vault_ai.key,
            quote_vault_ai.key,
            signer_ai.key,
            dex_signer_ai.key,
            msrm_or_srm_vault_ai.key,
            &packed_open_orders,
            open_orders_index as usize, 
            order,
        )?, 
        accounts.clone(), 
        &[&signer_seeds],
        )?;
        Ok(())
    }

    pub fn force_withdraws(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> Result<(), ProgramError> {

        const NUM_FIXED: usize = 11;
        let fixed_ais = array_ref![accounts, 0, NUM_FIXED];
        let open_orders_ais = array_ref![accounts, NUM_FIXED, MAX_PAIRS];
        let investors_ais = &accounts[NUM_FIXED+MAX_PAIRS..];
        let [ 
            fund_pda_ai,
            mango_program_ai,
            mango_group_ai,
            mango_account_ai,
            mango_cache_ai,
            root_bank_ai,
            node_bank_ai,
            vault_ai,
            signer_ai,
            token_program_ai,
            fund_usdc_vault_ai,
        ] = fixed_ais;

        let mut fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;

        
        assert_eq!(mango_v3::id(), *mango_program_ai.key);
        assert_eq!(*mango_account_ai.key, fund_data.mango_account);
        assert_eq!(fund_data.usdc_vault_key, *fund_usdc_vault_ai.key);
        assert!(fund_data.paused_for_settlement);
        assert_eq!(fund_data.check_force_settled()?, (true, true));

        
        update_amount_and_performance(
            &mut fund_data,
            mango_account_ai,
            mango_group_ai,
            mango_cache_ai,
            mango_program_ai,
            open_orders_ais,
            true,
        )?;

        let withdraw_amount = compute_withdraw_amount(program_id, investors_ais, fund_pda_ai, &mut fund_data, 4)?;

        let open_orders_pubkeys = open_orders_ais.clone().map(|a| *a.key);

        let (manager_account, signer_nonce) = (fund_data.manager_account, fund_data.signer_nonce);

        if fund_data.no_of_settle_withdrawals == 0 {
            fund_data.paused_for_settlement = false;
            fund_data.force_settle.ready_for_settlement = false;

        }

        let signer_seeds = [
            &manager_account.as_ref(),
            bytes_of(&signer_nonce),
        ];
        drop(fund_data);

        invoke_signed(
            &mango::instruction::withdraw(
                mango_program_ai.key,
                mango_group_ai.key,
                mango_account_ai.key,
                fund_pda_ai.key,
                mango_cache_ai.key,
                root_bank_ai.key,
                node_bank_ai.key,
                vault_ai.key,
                fund_usdc_vault_ai.key,
                signer_ai.key,
                &open_orders_pubkeys,
                withdraw_amount,
                false
            )?, 
            accounts, 
            &[&signer_seeds],
        );

        fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;

        fund_data.pending_withdrawals = fund_data.pending_withdrawals.checked_add(withdraw_amount).unwrap();


        let fund_usdc_vault = parse_token_account(fund_usdc_vault_ai)?;
        assert!(fund_usdc_vault.amount >= fund_data.pending_withdrawals.checked_add(fund_data.pending_deposits).unwrap());

        update_amount_and_performance(
            &mut fund_data,
            mango_account_ai,
            mango_group_ai,
            mango_cache_ai,
            mango_program_ai,
            open_orders_ais,
            false,
        )?;

        Ok(())
    }





    pub fn investor_withdraw(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> Result<(), ProgramError> {
        const NUM_FIXED: usize = 6;
        let fixed_ais = array_ref![accounts, 0, NUM_FIXED];

        let [
            fund_pda_ai, 
            investor_state_ai, 
            investor_ai, 
            investor_usdc_vault_ai, 
            fund_vault_ai, 
            token_program_ai
            ] = fixed_ais;

        let mut fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;
        let mut investor_data = InvestorData::load_mut_checked(investor_state_ai, program_id)?;

        assert!(fund_data.is_initialized());
        assert!(investor_ai.is_signer);
        assert!(investor_data.is_initialized());
        assert_eq!(investor_data.fund, *fund_pda_ai.key);
        assert!(investor_data.investment_status == 5 || investor_data.investment_status == 1);

        assert_eq!(*token_program_ai.key, spl_token::id());
        assert_eq!(fund_data.usdc_vault_key, *fund_vault_ai.key);

        let (manager_account, signer_nonce) = (fund_data.manager_account, fund_data.signer_nonce);

        drop(fund_data);
        
        let signer_seeds = [
            &manager_account.as_ref(),
            bytes_of(&signer_nonce),
        ];
     
        invoke_signed(
            &spl_token::instruction::transfer(
                token_program_ai.key,
                fund_vault_ai.key,
                investor_usdc_vault_ai.key,
                fund_pda_ai.key,
                &[&fund_pda_ai.key],
                investor_data.returns,
            )?, 
            accounts,
            &[&signer_seeds],
        )?;

        fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;


        // update balances
        if investor_data.investment_status == 1{
            fund_data.pending_deposits = fund_data.pending_deposits.checked_sub(investor_data.returns).unwrap();
        } else {
            fund_data.pending_withdrawals = fund_data.pending_withdrawals.checked_sub(investor_data.returns).unwrap();
        }

        // update investor acc
        close_investor_account(investor_ai, investor_state_ai);
        Ok(())
    }

    // manager perf fee claim (non-mango)
    pub fn claim_performnace_fee(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> Result<(), ProgramError> {

        const NUM_FIXED: usize = 11;

        let accounts = array_ref![accounts, 0, NUM_FIXED + MAX_PAIRS];

        let (fixed_ais, open_orders_ais) = array_refs![accounts, NUM_FIXED, MAX_PAIRS];

        let [ 
            fund_pda_ai,
            manager_ai, 
            mango_program_ai,
            mango_group_ai,
            mango_account_ai,
            mango_cache_ai,
            root_bank_ai,
            node_bank_ai,
            vault_ai,
            token_program_ai,
            manager_usdc_vault_ai,
        ] = fixed_ais;

        let mut fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;

        
        assert!(manager_ai.is_signer);
        assert_eq!(fund_data.manager_account, *manager_ai.key);
        assert_eq!(mango_v3::id(), *mango_program_ai.key);
        assert_eq!(*mango_account_ai.key, fund_data.mango_account);

    
        
        update_amount_and_performance(
            &mut fund_data,
            mango_account_ai,
            mango_group_ai,
            mango_cache_ai,
            mango_program_ai,
            open_orders_ais,
            true,
        )?;

        let withdraw_amount = I80F48::to_num(fund_data.performance_fee);
        fund_data.performance_fee = I80F48!(0);
        let signer_nonce = fund_data.signer_nonce;
        let signer_seeds = [
            manager_ai.key.as_ref(),
            bytes_of(&signer_nonce),
        ];
        drop(fund_data);

        let open_orders_pubkeys = open_orders_ais.clone().map(|a| *a.key);

        invoke_signed(
            &mango::instruction::withdraw(
                mango_program_ai.key,
                mango_group_ai.key,
                mango_account_ai.key,
                fund_pda_ai.key,
                mango_cache_ai.key,
                root_bank_ai.key,
                node_bank_ai.key,
                vault_ai.key,
                manager_usdc_vault_ai.key,
                fund_pda_ai.key,
                &open_orders_pubkeys,
                withdraw_amount,
                false
            )?, 
            accounts, 
            &[&signer_seeds],
        );

        fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;

        update_amount_and_performance(
            &mut fund_data,
            mango_account_ai,
            mango_group_ai,
            mango_cache_ai,
            mango_program_ai,
            open_orders_ais,
            false,
        )?;

        Ok(())
    }

    

    pub fn set_mango_delegate(program_id: &Pubkey, accounts: &[AccountInfo]) -> Result<(), ProgramError> {
        const NUM_FIXED: usize = 6;
        let accounts = array_ref![accounts, 0, NUM_FIXED];

        let [
            fund_pda_ai, 
            manager_ai, 
            mango_program_ai, 
            mango_group_ai, 
            mango_account_ai, 
            delegate_ai
        ] = accounts;

        let mut fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;

        assert!(manager_ai.is_signer);
        assert!(!fund_data.paused_for_settlement);
        assert_eq!(fund_data.manager_account, *manager_ai.key);
        assert_eq!(*mango_account_ai.key, fund_data.mango_account);


        fund_data.delegate = *delegate_ai.key;

        let signer_nonce = fund_data.signer_nonce;
        let signer_seeds = [
            manager_ai.key.as_ref(),
            bytes_of(&signer_nonce),
        ];
        drop(fund_data);

        invoke_signed(
            &mango::instruction::set_delegate(
                mango_program_ai.key,
                mango_group_ai.key,
                mango_account_ai.key,
                fund_pda_ai.key,
                delegate_ai.key,
            )?,
            &[
                mango_program_ai.clone(),
                mango_group_ai.clone(),
                mango_account_ai.clone(),
                fund_pda_ai.clone(),
                delegate_ai.clone(),
            ],
            &[&signer_seeds],
        )?;
        Ok(())
    }

    pub fn reset_mango_delegate(program_id: &Pubkey, accounts: &[AccountInfo]) -> Result<(), ProgramError> {
        const NUM_FIXED: usize = 5;
        let accounts = array_ref![accounts, 0, NUM_FIXED];

        let [
            fund_pda_ai, 
            mango_program_ai, 
            mango_group_ai, 
            mango_account_ai, 
            delegate_ai
        ] = accounts;

        let mut fund_data = FundData::load_mut_checked(fund_pda_ai, program_id)?;

        assert!(!fund_data.paused_for_settlement);
        assert_eq!(*mango_account_ai.key, fund_data.mango_account);
        assert_eq!(*delegate_ai.key, fund_data.delegate);

        let signer_nonce = fund_data.signer_nonce;
        let (manager_account, signer_nonce) = (fund_data.manager_account, fund_data.signer_nonce);

        let signer_seeds = [
            &manager_account.as_ref(),
            bytes_of(&signer_nonce),
        ];
        drop(fund_data);

        invoke_signed(
            &mango::instruction::set_delegate(
                mango_program_ai.key,
                mango_group_ai.key,
                mango_account_ai.key,
                fund_pda_ai.key,
                delegate_ai.key,
            )?,
            &[
                mango_program_ai.clone(),
                mango_group_ai.clone(),
                mango_account_ai.clone(),
                fund_pda_ai.clone(),
                delegate_ai.clone(),
            ],
            &[&signer_seeds],
        )?;
        Ok(())
    }

    // instruction processor
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        data: &[u8],
    ) -> Result<(), ProgramError> {
        let instruction =
            FundInstruction::unpack(data).ok_or(ProgramError::InvalidInstructionData)?;
        match instruction {
            FundInstruction::Initialize {
                min_amount,
                performance_fee_bps,
            } => {
                msg!("FundInstruction::Initialize");
                return Self::initialize(
                    program_id,
                    accounts,
                    min_amount,
                    performance_fee_bps,
                );
            }
            FundInstruction::InvestorDeposit { amount } => {
                msg!("FundInstruction::InvestorDeposit");
                return Self::investor_deposit(program_id, accounts, amount);
            }
            FundInstruction::InvestorWithdraw => {
                msg!("FundInstruction::InvestorWithdraw");
                return Self::investor_withdraw(program_id, accounts);
            }
            FundInstruction::InvestorRequestWithdraw => {
                msg!("FundInstruction::InvestorRequestWithdraw");
                return Self::investor_request_withdraw(program_id, accounts);
            }
            FundInstruction::ClaimPerformanceFee => {
                msg!("FundInstruction::ClaimPerformanceFee");
                return Self::claim_performnace_fee(program_id, accounts);
            }
            FundInstruction::ProcessDeposits => {
                msg!("FundInstruction::ProcessDeposits");
                return Self::process_deposits(program_id, accounts);
            }
            FundInstruction::ProcessWithdraws => {
                msg!("FundInstruction::ProcessWithdraws");
                return Self::process_withdraws(program_id, accounts);
            }
            FundInstruction::SetMangoDelegate => {
                msg!("FundInstruction::AddMangoDelegate");
                return Self::set_mango_delegate(program_id, accounts);
            }
            FundInstruction::ResetMangoDelegate => {
                msg!("FundInstruction::ResetDelegate");
                return Self::reset_mango_delegate(program_id, accounts);
            }
            FundInstruction::PauseForSettlement => {
                msg!("FundInstruction::PauseForSettlement");
                return Self::pause_for_settlement(program_id, accounts);
            }
            FundInstruction::InitForceSettle => {
                msg!("FundInstruction::InitForceSettle");
                return Self::init_force_settle(program_id, accounts);
            }
            FundInstruction::ForceUpdatePerp => {
                msg!("FundInstruction::ForceUpdatePerp");
                return Self::force_update_perp(program_id, accounts);
            }
            FundInstruction::ForceUpdateSpot { open_order_index } => {
                msg!("FundInstruction::ForceUpdateSpot");
                return Self::force_update_spot(program_id, accounts, open_order_index);
            }
            FundInstruction::ForceWithdraws => {
                msg!("FundInstruction::ForceWithdraws");
                return Self::force_withdraws(program_id, accounts);
            }
            

        }
    }
}


// calculate prices, get fund valuation and performance
pub fn update_amount_and_performance(
    fund_data: &mut FundData,
    mango_account_ai: &AccountInfo,
    mango_group_ai: &AccountInfo,
    mango_cache_ai: &AccountInfo,
    mango_program_ai: &AccountInfo,
    open_orders_ais: &[AccountInfo; MAX_PAIRS],
    update_perf: bool,
) -> Result<mango::state::UserActiveAssets, ProgramError> {
    
    assert_eq!(*mango_account_ai.key, fund_data.mango_account);

    let mango_group = MangoGroup::load_checked(
        mango_group_ai, 
        mango_program_ai.key
    )?;
    let mango_account = MangoAccount::load_checked(
        mango_account_ai, 
        mango_program_ai.key, 
        mango_group_ai.key
    )?;
    let mango_cache = MangoCache::load_checked(
        mango_cache_ai, 
        mango_program_ai.key, 
        &mango_group
    )?;

    
    let active_assets = mango::state::UserActiveAssets::new(
        &mango_group,
        &mango_account,
        vec![(mango::state::AssetType::Token, QUOTE_INDEX)],
    );
    
    let mut health_cache = mango::state::HealthCache::new(active_assets);
    
    health_cache.init_vals(&mango_group, &mango_cache, &mango_account, open_orders_ais)?;
    let (assets, liablities) = health_cache.get_health_components(&mango_group, HealthType::Equity);
    msg!("assets: {:?}, liabs: {:?}", assets, liablities);            
    
    let fund_val = assets.checked_sub(liablities).unwrap();

    if update_perf {
        let mut perf = fund_data.current_index;
        // only case where performance is not updated:
        // when no investments and no performance fee for manager
        if fund_data.no_of_investments != 0 || fund_data.performance_fee != 0 {
            perf = fund_val
                .checked_div(fund_data.total_amount)
                .unwrap()
                .checked_mul(fund_data.current_index)
                .unwrap();
        }
        // adjust for manager performance fee
        fund_data.performance_fee = I80F48::to_num(
            perf
                .checked_div(fund_data.current_index)
                .unwrap()
                .checked_mul(fund_data.performance_fee)
                .unwrap(),
        );
        fund_data.current_index = perf;
    }

    fund_data.total_amount = fund_val;

    msg!("updated amount: {:?}", fund_data.total_amount);
    msg!("updated perf {:?}", fund_data.current_index);

    Ok(mango::state::UserActiveAssets::new(
        &mango_group,
        &mango_account,
        vec![(mango::state::AssetType::Token, QUOTE_INDEX)],
    ))
}

pub fn parse_token_account(account_info: &AccountInfo) -> Result<Account, ProgramError> {
    if account_info.owner != &spl_token::ID {
        msg!("Account not owned by spl-token program");
        return Err(ProgramError::IncorrectProgramId);
    }
    let parsed = Account::unpack(&account_info.try_borrow_data()?)?;
    if !parsed.is_initialized() {
        msg!("Token account not initialized");
        return Err(ProgramError::UninitializedAccount);
    }
    Ok(parsed)
}

pub fn close_investor_account(
    investor_acc: &AccountInfo,
    investor_state_acc: &AccountInfo,
) -> Result<(), ProgramError> {
    let dest_starting_lamports = investor_acc.lamports();
    **investor_acc.lamports.borrow_mut() = dest_starting_lamports
        .checked_add(investor_state_acc.lamports())
        .ok_or(ProgramError::AccountBorrowFailed)?;
    **investor_state_acc.lamports.borrow_mut() = 0;

    Ok(())
}

pub fn compute_withdraw_amount(
    program_id: &Pubkey,
    investors_ais: &[AccountInfo],
    fund_pda_ai: &AccountInfo,
    fund_data: &mut FundData,
    check_status: u8
) -> Result<u64, ProgramError> {
    let mut withdraw_amount:u64 = 0;
    for i in 0..investors_ais.len() {
        let mut investor_data = InvestorData::load_mut_checked(&investors_ais[i], program_id)?;
        assert!((investor_data.investment_status == check_status) && investor_data.fund == *fund_pda_ai.key);
        let performance:I80F48 = fund_data.current_index.checked_div(investor_data.start_index).unwrap();
        let mut returns:u64 = I80F48::to_num(I80F48::from_num(investor_data.amount).checked_mul(performance).unwrap());
        if performance > I80F48!(1) {
            let performance_fee = I80F48::from_num(
                    returns.checked_sub(
                        investor_data.amount
                    ).unwrap()
                ).checked_mul(
                    fund_data.performance_fee_percentage.checked_div(
                        I80F48!(100)
                    ).unwrap()
                ).unwrap();
            returns = returns.checked_sub(I80F48::to_num(performance_fee)).unwrap();
            fund_data.performance_fee = fund_data.performance_fee.checked_add(performance_fee).unwrap();
        }
        withdraw_amount = withdraw_amount.checked_add(returns).unwrap();
        fund_data.no_of_pending_withdrawals = fund_data.no_of_pending_withdrawals.checked_sub(1).unwrap();
        fund_data.no_of_investments = fund_data.no_of_investments.checked_sub(1).unwrap();
        if check_status == 4 {
            fund_data.no_of_settle_withdrawals = fund_data.no_of_settle_withdrawals.checked_sub(1).unwrap();
        }   
        investor_data.returns = returns;
        investor_data.investment_status = 5;
    }
    Ok(withdraw_amount)
}

pub fn compute_cumulative_share(
    program_id: &Pubkey,
    investors_ais: &[AccountInfo],
    fund_pda_ai: &AccountInfo,
    fund_data: &mut FundData,
) -> Result<I80F48, ProgramError> {
    let mut withdraw_amount = I80F48!(0);
    for i in 0..investors_ais.len() {
        let mut investor_data = InvestorData::load_mut_checked(&investors_ais[i], program_id)?;
        assert!(investor_data.investment_status == 3 && investor_data.fund == *fund_pda_ai.key);
        let performance:I80F48 = fund_data.current_index.checked_div(investor_data.start_index).unwrap();
        let returns = I80F48::from_num(investor_data.amount).checked_mul(performance).unwrap();
        withdraw_amount = withdraw_amount.checked_add(returns).unwrap();
        investor_data.investment_status = 4;
        fund_data.no_of_settle_withdrawals = fund_data.no_of_settle_withdrawals.checked_add(1).unwrap();
    }
    Ok((withdraw_amount.checked_div(fund_data.total_amount).unwrap()))
}

pub fn get_perp_vals(
    share_ratio: I80F48,
    market_index: usize,
    mango_account_ai: &AccountInfo,
    mango_group_ai: &AccountInfo,
    mango_program_ai: &AccountInfo,
) -> Result<(Side, i64), ProgramError> {
    let mango_group = MangoGroup::load_checked(mango_group_ai, mango_program_ai.key)?;
    let mango_account =
        MangoAccount::load_checked(mango_account_ai, mango_program_ai.key, mango_group_ai.key)?;

    let a = mango_account.perp_accounts[market_index].base_position;
    msg!("base pos:: {:?}", a);
    let mut b: i64 = I80F48::to_num(
        I80F48::from_fixed(share_ratio)
            .checked_mul(I80F48::from_num(a))
            .unwrap(),
    );

    let mut side;
    let mut quantity;

    if a > 0 {
        side = Side::Ask;
        quantity = b;
    } else {
        side = Side::Bid;
        quantity = -b;
    }

    if b == a {
        Ok((side, quantity))
    } else {
        Ok((side, quantity + 1))
    }
}

pub fn get_spot_vals(
    share_ratio: I80F48,
    market_index: usize,
    mango_account_ai: &AccountInfo,
    mango_group_ai: &AccountInfo,
    mango_program_ai: &AccountInfo,
    mango_cache_ai: &AccountInfo,
    spot_market_ai: &AccountInfo,
    dex_program_ai: &AccountInfo,
) -> Result<(serum_dex::matching::Side, u64, u64), ProgramError> {
    let mango_group = MangoGroup::load_checked(mango_group_ai, mango_program_ai.key)?;
    let mango_account = MangoAccount::load_checked(mango_account_ai, mango_program_ai.key, mango_group_ai.key)?;
    let mango_cache = MangoCache::load_checked(mango_cache_ai, mango_program_ai.key, &mango_group)?;

    let market = MarketState::load(spot_market_ai, dex_program_ai.key, false)?;
    let a = mango_account.get_net(&mango_cache.root_bank_cache[market_index], market_index);

    msg!("spot {:?} :: {:?}", market_index, a);
    let mut b = share_ratio.checked_mul(a).unwrap();

    let mut side;
    let mut quantity;
    let mut price;

    if a > 0 {
        side = SerumSide::Ask;
        quantity = I80F48::to_num::<u64>(b).checked_div(market.coin_lot_size).unwrap();
        price = 1;
    } else {
        side = SerumSide::Bid;
        quantity = I80F48::to_num::<u64>(-b).checked_div(market.coin_lot_size).unwrap();
        price = u64::MAX;
    }

    if b == a {
        Ok((side, price, quantity))
    } else {
        Ok((side, price, quantity + 1))
    }
}

pub fn get_perp_index(
    mango_group_ai: &AccountInfo,
    mango_program_ai: &AccountInfo,
    perp_market_ai: &AccountInfo,
) -> Result<(usize), ProgramError> {
    let mango_group = MangoGroup::load_checked(mango_group_ai, mango_program_ai.key)?;
    Ok(mango_group.find_perp_market_index(perp_market_ai.key).unwrap())
    
}

pub fn get_spot_index(
    mango_group_ai: &AccountInfo,
    mango_program_ai: &AccountInfo,
    spot_market_ai: &AccountInfo,
) -> Result<(usize), ProgramError> {
    let mango_group = MangoGroup::load_checked(mango_group_ai, mango_program_ai.key)?;
    Ok(mango_group.find_spot_market_index(spot_market_ai.key).unwrap())
    
}


