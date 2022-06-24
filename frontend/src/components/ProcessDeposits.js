import { PublicKey, Transaction, TransactionInstruction, create} from '@solana/web3.js';
import React, { useState } from 'react'
import { GlobalState } from '../store/globalState';
import { connection, programId, platformStateAccount, FUND_ACCOUNT_KEY, TOKEN_PROGRAM_ID, SYSTEM_PROGRAM_ID } from '../utils/constants';
import { nu64, struct, u32 } from 'buffer-layout';
import { createKeyIfNotExists, findAssociatedTokenAddress, signAndSendTransaction, createAssociatedTokenAccountIfNotExist, createAccountInstruction } from '../utils/web3';
import { FUND_DATA, INVESTOR_DATA } from '../utils/programLayouts';
import { awaitTransactionSignatureConfirmation, IDS, MangoClient, NodeBankLayout } from '@blockworks-foundation/mango-client';
import { sendSignedTransactionAndNotify } from '../utils/solanaWeb3';
import bs58 from 'bs58';
import BN from 'bn.js';

export const ProcessDeposits = () => {

  const [selectedInvestmentStateAcc, setSelectedInvestmentStateAcc] = useState('');
  const [investments, setInvestments] = useState([]);

  const walletProvider = GlobalState.useState(s => s.walletProvider);
  const ids = IDS['groups'][0]

  
  const handleprocesDeposit = async () => {

    const key = walletProvider?.publicKey;

    if (!key) {
      alert("connect wallet")
      return;
    };



    const fundPDA = (await PublicKey.findProgramAddress([walletProvider?.publicKey.toBuffer()], programId))[0];
    console.log("fundPDA::",fundPDA.toBase58())

    console.log('selected investment::', selectedInvestmentStateAcc)
  
    let fundStateInfo = await connection.getAccountInfo(new PublicKey(fundPDA))
    let fundState = FUND_DATA.decode(fundStateInfo.data)
    console.log("fundState:: ", fundState)


    const transaction = new Transaction()
  
    const openOrdersLamports = await connection.getMinimumBalanceForRentExemption(
          INVESTOR_DATA.span,
          'singleGossip'
        )
    

    console.log("account size::: ", INVESTOR_DATA.span)

    let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))
    let mangoGroup = await client.getMangoGroup(new PublicKey(ids.publicKey))
    let nodeBankInfo = await connection.getAccountInfo(new PublicKey(ids.tokens[0].nodeKeys[0]))
    let nodeBank = NodeBankLayout.decode(nodeBankInfo.data)

    let mangoAcc = await client.getMangoAccount(fundState.mango_account, new PublicKey(ids.serumProgramId))
    console.log("mangoAcc.spot::",mangoAcc.spotOpenOrders);

    const spotOrdersKeys = mangoAcc.spotOpenOrders.map( (i,index) => { 
      console.log("spot order",index,i.toBase58())
      return {
        pubkey : i,
        isSigner : false,
        isWritable : false
      }
    })

    const dataLayout = struct([u32('instruction')])
    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 4,
      },
      data
    )
    const keys =  [
      { pubkey: new PublicKey(fundPDA), isSigner: false, isWritable: true }, //fund State Account
      { pubkey: key, isSigner: true, isWritable: true },
      { pubkey: new PublicKey(ids.mangoProgramId), isSigner: false, isWritable: false },
      { pubkey: new PublicKey(ids.publicKey), isSigner: false, isWritable: true },
      { pubkey: fundState.mango_account, isSigner: false, isWritable: true },
      { pubkey: mangoGroup.mangoCache, isSigner: false, isWritable: true },
      { pubkey: new PublicKey('AMzanZxMirPCgGcBoH9kw4Jzi9LFMomyUCXbpzDeL2T8'), isSigner: false, isWritable: true }, //root_bank_ai
      { pubkey: new PublicKey('BGcwkj1WudQwUUjFk78hAjwd1uAm8trh1N4CJSa51euh'), isSigner: false, isWritable: true }, //node_bank_ai
      { pubkey: nodeBank.vault, isSigner: false, isWritable: true }, //vault_ai
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: fundState.usdc_vault_key, isSigner: false, isWritable: true },
      ...spotOrdersKeys,
      { pubkey: new PublicKey(selectedInvestmentStateAcc), isSigner: false, isWritable: true }
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
    
  const handleGetInvestors = async () => {

    const fundPDA = (await PublicKey.findProgramAddress([walletProvider?.publicKey.toBuffer()], programId))[0];
    console.log("fundPDA::",fundPDA.toBase58())

    let investments = await connection.getProgramAccounts(programId, { 
      filters: [
        {
          memcmp : { offset : INVESTOR_DATA.offsetOf('fund') , bytes : fundPDA.toString()},
          memcmp : { offset : INVESTOR_DATA.offsetOf('investment_status') , bytes : bs58.encode((new BN(1, 'le')).toArray())}
        },
        { dataSize: INVESTOR_DATA.span }
      ]
     });
    console.log(`found investments :::: `, investments)

    const investmentStateAccs = investments.map(f => f.pubkey.toBase58())

    const investmentsData = investments.map(f => INVESTOR_DATA.decode(f.account.data))
    console.log(`decodedFunds ::: `, investmentsData)
    
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

  const handleSelectInvestment = async(event) => {
    setSelectedInvestmentStateAcc(event.target.value);
    console.log(`setting selectedInvestmentStateAcc :::: `,event.target.value, selectedInvestmentStateAcc)
  }

  return (
    <div className="form-div">
      <h4>Process Deposit</h4>
      
      <br />
      <label htmlFor="funds">Select Investment Address:</label>

      <select name="funds" width = "100px" onClick={handleSelectInvestment}>
        {
          investments.map((i) => {
            return (<option key={i} value={i}>{i}</option>)
          })
        }
      </select>
      <button onClick={handleprocesDeposit}> Process Deposit</button>
      <button onClick={handleGetInvestors}>Load Investments of my fund</button>
    </div>
  )
}
