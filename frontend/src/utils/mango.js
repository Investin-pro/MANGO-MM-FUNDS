import {
    getFeeRates,
    getFeeTier,
    Market,
    OpenOrders,
  } from '@project-serum/serum'
import { programId, TOKEN_PROGRAM_ID , MANGO_PROGRAM_ID_V2, SERUM_PROGRAM_ID_V3, MANGO_GROUP_ACCOUNT, priceStateAccount, CLOCK_PROGRAM_ID, MANGO_VAULT_ACCOUNT_USDC} from '../utils/constants';
import { nu64, struct, u8, u32, u16 } from 'buffer-layout';
import BN from 'bn.js';
import {
  NUM_MARKETS,
  NUM_TOKENS,
} from '@blockworks-foundation/mango-client/lib/layout'
import {
  IDS,
  MangoClient
} from '@blockworks-foundation/mango-client'
import {
  nativeToUi,
  uiToNative,
  zeroKey,
} from '@blockworks-foundation/mango-client/lib/utils'

import {
    PublicKey,
    SYSVAR_CLOCK_PUBKEY,
    SYSVAR_RENT_PUBKEY,
    TransactionInstruction,
  } from '@solana/web3.js'

import { createKeyIfNotExists, findAssociatedTokenAddress } from './web3';
import { INVESTOR_DATA } from '../utils/programLayouts';
import { MANGO_TOKENS } from './tokens';



export const calculateMarketPrice = (
  orderBook,
  size,
  side
) => {
  let acc = 0
  let selectedOrder
  for (const order of orderBook) {
    acc += order.size
    if (acc >= size) {
      selectedOrder = order
      break
    }
  }

  if (side === 'buy') {
    return selectedOrder.price * 1.05
  } else {
    return selectedOrder.price * 0.95
  }
}

