import { PublicKey, Transaction, TransactionInstruction, create} from '@solana/web3.js';
import React, { useState } from 'react'
import { GlobalState } from '../store/globalState';
import { connection, programId, platformStateAccount, FUND_ACCOUNT_KEY, TOKEN_PROGRAM_ID } from '../utils/constants';
import { nu64, struct, u32 } from 'buffer-layout';
import { createKeyIfNotExists, findAssociatedTokenAddress, signAndSendTransaction, createAssociatedTokenAccountIfNotExist, createAccountInstruction } from '../utils/web3';
import { FUND_DATA, INVESTOR_DATA } from '../utils/programLayouts';
import { awaitTransactionSignatureConfirmation, IDS, MangoClient } from '@blockworks-foundation/mango-client';
import { sendSignedTransactionAndNotify } from '../utils/solanaWeb3';

export const Deposit = () => {

  const [amount, setAmount] = useState(0);
  const [fundPDA, setFundPDA] = useState('');
  const [funds, setFunds] = useState([]);


  const walletProvider = GlobalState.useState(s => s.walletProvider);
  const ids = IDS['groups'][0]



  const handleDeposit = async () => {

    const key = walletProvider?.publicKey;

    if (!key) {
      alert("connect wallet")
      return;
    };

    console.log('selected FundPDA::', fundPDA)
  
    let fundStateInfo = await connection.getAccountInfo(new PublicKey(fundPDA))
    let fundState = FUND_DATA.decode(fundStateInfo.data)
    console.log("fundState:: ", fundState)

    const transaction = new Transaction()
  
    const openOrdersLamports = await connection.getMinimumBalanceForRentExemption(
          INVESTOR_DATA.span,
          'singleGossip'
        )
    let signers = [];
    
    const investerStateAccount = await createAccountInstruction(connection, key, INVESTOR_DATA.span, programId, openOrdersLamports, transaction, signers);
    const investorBaseTokenAccount = await createAssociatedTokenAccountIfNotExist(walletProvider, new PublicKey(ids.tokens[0].mintKey), key, transaction);

    let investorStateAccounts = 

    console.log("account size::: ", INVESTOR_DATA.span)

    const dataLayout = struct([u32('instruction'), nu64('amount')])
    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 1,
        amount: amount * ( 10 ** ids.tokens[0].decimals)
      },
      data
    )
    const keys =  [
      { pubkey: new PublicKey(fundPDA), isSigner: false, isWritable: true }, //fund State Account
      { pubkey: investerStateAccount, isSigner: false, isWritable: true },
      { pubkey: key, isSigner: true, isWritable: true },
      { pubkey: investorBaseTokenAccount, isSigner: false, isWritable: true }, // Investor Base Token Account
      { pubkey: fundState.usdc_vault_key, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
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
    transaction.setSigners(key);
    transaction.partialSign(...signers)

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
    
  const handleFunds = async () => {
    let managers = []

    let funds = await connection.getProgramAccounts(programId, { filters: [{ dataSize: FUND_DATA.span }] });
    console.log(`funds :::: `, funds)
    const fundData = funds.map(f => FUND_DATA.decode(f.account.data))

    console.log(`decodedFunds ::: `, fundData)
    
    for(let i=0; i<fundData.length; i++) {
      let manager = fundData[i].manager_account;
      let PDA = await PublicKey.findProgramAddress([manager.toBuffer()], programId);
      let fundState = await PublicKey.createWithSeed(manager, FUND_ACCOUNT_KEY, programId);
      console.log(`PDA[0]`, PDA)
      managers.push({
        fundPDA: PDA[0].toBase58(),
        fundManager: manager.toBase58(),
      });
    }
    console.log(managers)
    setFunds(managers);
  }



  const handleFundSelect = async(event) => {
  
    setFundPDA(event.target.value);
    console.log(`setting fundPDA :::: `,event.target.value, fundPDA)
  }

  return (
    <div className="form-div">
      <h4>Investor Deposit</h4>
      amount ::: {' '}
      <input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <br />
      <label htmlFor="funds">Select Fund Address:</label>

      <select name="funds" width = "100px" onClick={handleFundSelect}>
        {
          funds.map((fund) => {
            return (<option key={fund.fundPDA} value={fund.fundPDA}>{fund.fundPDA}</option>)
          })
        }
      </select>
      <button onClick={handleDeposit}>Deposit</button>
      <button onClick={handleFunds}>Load Funds</button>
    </div>
  )
}
