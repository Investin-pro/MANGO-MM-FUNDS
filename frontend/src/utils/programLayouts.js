import { Blob, seq, struct, u32, u8, u16, ns64 } from 'buffer-layout';
import { PublicKey } from '@solana/web3.js';
import { I80F48Layout } from '@blockworks-foundation/mango-client';
import BN from 'bn.js';


class PublicKeyLayout extends Blob {
  constructor(property) {
    super(32, property);
  }

  decode(b, offset) {
    return new PublicKey(super.decode(b, offset));
  }

  encode(src, b, offset) {
    return super.encode(src.toBuffer(), b, offset);
  }
}

export function publicKeyLayout(property = "") {
  return new PublicKeyLayout(property);
}

class BNLayout extends Blob {
  constructor(number, property) {
    super(number, property);
    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype)
  }

  decode(b, offset) {
    return new BN(super.decode(b, offset), 10, 'le');
  }

  encode(src, b, offset) {
    return super.encode(src.toArrayLike(Buffer, 'le', this['span']), b, offset);
  }
}

class U64F64Layout extends Blob {
  constructor(property) {
    super(16, property);
  }

  decode(b, offset) {
    const raw = new BN(super.decode(b, offset), 10, 'le');

    return raw / Math.pow(2, 64);
  }

  encode(src, b, offset) {
    console.log("src ::: ", src)
    return super.encode(src.toArrayLike(Buffer, 'le', this['span']), b, offset);
  }
}

export function U64F64(property = "") {
  return new U64F64Layout(property)
}

export function I80F48(property = "") {
  return new I80F48Layout(property)
}

export function u64(property = "") {
  return new BNLayout(8, property);
}

export function u128(property = "") {
  return new BNLayout(16, property);
}


export function i64(property = '') {
  return new BNLayout(8, property, true);
}

export const FUND_DATA = struct([
  u8('is_initialized'),
  u8('signer_nonce'),
  u8('block_deposits'),
  u8('paused_for_settlement'),
  u32('no_of_investments'),
  u32('no_of_pending_withdrawals'),
  u32('no_of_settle_withdrawals'),

  u64('min_amount'),
  I80F48('performance_fee_percentage'),
  I80F48('total_amount'),
  I80F48('performance_fee'),
  I80F48('current_index'),

  u64('pending_deposits'),
  u64('pending_withdrawals'),

  publicKeyLayout('manager_account'),
  publicKeyLayout('usdc_vault_key'),
  publicKeyLayout('mango_account'),
  publicKeyLayout('delegate'),
  seq(
    struct([
    I80F48('share'),
    u8('ready_for_settlement'),
    seq(u8('spot'), 15, 'spot'),
    seq(u8('perp'), 15, 'perp'),
    u8('padding'),
    I80F48('penalty'),

  ]), 1, 'forceSettleData'),
  I80F48('lockup'),
  seq(u8('padding'), 144, 'padding'),


])

export const INVESTOR_DATA = struct([
  u8('is_initialized'),
  u8('investment_status'),
  seq(u8('padding'), 6),

  u64('amount'),
  I80F48('start_index'),
  u64('returns'),
  publicKeyLayout('owner'),
  publicKeyLayout('fund'),
  seq(u8('extra_padding'), 160),

])

export const OLD_INVESTOR_DATA = struct([
  u8('is_initialized'),
  u8('has_withdrawn'),
  u8('withdrawn_from_margin'),
  seq(u8('padding'), 5),


  publicKeyLayout('owner'),
  u64('amount'),
  U64F64('start_performance'),
  u64('amount_in_router'),
  publicKeyLayout('manager'),
  seq(U64F64(), 2, 'margin_debt'),
  seq(u64(), 2, 'margin_position_id'),

  seq(u8(), 8, 'token_indexes'),
  seq(u64(), 8, 'token_debts'),
  U64F64('share'),
  u64('frikuld'),
  u64('frikfcd'),


])

export const OLD_FUND_DATA = struct([
  u8('is_initialized'),
  u8('number_of_active_investments'),
  u8('no_of_investments'),
  u8('signer_nonce'),
  u8('no_of_margin_positions'),
  u8('no_of_assets'),
  u16('position_count'),

  u8('version'),
  u8('is_private'),
  u16('fund_v3_index'),
  seq(u8(), 4, 'padding'),

  u64('min_amount'),
  U64F64('min_return'),
  U64F64('performance_fee_percentage'),
  U64F64('total_amount'),
  U64F64('prev_performance'),

  u64('amount_in_router'),
  U64F64('performance_fee'),
  publicKeyLayout('manager_account'),
  publicKeyLayout('fund_pda'),
  seq(
    struct([
      u8('is_active'),
      seq(u8(),3,'index'),
      u8('mux'),
      u8('is_on_mango'),
      seq(u8(), 2, 'padding'),
      u64('balance'),
      u64('debt'),
      publicKeyLayout('vault')
    ]),
    8, 'tokens'
  ),
  seq(publicKeyLayout(), 10, 'investors'),
  
  struct([
      publicKeyLayout('mango_account'),
      seq(u8(),4,'perp_markets'),
      u8('deposit_index'),
      u8('markets_active'),
      u8('deposits_active'),
      u8('xpadding'),
      seq(u64(), 2, 'investor_debts'),
      seq(u8('padding'), 24),
    ],'mango_positions'),

  // mangoInfoLayout('mango_positions'),
  
     
  seq(u8(), 80, 'margin_update_padding'),
  seq(u8(), 32, 'padding'),

])



export const AMM_INFO_LAYOUT_V4 = struct([
  u64('status'),
  u64('nonce'),
  u64('orderNum'),
  u64('depth'),
  u64('coinDecimals'),
  u64('pcDecimals'),
  u64('state'),
  u64('resetFlag'),
  u64('minSize'),
  u64('volMaxCutRatio'),
  u64('amountWaveRatio'),
  u64('coinLotSize'),
  u64('pcLotSize'),
  u64('minPriceMultiplier'),
  u64('maxPriceMultiplier'),
  u64('systemDecimalsValue'),
  // Fees
  u64('minSeparateNumerator'),
  u64('minSeparateDenominator'),
  u64('tradeFeeNumerator'),
  u64('tradeFeeDenominator'),
  u64('pnlNumerator'),
  u64('pnlDenominator'),
  u64('swapFeeNumerator'),
  u64('swapFeeDenominator'),
  // OutPutData
  u64('needTakePnlCoin'),
  u64('needTakePnlPc'),
  u64('totalPnlPc'),
  u64('totalPnlCoin'),
  u128('poolTotalDepositPc'),
  u128('poolTotalDepositCoin'),
  u128('swapCoinInAmount'),
  u128('swapPcOutAmount'),
  u64('swapCoin2PcFee'),
  u128('swapPcInAmount'),
  u128('swapCoinOutAmount'),
  u64('swapPc2CoinFee'),

  publicKeyLayout('poolCoinTokenAccount'),
  publicKeyLayout('poolPcTokenAccount'),
  publicKeyLayout('coinMintAddress'),
  publicKeyLayout('pcMintAddress'),
  publicKeyLayout('lpMintAddress'),
  publicKeyLayout('ammOpenOrders'),
  publicKeyLayout('serumMarket'),
  publicKeyLayout('serumProgramId'),
  publicKeyLayout('ammTargetOrders'),
  publicKeyLayout('poolWithdrawQueue'),
  publicKeyLayout('poolTempLpTokenAccount'),
  publicKeyLayout('ammOwner'),
  publicKeyLayout('pnlOwner')
])