export async function mangoOpenPosition(
  connection,

  marginAcc,
  fundPDA,
  wallet,

  mIndex,

  side,
  size,
  clientId,
  transaction,
  investor,
  seed
) {
  const client = new MangoClient()

  let serumMarket = new PublicKey(IDS.devnet.mango_groups.BTC_ETH_SOL_SRM_USDC.spot_market_pks[mIndex])
  console.log("serum market pk:: ", serumMarket)
  let marginAccount = await client.getMarginAccount(connection, marginAcc, SERUM_PROGRAM_ID_V3)
  let mangoGroup = await client.getMangoGroup(connection, MANGO_GROUP_ACCOUNT)
  console.log("mango group::", mangoGroup)

  console.log("margin acc::", marginAccount)
  // let mango_prices = await mangoGroup.getPrices(connection)

  console.log("collateral ratio:: ", await marginAccount.getCollateralRatio(mangoGroup, await mangoGroup.getPrices(connection)))
  console.log("assets:: ", await marginAccount.getAssets(mangoGroup))
  console.log("assetsVAl:: ", await marginAccount.getAssetsVal(mangoGroup, await mangoGroup.getPrices(connection)))

  console.log("liabs:: ", await marginAccount.getLiabs(mangoGroup))
  console.log("liabsVAl:: ", await marginAccount.getLiabsVal(mangoGroup, await mangoGroup.getPrices(connection)))

  let spotMarket = await Market.load(connection, serumMarket, {}, SERUM_PROGRAM_ID_V3)
  console.log("spot market:: ", spotMarket)
  console.log("margin acc:: ", marginAccount)

  let orderType = 'limit'
  let orderbook
  if (side === 'buy') {
    orderbook = await spotMarket.loadAsks(connection)
  }
  else {
    orderbook = await spotMarket.loadBids(connection)
  }
  console.log("orderbook", orderbook)
  let price = calculateMarketPrice(orderbook, size, side)
  console.log("price:: ", price)

  const limitPrice = spotMarket.priceNumberToLots(price)
  const maxBaseQuantity = spotMarket.baseSizeNumberToLots(size)

  console.log("price:: ", price)

  const feeTier = getFeeTier(
    0,
    nativeToUi(mangoGroup.nativeSrm || 0, 6)
  )
  const rates = getFeeRates(feeTier)
  console.log("rates:: ", rates)
  const maxQuoteQuantity = new BN(
    maxBaseQuantity
      .mul(limitPrice)
      .mul(spotMarket['_decoded'].quoteLotSize)
      .toNumber() *
    (1 + rates.taker)
  )

  console.log(maxBaseQuantity, maxQuoteQuantity.toString())

  if (maxBaseQuantity.lte(new BN(0))) {
    throw new Error('size too small')
  }
  if (limitPrice.lte(new BN(0))) {
    throw new Error('invalid price')
  }
  const selfTradeBehavior = 'decrementTake'
  const marketIndex = mangoGroup.getMarketIndex(spotMarket)
  const placeAmount = size * 10**mangoGroup.mintDecimals[marketIndex];

  console.log('place amount: ', placeAmount)

  // const vaultIndex = side === 'buy' ? mangoGroup.vaults.length - 1 : marketIndex


  // Specify signers in addition to the wallet
  const signers = []

  const dexSigner = await PublicKey.createProgramAddress(
    [
      spotMarket.publicKey.toBuffer(),
      spotMarket['_decoded'].vaultSignerNonce.toArrayLike(Buffer, 'le', 8),
    ],
    spotMarket.programId
  )
  console.log("dex signer:: ", dexSigner.toBase58())

  // Create a Solana account for the open orders account if it's missing
  const openOrdersKeys = []

  const openOrdersSpace = OpenOrders.getLayout(mangoGroup.dexProgramId).span
  const openOrdersLamports =
    await connection.getMinimumBalanceForRentExemption(
      openOrdersSpace,
      'singleGossip'
    )
  // const accInstr = await createKeyIfNotExists(
  //   wallet,
  //   "",
  //   mangoGroup.dexProgramId,
  //   "seed",
  //   openOrdersSpace,
  //   transaction
  // )
  // openOrdersKeys.push(accInstr)
  // openOrdersKeys.push(accInstr)
  // openOrdersKeys.push(accInstr)
  // openOrdersKeys.push(accInstr)

  for (let i = 0; i < marginAccount.openOrders.length; i++) {
    if (
      i === marketIndex &&
      marginAccount.openOrders[marketIndex].equals(zeroKey)
    ) {
      // open orders missing for this market; create a new one now
      const openOrdersSpace = OpenOrders.getLayout(mangoGroup.dexProgramId).span
      const openOrdersLamports =
        await connection.getMinimumBalanceForRentExemption(
          openOrdersSpace,
          'singleGossip'
        )
      const accInstr = await createKeyIfNotExists(
        wallet,
        "",
        mangoGroup.dexProgramId,
        seed + marketIndex.toString(),
        openOrdersSpace,
        transaction
      )
      openOrdersKeys.push(accInstr)
    } else {
      openOrdersKeys.push(marginAccount.openOrders[i])
    }
  }
  const fundBaseTokenAccount = await findAssociatedTokenAddress(fundPDA, new PublicKey(MANGO_TOKENS['USDC'].mintAddress));
  const dlout = struct([u8('instruction'), nu64('quantity')])
      const data = Buffer.alloc(dlout.span)
      dlout.encode(
        {
          instruction: 9,
          quantity: maxQuoteQuantity / (side == 'buy' ? 2 : 1)
        },
        data
      )
      let instruction = new TransactionInstruction({
        keys: [
          { isSigner: false, isWritable: true, pubkey:  fundPDA },
          { isSigner: true, isWritable: true, pubkey: wallet?.publicKey },
          { isSigner: false, isWritable: true, pubkey: MANGO_PROGRAM_ID_V2 },
          { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
          { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },

          {pubkey: fundBaseTokenAccount, isSigner: false, isWritable:true},
          {pubkey: MANGO_VAULT_ACCOUNT_USDC, isSigner: false, isWritable:true},
            
          {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable:true},
          {pubkey: CLOCK_PROGRAM_ID, isSigner: false, isWritable:true},
        ],
      programId,
      data
      });
    transaction.add(instruction)

  let keys1 = [
      { isSigner: false, isWritable: true, pubkey:   },
      { isSigner: true, isWritable: true, pubkey: wallet?.publicKey },
      { isSigner: false, isWritable: true, pubkey: fundPDA },
      { isSigner: false, isWritable: true, pubkey: MANGO_PROGRAM_ID_V2 },

      { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
      //   { isSigner: true, isWritable: false, pubkey: wallet.publicKey },
      { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },
      { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY },
      { isSigner: false, isWritable: false, pubkey: spotMarket.programId },
      { isSigner: false, isWritable: true, pubkey: spotMarket.publicKey },
      {
        isSigner: false,
        isWritable: true,
        pubkey: spotMarket['_decoded'].requestQueue,
      },
      {
        isSigner: false,
        isWritable: true,
        pubkey: spotMarket['_decoded'].eventQueue,
      },
      { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].bids },
      { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].asks },
      {
        isSigner: false,
        isWritable: true,
        pubkey: side == 'sell' ? mangoGroup.vaults[marketIndex] : mangoGroup.vaults[NUM_TOKENS - 1],
      },
      { isSigner: false, isWritable: false, pubkey: mangoGroup.signerKey },
      {
        isSigner: false,
        isWritable: true,
        pubkey: spotMarket['_decoded'].baseVault,
      },
      {
        isSigner: false,
        isWritable: true,
        pubkey: spotMarket['_decoded'].quoteVault,
      },
      { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
      { isSigner: false, isWritable: false, pubkey: SYSVAR_RENT_PUBKEY },
      { isSigner: false, isWritable: true, pubkey: mangoGroup.srmVault },
      //{ isSigner: false, isWritable: false, pubkey: dexSigner },
      ...openOrdersKeys.map((pubkey) => ({
        isSigner: false,
        isWritable: true,
        pubkey,
      })),
      ...mangoGroup.oracles.map((pubkey) => ({
        isSigner: false,
        isWritable: false,
        pubkey,
      })),
    ]

  const dataLay = struct([
      u8('instruction'),
      u8('side'),
      nu64('price'),
      nu64('trade_size')
  ])
  const da = Buffer.alloc(dataLay.span)
  dataLay.encode(
      {
        instruction: 10,
        side: (side == 'buy') ? 0 : 1,
        price: limitPrice,
        trade_size: placeAmount
      },
      da
  )

  const placeAndSettleInstruction = new TransactionInstruction({
    keys: keys1,
    data: da,
    programId: programId,
  })
  transaction.add(placeAndSettleInstruction)

  // const baseTokenIndex = marketIndex;
  // const quoteTokenIndex = NUM_TOKENS - 1;
  // const tokenIndex = side === 'buy' ? baseTokenIndex : quoteTokenIndex;
  // const quantity = marginAccount.getUiBorrow(mangoGroup, tokenIndex);
  // const nativeQuantity = uiToNative(quantity, mangoGroup.mintDecimals[tokenIndex]);

  const settle_keys = [
    { isSigner: false, isWritable: true, pubkey: fundPDA },
    { isSigner: true, isWritable: true, pubkey: wallet?.publicKey },
    { isSigner: false, isWritable: true, pubkey: MANGO_PROGRAM_ID_V2 },

    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
    { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY },
    { isSigner: false, isWritable: false, pubkey: spotMarket.programId },
    { isSigner: false, isWritable: true, pubkey: spotMarket.publicKey },
    { isSigner: false, isWritable: true, pubkey: openOrdersKeys[marketIndex] },
    { isSigner: false, isWritable: false, pubkey: mangoGroup.signerKey },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].baseVault,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].quoteVault,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: mangoGroup.vaults[marketIndex],
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: mangoGroup.vaults[NUM_MARKETS],
    },
    { isSigner: false, isWritable: false, pubkey: dexSigner },
    { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
    ...openOrdersKeys.map((pubkey) => ({
      isSigner: false,
      isWritable: true,
      pubkey,
    })),
    ...mangoGroup.oracles.map((pubkey) => ({
      isSigner: false,
      isWritable: false,
      pubkey,
    })),
  ];

  const datLayout = struct([u8('instruction')])


      const dat = Buffer.alloc(datLayout.span)
      datLayout.encode(
        {
          instruction: 11,
        },
        dat
      )
      const SettleInstruction = new TransactionInstruction({
        keys: settle_keys,
        data: dat,
        programId: programId,
      })
      console.log("settle intr")
 transaction.add(SettleInstruction)
}

