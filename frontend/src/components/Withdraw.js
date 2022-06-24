import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import React, { useState } from 'react'
import { GlobalState } from '../store/globalState';
import { connection,  FUND_ACCOUNT_KEY, programId, TOKEN_PROGRAM_ID} from '../utils/constants';

import { struct, u32 } from 'buffer-layout';
import { createKeyIfNotExists, signAndSendTransaction, createAssociatedTokenAccountIfNotExist } from '../utils/web3';
import { INVESTOR_DATA, FUND_DATA } from '../utils/programLayouts';
import { createAccountInstruction, IDS, MangoClient, NodeBankLayout, PerpMarketLayout } from '@blockworks-foundation/mango-client';
import bs58 from 'bs58';
import BN from 'bn.js';
import { sendSignedTransactionAndNotify } from '../utils/solanaWeb3';

export const Withdraw = () => {

  const [selectedInvestmentStateAcc, setSelectedInvestmentStateAcc] = useState('');
  const [investments, setInvestments] = useState([]);


  const walletProvider = GlobalState.useState(s => s.walletProvider);
  const fundAccount = GlobalState.useState(s => s.createFundPublicKey);
  const ids = IDS['groups'][0]

  const handleRequestWithdraw = async () => {

    const key = walletProvider?.publicKey;

    if (!key) {
      alert("connect wallet")
      return;
    };

    console.log('selected Investment::', selectedInvestmentStateAcc.toString())
  
    let investmentStateInfo = await connection.getAccountInfo(new PublicKey(selectedInvestmentStateAcc))
    let investmentState = INVESTOR_DATA.decode(investmentStateInfo.data)
    console.log("fundState:: ", investmentState)

    const transaction = new Transaction()
    
    const dataLayout = struct([u32('instruction')])
    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 3,
      },
      data
    )
    const keys =  [
      { pubkey: investmentState.fund, isSigner: false, isWritable: true }, //fund State Account
      { pubkey: new PublicKey(selectedInvestmentStateAcc), isSigner: false, isWritable: true },
      { pubkey: key, isSigner: true, isWritable: true },
    ];

    for(let i = 0; i<keys.length; i++){
      console.log('>>',i, keys[i].pubkey.toBase58())
    }


    const instruction = new TransactionInstruction({
      keys,
      programId,
      data
    });

   
    transaction.add(instruction)
    transaction.feePayer = walletProvider?.publicKey;
    let hash = await connection.getRecentBlockhash();
    console.log("tx", transaction);
    transaction.recentBlockhash = hash.blockhash;

    // const sign = await signAndSendTransaction(walletProvider, transaction);
    // console.log("signature tx:: ", sign)
    // await awaitTransactionSignatureConfirmation(sign, 120000, connection, 'finalized')
   

      try {
          await sendSignedTransactionAndNotify({
              connection,
              transaction: transaction,
              successMessage: "Investment successful",
              failMessage: "Investment unsuccessful",
              wallet: walletProvider
          })
      } catch (error) {
          console.error('handleMakeInvestment: ', error);
      }

  }

  const handleWithdraw = async () => {

    const key = walletProvider?.publicKey;

    if (!key) {
      alert("connect wallet")
      return;
    };

    console.log('selected Investment::', selectedInvestmentStateAcc.toString())
    
    let investmentStateInfo = await connection.getAccountInfo(new PublicKey(selectedInvestmentStateAcc))
    let investmentState = INVESTOR_DATA.decode(investmentStateInfo.data)
    console.log("InvestmentState:: ", investmentState)
    let fundStateInfo = await connection.getAccountInfo(investmentState.fund)
    let fundState = FUND_DATA.decode(fundStateInfo.data)
    console.log("fundState:: ", fundState)
    
    const transaction = new Transaction()
    
    const investorBaseTokenAccount = await createAssociatedTokenAccountIfNotExist(walletProvider, new PublicKey(ids.tokens[0].mintKey), key, transaction);
    const dataLayout = struct([u32('instruction')])
    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 2,
      },
      data
    )
    const keys =  [
      { pubkey: investmentState.fund, isSigner: false, isWritable: true }, //fund State Account
      { pubkey: new PublicKey(selectedInvestmentStateAcc), isSigner: false, isWritable: true },
      { pubkey: key, isSigner: true, isWritable: true },
      { pubkey: investorBaseTokenAccount, isSigner: false, isWritable: true},
      { pubkey: fundState.usdc_vault_key, isSigner: false, isWritable: true},
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
    ];

    for(let i = 0; i<keys.length; i++){
      console.log('>>',i, keys[i].pubkey.toBase58())
    }


    const instruction = new TransactionInstruction({
      keys,
      programId,
      data
    });

   
    transaction.add(instruction)
    transaction.feePayer = walletProvider?.publicKey;
    let hash = await connection.getRecentBlockhash();
    console.log("tx", transaction);
    transaction.recentBlockhash = hash.blockhash;

    // const sign = await signAndSendTransaction(walletProvider, transaction);
    // console.log("signature tx:: ", sign)
    // await awaitTransactionSignatureConfirmation(sign, 120000, connection, 'finalized')
   

      try {
          await sendSignedTransactionAndNotify({
              connection,
              transaction: transaction,
              successMessage: "Investment successful",
              failMessage: "Investment unsuccessful",
              wallet: walletProvider
          })
      } catch (error) {
          console.error('handleMakeInvestment: ', error);
      }

  }



  // const handleWithdraw = async () => {

  //   const key = walletProvider?.publicKey;

  //   if (!key) {
  //     alert("connect wallet")
  //     return;
  //   };

  //   if(!fundPDA) {
  //     alert("no funds found")
  //     return
  //   }
    
  //   const transaction = new Transaction()

  //   const openOrdersLamports =
  //   await connection.getMinimumBalanceForRentExemption(
  //     INVESTOR_DATA.span,
  //     'singleGossip'
  //   )
  //   let signers = []
  //   const investerStateAccount = await createAccountInstruction(connection, key, INVESTOR_DATA.span, programId, openOrdersLamports, transaction, signers);
  //   const investorBaseTokenAccount = await createAssociatedTokenAccountIfNotExist(walletProvider, new PublicKey(ids.tokens[0].mintKey), key, transaction);

  //   let fundStateInfo = await connection.getAccountInfo(new PublicKey(fundPDA ))
  //   let fundState = FUND_DATA.decode(fundStateInfo.data)
  //   console.log("fundState:: ", fundState)

  //   let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))
  //   let mangoGroup = await client.getMangoGroup(new PublicKey(ids.publicKey))
  //   console.log("mango group:: ", mangoGroup)

  //   let nodeBankInfo = await connection.getAccountInfo(new PublicKey(ids.tokens[0].nodeKeys[0]))
  //   let nodeBank = NodeBankLayout.decode(nodeBankInfo.data)
  //   console.log("nodebank:: ", nodeBank)


  //   const dataLayout = struct([u32('instruction')])
  //   const data = Buffer.alloc(dataLayout.span)
  //   dataLayout.encode(
  //     {
  //       instruction: 2,
  //     },
  //     data
  //   )

  //   const instruction = new TransactionInstruction({
  //     keys: [
  //       { pubkey: fundPDA, isSigner: false, isWritable: true },
  //       { pubkey: investerStateAccount, isSigner: false, isWritable: true }, //fund State Account
  //       { pubkey: key, isSigner: true, isWritable: true },
  //       { pubkey: fundState.vault_key, isSigner: false, isWritable: true }, // Router Base Token Account
  //       { pubkey: new PublicKey(ids.mangoProgramId), isSigner: false, isWritable: false },

  //       { pubkey: new PublicKey(ids.publicKey), isSigner: false, isWritable: true },
  //       { pubkey: fundState.mango_account, isSigner: false, isWritable: true },
  //       { pubkey: new PublicKey(fundPDA), isSigner: false, isWritable: false },
  //       { pubkey: mangoGroup.mangoCache , isSigner: false, isWritable: false },
  //       { pubkey: new PublicKey(ids.perpMarkets[0].publicKey), isSigner: false, isWritable: true },
  //       { pubkey: new PublicKey(ids.perpMarkets[0].bidsKey), isSigner: false, isWritable: true },
  //       { pubkey: new PublicKey(ids.perpMarkets[0].asksKey), isSigner: false, isWritable: true },
  //       { pubkey: new PublicKey(ids.perpMarkets[0].eventsKey), isSigner: false, isWritable: true },

  //       { pubkey: new PublicKey(ids.tokens[0].rootKey), isSigner: false, isWritable: true },
  //       { pubkey: new PublicKey(ids.tokens[0].nodeKeys[0]), isSigner: false, isWritable: true },
  //       { pubkey: nodeBank.vault, isSigner: false, isWritable: true },
  //       { pubkey: investorBaseTokenAccount, isSigner: false, isWritable: true }, // Investor Token Accounts
  //       { pubkey: mangoGroup.signerKey, isSigner: false, isWritable: true },
  //       { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: true },
  //       { pubkey: PublicKey.default, isSigner: false, isWritable: true },
  //     ],
  //     programId,
  //     data
  //   });

  //   transaction.add(instruction);
  //   console.log(`transaction ::: `, transaction)
  //   console.log(`walletProvider?.publicKey ::: `, walletProvider?.publicKey.toBase58())
  //   transaction.feePayer = key;
  //   let hash = await connection.getRecentBlockhash("finalized");
  //   console.log("blockhash", hash);
  //   transaction.recentBlockhash = hash.blockhash;
  //   transaction.setSigners(key, investerStateAccount)
  //   transaction.partialSign(...signers)
  //   const sign = await signAndSendTransaction(walletProvider, transaction);
  //   console.log("tx::: ", sign)
  // }
  
  // const handleFunds = async () => {
  
  //   let funds = await connection.getProgramAccounts(programId, { filters: [{ dataSize: FUND_DATA.span }] });
  //   console.log(`funds :::: `, funds)
  //   const fundData = funds.map(f => FUND_DATA.decode(f.account.data))

  //   console.log(`decodedFunds ::: `, fundData)
  //   let invFunds = []
  //   for(let i=0; i<fundData.length; i++) {
  //     let manager = fundData[i].manager_account;

  //     let PDA = await PublicKey.findProgramAddress([manager.toBuffer()], programId);
  //     let fundState = await PublicKey.createWithSeed(manager, FUND_ACCOUNT_KEY, programId);

  //     let invStateAccount = await PublicKey.createWithSeed(walletProvider?.publicKey, PDA[0].toBase58().substr(0, 31), programId);
  //     let invState = await connection.getAccountInfo(invStateAccount);

  //     if (invState == null) {
  //       continue
  //     }

  //     let invStateData = INVESTOR_DATA.decode(invState.data)
  //     console.log(invStateData)

  //     // if (!invStateData.is_initialized) {
  //     //   continue
  //     // }
  //     invFunds.push({
  //       fundPDA: PDA[0].toBase58(),
  //       fundManager: manager.toBase58(),
  //     });
  //   }
  //   console.log(invFunds)
  //   setFunds(invFunds);
  // }

  // const handleFundSelect = async(event) => {
  
  //   setFundPDA(event.target.value);
  //   console.log(`setting fundPDA :::: `, event.target.value, fundPDA)
  // }

  const handleSelectInvestment = async(event) => {
    setSelectedInvestmentStateAcc(event.target.value);
    console.log(`setting selectedInvestmentStateAcc :::: `,event.target.value, selectedInvestmentStateAcc)
  }
  
  const handleGetInvestments = async () => {

    const investorAccount = walletProvider?.publicKey;
    console.log("Investor::",investorAccount.toBase58())

    let investments = await connection.getProgramAccounts(programId, { 
      filters: [
        {
          memcmp : { offset : INVESTOR_DATA.offsetOf('owner') , bytes : investorAccount.toString()},
          memcmp : { offset : INVESTOR_DATA.offsetOf('investment_status') , bytes : bs58.encode((new BN(2, 'le')).toArray())}
        },
        { dataSize: INVESTOR_DATA.span }
      ]
     });
    console.log(`found investments :::: `, investments)

    const investmentStateAccs = investments.map(f => f.pubkey.toBase58())

    const investmentsData = investments.map(f => INVESTOR_DATA.decode(f.account.data))
    console.log(`decodedInvestments ::: `, investmentsData)
    
    // for(let i=0; i<investments.length; i++) {
    //   let fund = investmentsData[i].fund;
    //   let fundState = await PublicKey.createWithSeed(manager, FUND_ACCOUNT_KEY, programId);
    //   console.log(`PDA[0]`, PDA)
    //   managers.push({
    //     fundPDA: PDA[0].toBase58(),
    //     fundManager: manager.toBase58(),
    //   });
    // }
    // console.log(managers)
    setInvestments(investmentStateAccs);
  }

  const handleGetInvestmentsForWithdraw = async () => {

    const investorAccount = walletProvider?.publicKey;
    console.log("Investor::",investorAccount.toBase58())

    let investments = await connection.getProgramAccounts(programId, { 
      filters: [
        {
          memcmp : { offset : INVESTOR_DATA.offsetOf('owner') , bytes : investorAccount.toString()},
          memcmp : { offset : INVESTOR_DATA.offsetOf('investment_status') , bytes : bs58.encode((new BN(4, 'le')).toArray())}
        },
        { dataSize: INVESTOR_DATA.span }
      ]
     });
    console.log(`found investments :::: `, investments)

    const investmentStateAccs = investments.map(f => f.pubkey.toBase58())

    const investmentsData = investments.map(f => INVESTOR_DATA.decode(f.account.data))
    console.log(`decodedInvestments ::: `, investmentsData)
    
    // for(let i=0; i<investments.length; i++) {
    //   let fund = investmentsData[i].fund;
    //   let fundState = await PublicKey.createWithSeed(manager, FUND_ACCOUNT_KEY, programId);
    //   console.log(`PDA[0]`, PDA)
    //   managers.push({
    //     fundPDA: PDA[0].toBase58(),
    //     fundManager: manager.toBase58(),
    //   });
    // }
    // console.log(managers)
    setInvestments(investmentStateAccs);
  }

  return (
    <div className="form-div">
      <h4>Withdraw</h4>
      <br />
      <button onClick={handleGetInvestments}>Get Investments</button>
      <br />
      <label htmlFor="funds">Select Investment:</label>

      <select name="funds" width = "100px" onClick={handleSelectInvestment}>
        {
          investments.map((i) => {
            return (<option key={i} value={i}>{i}</option>)
          })
        }
      </select>
      <button onClick={handleRequestWithdraw}>Request Withdraw</button>

      <br />
      <button onClick={handleGetInvestmentsForWithdraw}>Get Investments</button>
      <br />
      <label htmlFor="funds">Select Investment:</label>

      <select name="funds" width = "100px" onClick={handleSelectInvestment}>
        {
          investments.map((i) => {
            return (<option key={i} value={i}>{i}</option>)
          })
        }
      </select>
      <button onClick={handleWithdraw}>Withdraw</button>

      {/* <button onClick={handleFunds}>Load Investments</button> */}

      <br />
     
      {/* <button onClick={handleWithdraw}>Withdraw from Fund</button>
      <button onClick={handleHarvestMngo}>Harvest Mngo</button> */}
  
      <br />
    </div>
  )

}