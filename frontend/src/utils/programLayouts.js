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
  ]), 1, 'forceSettleData'),

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