export async function mangoClosePosition(
  connection,

  marginAcc,
  fundPDA,
  wallet,

  mIndex,

  side,
  size,
  clientId,
  transaction,
  investor_accs,
  seed
) {

  let serumMarket = new PublicKey(IDS.devnet.mango_groups.BTC_ETH_SOL_SRM_USDC.spot_market_pks[mIndex])

  const client = new MangoClient()

  let marginAccount = await client.getMarginAccount(connection, marginAcc, SERUM_PROGRAM_ID_V3)
  let mangoGroup = await client.getMangoGroup(connection, MANGO_GROUP_ACCOUNT)
  console.log("mango group::", mangoGroup)

  console.log("assets:: ", await marginAccount.getAssets(mangoGroup))
  console.log("assetsVAl:: ", await marginAccount.getAssetsVal(mangoGroup, await mangoGroup.getPrices(connection)))

  console.log("liabs:: ", await marginAccount.getLiabs(mangoGroup))
  console.log("liabsVAl:: ", await marginAccount.getLiabsVal(mangoGroup, await mangoGroup.getPrices(connection)))

  console.log("margin acc::", marginAccount)

  let spotMarket = await Market.load(connection, serumMarket, {}, SERUM_PROGRAM_ID_V3)
  console.log("spot market:: ", spotMarket)
  console.log("margin acc:: ", marginAccount)

  let orderType = 'limit'
  let orderbook
  if (side === 'buy') {
    orderbook = await spotMarket.loadAsks(connection)
  }
  else {
    orderbook = await spotMarket.loadBids(connection)
  }
  console.log("orderbook", orderbook)
  let price = calculateMarketPrice(orderbook, size, side)
  console.log("price:: ", price)

  const limitPrice = spotMarket.priceNumberToLots(price)
  const maxBaseQuantity = spotMarket.baseSizeNumberToLots(size)

  console.log("price:: ", limitPrice)

  const feeTier = getFeeTier(
    0,
    nativeToUi(mangoGroup.nativeSrm || 0, 6)
  )
  const rates = getFeeRates(feeTier)
  console.log("rates:: ", rates)
  const maxQuoteQuantity = new BN(
    maxBaseQuantity
      .mul(limitPrice)
      .mul(spotMarket['_decoded'].quoteLotSize)
      .toNumber() *
    (1 + rates.taker)
  )
  const depositQuantity = spotMarket.quoteSizeLotsToNumber(maxQuoteQuantity)
  const depositAmount = depositQuantity * 10**MANGO_TOKENS['USDC'].decimals
  const placeAmount = size * 10**MANGO_TOKENS['BTC'].decimals

  console.log('deposit qty::', depositQuantity.toString())

  console.log('deposit amount::', depositAmount)
  console.log('place amoutn: ', placeAmount)

  console.log(maxBaseQuantity, maxQuoteQuantity.toString())

  if (maxBaseQuantity.lte(new BN(0))) {
    throw new Error('size too small')
  }
  if (limitPrice.lte(new BN(0))) {
    throw new Error('invalid price')
  }
  const selfTradeBehavior = 'decrementTake'
  const marketIndex = mangoGroup.getMarketIndex(spotMarket)
  // const vaultIndex = side === 'buy' ? mangoGroup.vaults.length - 1 : marketIndex


  // Specify signers in addition to the wallet
  const signers = []

  const dexSigner = await PublicKey.createProgramAddress(
    [
      spotMarket.publicKey.toBuffer(),
      spotMarket['_decoded'].vaultSignerNonce.toArrayLike(Buffer, 'le', 8),
    ],
    spotMarket.programId
  )

  // Create a Solana account for the open orders account if it's missing
  const openOrdersKeys = []

  const openOrdersSpace = OpenOrders.getLayout(mangoGroup.dexProgramId).span
  const openOrdersLamports =
    await connection.getMinimumBalanceForRentExemption(
      openOrdersSpace,
      'singleGossip'
    )
  // const accInstr = await createKeyIfNotExists(
  //   wallet,
  //   "",
  //   mangoGroup.dexProgramId,
  //   "seed",
  //   openOrdersSpace,
  //   transaction
  // )
  // openOrdersKeys.push(accInstr)
  // openOrdersKeys.push(accInstr)
  // openOrdersKeys.push(accInstr)
  // openOrdersKeys.push(accInstr)

  for (let i = 0; i < marginAccount.openOrders.length; i++) {
    if (
      i === marketIndex &&
      marginAccount.openOrders[marketIndex].equals(zeroKey)
    ) {

      console.log("open orders :: ", marginAccount.openOrders[marketIndex])
      console.log("market index:: ", marketIndex)
      // open orders missing for this market; create a new one now
      const openOrdersSpace = OpenOrders.getLayout(mangoGroup.dexProgramId).span
      const openOrdersLamports =
        await connection.getMinimumBalanceForRentExemption(
          openOrdersSpace,
          'singleGossip'
        )
      const accInstr = await createKeyIfNotExists(
        wallet,
        "",
        mangoGroup.dexProgramId,
        seed + marketIndex.toString(),
        openOrdersSpace,
        transaction
      )
      openOrdersKeys.push(accInstr)
    } else {
      openOrdersKeys.push(marginAccount.openOrders[i])
    }
  }
  const fundBaseTokenAccount = await findAssociatedTokenAddress(fundPDA, new PublicKey(MANGO_TOKENS['USDC'].mintAddress));
  let keys1 = [
    { isSigner: false, isWritable: true, pubkey: fundPDA },
    { isSigner: true, isWritable: true, pubkey: wallet?.publicKey },
    { isSigner: false, isWritable: true, pubkey: MANGO_PROGRAM_ID_V2 },

    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
    //   { isSigner: true, isWritable: false, pubkey: wallet.publicKey },
    { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY },
    { isSigner: false, isWritable: false, pubkey: spotMarket.programId },
    { isSigner: false, isWritable: true, pubkey: spotMarket.publicKey },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].requestQueue,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].eventQueue,
    },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].bids },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].asks },
    {
      isSigner: false,
      isWritable: true,
      pubkey: side == 'sell' ? mangoGroup.vaults[marketIndex] : mangoGroup.vaults[NUM_TOKENS - 1],
    },
    { isSigner: false, isWritable: false, pubkey: mangoGroup.signerKey },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].baseVault,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].quoteVault,
    },
    { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_RENT_PUBKEY },
    { isSigner: false, isWritable: true, pubkey: mangoGroup.srmVault },
    //{ isSigner: false, isWritable: false, pubkey: dexSigner },
    ...openOrdersKeys.map((pubkey) => ({
      isSigner: false,
      isWritable: true,
      pubkey,
    })),
    ...mangoGroup.oracles.map((pubkey) => ({
      isSigner: false,
      isWritable: false,
      pubkey,
    })),
  ]

