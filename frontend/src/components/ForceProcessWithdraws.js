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

export const ForceProcessWithdraws = () => {
  

  const [fundAddress, setFundAddress] = useState('')


  const [investments, setInvestments] = useState([]);

  const walletProvider = GlobalState.useState(s => s.walletProvider);
  const ids = IDS['groups'][0]

  
  const handleprocesWithdraw = async () => {

    const key = walletProvider?.publicKey;

    if (!key) {
      alert("connect wallet")
      return;
    };



    const fundPDA = new PublicKey(fundAddress);
    console.log("fundPDA::",fundPDA.toBase58())

  
    let fundStateInfo = await connection.getAccountInfo(new PublicKey(fundPDA))
    let fundState = FUND_DATA.decode(fundStateInfo.data)
    console.log("fundState:: ", fundState)


    const transaction = new Transaction()
  

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

    let investments = await connection.getProgramAccounts(programId, { 
      filters: [
        {
          memcmp : { offset : INVESTOR_DATA.offsetOf('fund') , bytes : fundPDA.toString()},
          memcmp : { offset : INVESTOR_DATA.offsetOf('investment_status') , bytes : bs58.encode((new BN(4, 'le')).toArray())}
        },
        { dataSize: INVESTOR_DATA.span }
      ]
     });

     const investmentKeys = investments.map( (i,index) => { 
      return {
        pubkey : i.pubkey,
        isSigner : false,
        isWritable : true
      }
    })

    const dataLayout = struct([u32('instruction')])
    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 5,
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
      { pubkey: mangoGroup.signerKey, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: fundState.usdc_vault_key, isSigner: false, isWritable: true },
      ...spotOrdersKeys,
      ...investmentKeys,
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

  return (
    <div className="form-div">
      <h4>Init Force Settle</h4>

      Fund  ::: {' '}
        <input type="text" value={fundAddress} onChange={(event) => setFundAddress(event.target.value)} />
        <br />
      
      <button onClick={handleprocesWithdraw}>Init</button>
    </div>
  )
}
