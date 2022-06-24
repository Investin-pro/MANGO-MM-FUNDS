import { PublicKey, SYSVAR_CLOCK_PUBKEY, Transaction, TransactionInstruction } from '@solana/web3.js';
import React, { useState } from 'react'
import { GlobalState } from '../store/globalState';
import { adminAccount, connection, FUND_ACCOUNT_KEY, MANGO_GROUP_ACCOUNT, platformStateAccount, priceStateAccount, programId, TOKEN_PROGRAM_ID } from '../utils/constants';
import { nu64, struct, u8 } from 'buffer-layout';
import { createKeyIfNotExists, findAssociatedTokenAddress, setWalletTransaction, signAndSendTransaction, createAssociatedTokenAccountIfNotExist } from '../utils/web3';
import { FUND_DATA, INVESTOR_DATA, PLATFORM_DATA, PRICE_DATA } from '../utils/programLayouts';
import { devnet_pools, pools } from '../utils/pools'
import { MANGO_TOKENS } from '../utils/tokens'
import { updatePoolPrices } from './updatePrices';
import {
  MangoClient, MangoGroupLayout, MarginAccountLayout
} from '@blockworks-foundation/mango-client'

export const Transfer = () => {

  const [fundPDA, setFundPDA] = useState('')
  const [amountInRouter, setAmountInRouter] = useState(0);
  const [fundPerf, setFundPerf] = useState(0);
  const [fundAUM, setFundAUM] = useState(0);
  const [fundBalances, setFundBalances] = useState([])
  const [fundInvestorAccs, setFundInvestorAccs] = useState([])


  const walletProvider = GlobalState.useState(s => s.walletProvider);

  const handleTransfer = async () => {

    const key = walletProvider?.publicKey;

    if (!key) {
      alert("connect wallet")
      return;
    };
    const transaction = new Transaction()

    const routerPDA = await PublicKey.findProgramAddress([Buffer.from("router")], programId);
    const fundBaseTokenAccount = await findAssociatedTokenAddress(new PublicKey(fundPDA), new PublicKey(MANGO_TOKENS['USDC'].mintAddress));
    const routerBaseTokenAccount = await findAssociatedTokenAddress(routerPDA[0], new PublicKey(MANGO_TOKENS['USDC'].mintAddress));

    const managerBaseTokenAccount = await createAssociatedTokenAccountIfNotExist(walletProvider, new PublicKey(MANGO_TOKENS['USDC'].mintAddress), key, transaction);
    const investinBaseTokenAccount = await createAssociatedTokenAccountIfNotExist(walletProvider, new PublicKey(MANGO_TOKENS['USDC'].mintAddress), adminAccount, transaction);

    if ( fundPDA == '') {
      alert("get info first!")
      return
    }
    const client = new MangoClient()


    const accountInfo = await connection.getAccountInfo(new PublicKey( fundPDA));
    const fund_data = FUND_DATA.decode(accountInfo.data);

    let margin_account_1 = fund_data.mango_positions[0].margin_account;
    let margin_account_2 = fund_data.mango_positions[1].margin_account;

    let open_orders_1 = PublicKey.default
    let oracle_acc_1 = PublicKey.default
    let is_active = false
    if (margin_account_1 != PublicKey.default && fund_data.mango_positions[0].state != 0) {
      let margin_info = await connection.getAccountInfo(margin_account_1)
      let margin_data = MarginAccountLayout.decode(margin_info.data)
      let mango_info = await connection.getAccountInfo(MANGO_GROUP_ACCOUNT)
      let mango_data = MangoGroupLayout.decode(mango_info.data)

      let index = fund_data.mango_positions[0].margin_index
      open_orders_1 = margin_data.openOrders[index]
      oracle_acc_1 = mango_data.oracles[index]
    }
    let open_orders_2 = PublicKey.default
    let oracle_acc_2 = PublicKey.default
    if (margin_account_2 != PublicKey.default && fund_data.mango_positions[1].state != 0) {
      let margin_info = await connection.getAccountInfo(margin_account_2)
      let margin_data = MarginAccountLayout.decode(margin_info.data)
      let mango_info = await connection.getAccountInfo(MANGO_GROUP_ACCOUNT)
      let mango_data = MangoGroupLayout.decode(mango_info.data)

      let index = fund_data.mango_positions[1].margin_index
      open_orders_2 = margin_data.openOrders[index]
      oracle_acc_2 = mango_data.oracles[index]
    }

    let platData = await connection.getAccountInfo(platformStateAccount)
    let plat_info = PLATFORM_DATA.decode(platData.data)
    console.log("plat info:: ", plat_info)

    updatePoolPrices(transaction, devnet_pools)
    // transaction1.feePayer = walletProvider?.publicKey;
    // let hash1 = await connection.getRecentBlockhash();
    // console.log("blockhash", hash1);
    // transaction1.recentBlockhash = hash1.blockhash;

    // const sign1 = await signAndSendTransaction(walletProvider, transaction1);
    // console.log("signature tx:: ", sign1)

    const dataLayout = struct([u8('instruction')])

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 2,
      },
      data
    )
    const transfer_instruction = new TransactionInstruction({
      keys: [
        { pubkey: platformStateAccount, isSigner: false, isWritable: true },
        { pubkey: new PublicKey( fundPDA), isSigner: false, isWritable: true },

        { pubkey: MANGO_GROUP_ACCOUNT, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: true },
        { pubkey: key, isSigner: true, isWritable: true },

        { pubkey: routerBaseTokenAccount, isSigner: false, isWritable: true },
        { pubkey: fundBaseTokenAccount, isSigner: false, isWritable: true },
        { pubkey: managerBaseTokenAccount, isSigner: false, isWritable: true },
        { pubkey: plat_info.investin_vault, isSigner: false, isWritable: true },

        { pubkey: routerPDA[0], isSigner: false, isWritable: true },

        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: true },

        { pubkey: margin_account_1, isSigner: false, isWritable: true },
        { pubkey: margin_account_2, isSigner: false, isWritable: true },
        { pubkey: open_orders_1, isSigner: false, isWritable: true },
        { pubkey: open_orders_2, isSigner: false, isWritable: true },
        { pubkey: oracle_acc_1, isSigner: false, isWritable: true },
        { pubkey: oracle_acc_2, isSigner: false, isWritable: true },


        //investor state accounts
        { pubkey: new PublicKey(fundInvestorAccs[0]), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(fundInvestorAccs[1]), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(fundInvestorAccs[2]), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(fundInvestorAccs[3]), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(fundInvestorAccs[4]), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(fundInvestorAccs[5]), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(fundInvestorAccs[6]), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(fundInvestorAccs[7]), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(fundInvestorAccs[8]), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(fundInvestorAccs[9]), isSigner: false, isWritable: true },

      ],
      programId,
      data
    });

    transaction.add(transfer_instruction);
    transaction.feePayer = key;
    let hash = await connection.getRecentBlockhash();
    console.log("blockhash", hash);
    transaction.recentBlockhash = hash.blockhash;

    const sign = await signAndSendTransaction(walletProvider, transaction);
    console.log("signature tx:: ", sign)

  }

  const handleGetFunds = async () => {

    console.log("size of plat data:: ", PLATFORM_DATA.span)
    console.log("size of fund dta : ", FUND_DATA.span)
    console.log('size of inv data:: ', INVESTOR_DATA.span)

    console.log('size of price acc:: ', PRICE_DATA.span)
    const key = walletProvider?.publicKey;
    if (!key) {
      alert("connect wallet")
      return;
    }
    const fundPDA = await PublicKey.findProgramAddress([walletProvider?.publicKey.toBuffer()], programId);
    setFundPDA(fundPDA[0].toBase58())


    let x = await connection.getAccountInfo( fundPDA)
    if (x == null) {
      alert("fund account not found")
      return
    }
    console.log(x)
    let fundState = FUND_DATA.decode(x.data)
    if (!fundState.is_initialized) {
      alert("fund not initialized!")
      return
    }
    console.log(fundState)

    setAmountInRouter(parseInt(fundState.pendingDeposits) / (10 ** 9));
    setFundPerf(fundState.current_index)
    setFundAUM(parseInt(fundState.total_amount) / (10 ** 9))

    let bal = []
    bal.push((parseInt(fundState.tokens[0].balance) / (10 ** 9)))
    bal.push((parseInt(fundState.tokens[1].balance) / (10 ** 6)))
    bal.push((parseInt(fundState.tokens[2].balance) / (10 ** fundState.tokens[2].decimals)))
    setFundBalances(bal)
    console.log(bal)

    let investors = []
    for (let i = 0; i < 10; i++) {
      let acc = await PublicKey.createWithSeed(
        new PublicKey(fundState.investors[i].toString()),
        fundPDA[0].toBase58().substr(0, 31),
        programId
      );
      console.log(fundState.investors[i].toBase58())
      investors.push(fundState.investors[i].toBase58())
    }
    setFundInvestorAccs(investors);
  }
  return (
    <div className="form-div">
      <h4>Transfer</h4>

      <button onClick={handleTransfer}>Transfer</button>
      <button onClick={handleGetFunds}>GetFundInfo</button>
      <br />
      Info for FUND: {fundPDA}
      <br />
      amount in router:: {amountInRouter}
      <br />
      Total AUM:: {fundAUM}
      <br />
      fund performance:: {fundPerf}
      <br />
      USDR balance: {fundBalances[0]}
      <br />
      RAYT balance: {fundBalances[1]}
      <br />
      ALPHA balance: {fundBalances[2]}

    </div>
  )
}