const dataLay = struct([
    u8('instruction'),
    nu64('price'),
])
const da = Buffer.alloc(dataLay.span)
dataLay.encode(
    {
      instruction: 12,
      price: limitPrice,
    },
    da
)

const placeAndSettleInstruction = new TransactionInstruction({
  keys: keys1,
  data: da,
  programId: programId,
})
transaction.add(placeAndSettleInstruction)
  const settle_keys = [
    { isSigner: false, isWritable: true, pubkey: fundPDA },
    { isSigner: true, isWritable: true, pubkey: wallet?.publicKey },
    { isSigner: false, isWritable: true, pubkey: MANGO_PROGRAM_ID_V2 },

    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
    { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY },
    { isSigner: false, isWritable: false, pubkey: spotMarket.programId },
    { isSigner: false, isWritable: true, pubkey: spotMarket.publicKey },
    { isSigner: false, isWritable: true, pubkey: openOrdersKeys[marketIndex] },
    { isSigner: false, isWritable: false, pubkey: mangoGroup.signerKey },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].baseVault,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].quoteVault,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: mangoGroup.vaults[marketIndex],
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: mangoGroup.vaults[NUM_MARKETS],
    },
    { isSigner: false, isWritable: false, pubkey: dexSigner },
    { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
    ...openOrdersKeys.map((pubkey) => ({
      isSigner: false,
      isWritable: true,
      pubkey,
    })),
    ...mangoGroup.oracles.map((pubkey) => ({
      isSigner: false,
      isWritable: false,
      pubkey,
    })),
  ];

  const datLayout = struct([u8('instruction')])


      const dat = Buffer.alloc(datLayout.span)
      datLayout.encode(
        {
          instruction: 11,
        },
        dat
      )
      const SettleInstruction = new TransactionInstruction({
        keys: settle_keys,
        data: dat,
        programId: programId,
      })
      console.log("settle intr")
  transaction.add(SettleInstruction)

   const withdraw_keys = [

     { isSigner: false, isWritable: true, pubkey: fundPDA },
    { isSigner: true, isWritable: true, pubkey: wallet?.publicKey },
    { isSigner: false, isWritable: true, pubkey: MANGO_PROGRAM_ID_V2 },

  { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
//   { isSigner: true, isWritable: false, pubkey: wallet.publicKey },
  { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },

  { isSigner: false, isWritable: true, pubkey: fundBaseTokenAccount },
  { isSigner: false, isWritable: true, pubkey: mangoGroup.vaults[NUM_MARKETS] },
  { isSigner: false, isWritable: false, pubkey: mangoGroup.signerKey },

  { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
  { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY },
 
  ...openOrdersKeys.map((pubkey) => ({
    isSigner: false,
    isWritable: true,
    pubkey,
  })),
  ...mangoGroup.oracles.map((pubkey) => ({
    isSigner: false,
    isWritable: false,
    pubkey,
  })),
  { isSigner: false, isWritable: true, pubkey: investor_accs },
  { isSigner: false, isWritable: false, pubkey: PublicKey.default },

]

  const dataL = struct([u8('instruction')])
      const data2 = Buffer.alloc(dataL.span)
      dataL.encode(
        {
          instruction: 13,
        },
        data2
      )
      const instr = new TransactionInstruction({
        keys: withdraw_keys,
        data: data2,
        programId: programId,
      })
      transaction.add(instr)
}

export async function mangoWithdrawInvestor(
  connection,

  marginAcc,
  invStateAccount,
  fundPDA,
  wallet,

  mIndex,

  side,
  size,
  clientId,
  transaction,
) {

  let serumMarket = new PublicKey(IDS.devnet.mango_groups.BTC_ETH_SOL_SRM_USDC.spot_market_pks[mIndex])

  const client = new MangoClient()

  let marginAccount = await client.getMarginAccount(connection, marginAcc, SERUM_PROGRAM_ID_V3)
  let mangoGroup = await client.getMangoGroup(connection, MANGO_GROUP_ACCOUNT)
  console.log("mango group::", mangoGroup)

  console.log("margin acc::", marginAccount)
  

  let spotMarket = await Market.load(connection, serumMarket, {}, SERUM_PROGRAM_ID_V3)
  console.log("spot market:: ", spotMarket)
  console.log("margin acc:: ", marginAccount)

  let orderType = 'limit'
  let orderbook
  if (side === 'buy') {
    size = marginAccount.getLiabs(mangoGroup)[mIndex]
    orderbook = await spotMarket.loadBids(connection)
  }
  else {
    size = marginAccount.getAssets(mangoGroup)[mIndex]
    orderbook = await spotMarket.loadAsks(connection)
  }
  console.log("orderbook", orderbook)
  let price = calculateMarketPrice(orderbook, size, side)
  console.log("price:: ", price)
  console.log("size:: ", size)


  const limitPrice = spotMarket.priceNumberToLots(price)
  const maxBaseQuantity = spotMarket.baseSizeNumberToLots(size)

  console.log("price:: ", limitPrice)

  const feeTier = getFeeTier(
    0,
    nativeToUi(mangoGroup.nativeSrm || 0, 6)
  )
  const rates = getFeeRates(feeTier)
  console.log("rates:: ", rates)
  const maxQuoteQuantity = new BN(
    maxBaseQuantity
      .mul(limitPrice)
      .mul(spotMarket['_decoded'].quoteLotSize)
      .toNumber() *
    (1 + rates.taker)
  )
  const depositQuantity = spotMarket.quoteSizeLotsToNumber(maxQuoteQuantity)
  const depositAmount = depositQuantity * 10**MANGO_TOKENS['USDC'].decimals
  const placeAmount = size * 10**MANGO_TOKENS['BTC'].decimals

  console.log('deposit qty::', depositQuantity.toString())

  console.log('deposit amount::', depositAmount)
  console.log('place amoutn: ', placeAmount)

  console.log(maxBaseQuantity, maxQuoteQuantity.toString())

  if (maxBaseQuantity.lte(new BN(0))) {
    throw new Error('size too small')
  }
  if (limitPrice.lte(new BN(0))) {
    throw new Error('invalid price')
  }
  const selfTradeBehavior = 'decrementTake'
  const marketIndex = mangoGroup.getMarketIndex(spotMarket)
  // const vaultIndex = side === 'buy' ? mangoGroup.vaults.length - 1 : marketIndex


  // Specify signers in addition to the wallet
  const signers = []

  const dexSigner = await PublicKey.createProgramAddress(
    [
      spotMarket.publicKey.toBuffer(),
      spotMarket['_decoded'].vaultSignerNonce.toArrayLike(Buffer, 'le', 8),
    ],
    spotMarket.programId
  )

  // Create a Solana account for the open orders account if it's missing
  const openOrdersKeys = []

  const openOrdersSpace = OpenOrders.getLayout(mangoGroup.dexProgramId).span
  const openOrdersLamports =
    await connection.getMinimumBalanceForRentExemption(
      openOrdersSpace,
      'singleGossip'
    )

  for (let i = 0; i < marginAccount.openOrders.length; i++) {
    if (
      i === marketIndex &&
      marginAccount.openOrders[marketIndex].equals(zeroKey)
    ) {
      // open orders missing for this market; create a new one now
      const openOrdersSpace = OpenOrders.getLayout(mangoGroup.dexProgramId).span
      const openOrdersLamports =
        await connection.getMinimumBalanceForRentExemption(
          openOrdersSpace,
          'singleGossip'
        )
      const accInstr = await createKeyIfNotExists(
        wallet,
        "",
        mangoGroup.dexProgramId,
        "seed2",
        openOrdersSpace,
        transaction
      )
      openOrdersKeys.push(accInstr)
    } else {
      openOrdersKeys.push(marginAccount.openOrders[i])
    }
  }
  const invBaseTokenAccount = await findAssociatedTokenAddress(wallet?.publicKey, new PublicKey(MANGO_TOKENS['USDC'].mintAddress));
  let keys1 = [
    { isSigner: false, isWritable: true, pubkey: fundPDA },
    { isSigner: false, isWritable: true, pubkey: invStateAccount },
    { isSigner: true, isWritable: true, pubkey: wallet?.publicKey },
    { isSigner: false, isWritable: true, pubkey: MANGO_PROGRAM_ID_V2 },

    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
    //   { isSigner: true, isWritable: false, pubkey: wallet.publicKey },
    { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY },
    { isSigner: false, isWritable: false, pubkey: spotMarket.programId },
    { isSigner: false, isWritable: true, pubkey: spotMarket.publicKey },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].requestQueue,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].eventQueue,
    },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].bids },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].asks },
    {
      isSigner: false,
      isWritable: true,
      pubkey: side == 'sell' ? mangoGroup.vaults[marketIndex] : mangoGroup.vaults[NUM_TOKENS - 1],
    },
    { isSigner: false, isWritable: false, pubkey: mangoGroup.signerKey },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].baseVault,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].quoteVault,
    },
    { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_RENT_PUBKEY },
    { isSigner: false, isWritable: true, pubkey: mangoGroup.srmVault },
    //{ isSigner: false, isWritable: false, pubkey: dexSigner },
    ...openOrdersKeys.map((pubkey) => ({
      isSigner: false,
      isWritable: true,
      pubkey,
    })),
    ...mangoGroup.oracles.map((pubkey) => ({
      isSigner: false,
      isWritable: false,
      pubkey,
    })),
  ]

