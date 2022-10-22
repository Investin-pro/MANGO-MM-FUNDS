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

export const Withdraw2 = () => {

  const [selectedInvestmentStateAcc, setSelectedInvestmentStateAcc] = useState('');
  const [investments, setInvestments] = useState([]);


  const walletProvider = GlobalState.useState(s => s.walletProvider);
  const fundAccount = GlobalState.useState(s => s.createFundPublicKey);
  const ids = IDS['groups'][0]

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
        instruction: 20,
      },
      data
    )
    const keys =  [
      { pubkey: investmentState.fund, isSigner: false, isWritable: true }, //fund State Account
      { pubkey: fundState.reimbursement_vault_key, isSigner: false, isWritable: true },
      { pubkey: investmentState.owner, isSigner: true, isWritable: true },
      { pubkey: new PublicKey(selectedInvestmentStateAcc), isSigner: false, isWritable: true },
      { pubkey: investorBaseTokenAccount, isSigner: false, isWritable: true},
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
  
  const handleSelectInvestment = async(event) => {
    setSelectedInvestmentStateAcc(event.target.value);
    console.log(`setting selectedInvestmentStateAcc :::: `,event.target.value, selectedInvestmentStateAcc)
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
      <h4>Withdraw2</h4>
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

    </div>
  )

}