const dataLay = struct([
    u8('instruction'),
    nu64('price'),
])
const da = Buffer.alloc(dataLay.span)
dataLay.encode(
    {
      instruction: 15,
      price: limitPrice,
    },
    da
)

const placeAndSettleInstruction = new TransactionInstruction({
  keys: keys1,
  data: da,
  programId: programId,
})
transaction.add(placeAndSettleInstruction)
  const settle_keys = [
    { isSigner: false, isWritable: true, pubkey: fundPDA },
    { isSigner: false, isWritable: true, pubkey: invStateAccount },

    { isSigner: true, isWritable: true, pubkey: wallet?.publicKey },
    { isSigner: false, isWritable: true, pubkey: MANGO_PROGRAM_ID_V2 },

    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
    { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY },
    { isSigner: false, isWritable: false, pubkey: spotMarket.programId },
    { isSigner: false, isWritable: true, pubkey: spotMarket.publicKey },
    { isSigner: false, isWritable: true, pubkey: openOrdersKeys[marketIndex] },
    { isSigner: false, isWritable: false, pubkey: mangoGroup.signerKey },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].baseVault,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: spotMarket['_decoded'].quoteVault,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: mangoGroup.vaults[marketIndex],
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: mangoGroup.vaults[NUM_MARKETS],
    },
    { isSigner: false, isWritable: false, pubkey: dexSigner },
    { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
    { isSigner: false, isWritable: true, pubkey: mangoGroup.oracles[marketIndex] },

  ];

  const datLayout = struct([u8('instruction')])


      const dat = Buffer.alloc(datLayout.span)
      datLayout.encode(
        {
          instruction: 16,
        },
        dat
      )
      const SettleInstruction = new TransactionInstruction({
        keys: settle_keys,
        data: dat,
        programId: programId,
      })
      console.log("settle intr")
  transaction.add(SettleInstruction)

   const withdraw_keys = [
     { isSigner: false, isWritable: true, pubkey: fundPDA },
    { isSigner: false, isWritable: true, pubkey: invStateAccount },


    { isSigner: true, isWritable: true, pubkey: wallet?.publicKey },
    { isSigner: false, isWritable: true, pubkey: MANGO_PROGRAM_ID_V2 },

  { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
//   { isSigner: true, isWritable: false, pubkey: wallet.publicKey },
  { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },

  { isSigner: false, isWritable: true, pubkey: invBaseTokenAccount },
  { isSigner: false, isWritable: true, pubkey: mangoGroup.vaults[NUM_MARKETS] },
  { isSigner: false, isWritable: false, pubkey: mangoGroup.signerKey },

  { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
  { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY },
 
  ...openOrdersKeys.map((pubkey) => ({
    isSigner: false,
    isWritable: true,
    pubkey,
  })),
  ...mangoGroup.oracles.map((pubkey) => ({
    isSigner: false,
    isWritable: false,
    pubkey,
  })),

]

  const dataL = struct([u8('instruction')])
      const data2 = Buffer.alloc(dataL.span)
      dataL.encode(
        {
          instruction: 14,
        },
        data2
      )
      const instr = new TransactionInstruction({
        keys: withdraw_keys,
        data: data2,
        programId: programId,
      })
      transaction.add(instr)
}