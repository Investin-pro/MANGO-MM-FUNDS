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

export const ForceUpdatePerp = () => {

  const [investments, setInvestments] = useState([]);
  const [fundAddress, setFundAddress] = useState('')
  const [perpIndex, setPerpIndex] = useState(0); 

  const walletProvider = GlobalState.useState(s => s.walletProvider);
  const ids = IDS['groups'][0]

  
  const handInitForceSettle= async () => {

    const key = walletProvider?.publicKey;

    if (!key) {
      alert("connect wallet")
      return;
    };



    const fundPDA = await new PublicKey(fundAddress);
    console.log("fundPDA::",fundPDA.toBase58())

  
    let fundStateInfo = await connection.getAccountInfo(new PublicKey(fundPDA))
    let fundState = FUND_DATA.decode(fundStateInfo.data)
    console.log("fundState:: ", fundState)


    const transaction = new Transaction()
  

    console.log("account size::: ", INVESTOR_DATA.span)

    let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))
    let mangoGroup = await client.getMangoGroup(new PublicKey(ids.publicKey))

    let mangoAcc = await client.getMangoAccount(fundState.mango_account, new PublicKey(ids.serumProgramId))
    console.log("mangoAcc.spot::", mangoAcc.spotOpenOrders);

     const investmentKeys = investments.map( (i,index) => { 
      return {
        pubkey : i.pubkey,
        isSigner : false,
        isWritable : true
      }
    })

    const spotOrdersKeys = mangoAcc.spotOpenOrders.map( (i,index) => { 
      console.log("spot order",index,i.toBase58())
      return {
        pubkey : i,
        isSigner : false,
        isWritable : false
      }
    })
    

    const dataLayout = struct([u32('instruction'), u8('open_order_index')])
    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 11,
      },
      data
    )
    const keys =  [
      { pubkey: new PublicKey(ids.mangoProgramId), isSigner: false, isWritable: false },
      { pubkey: new PublicKey(ids.publicKey), isSigner: false, isWritable: true },
      { pubkey: fundState.mango_account, isSigner: false, isWritable: true },
      { pubkey: new PublicKey(fundPDA), isSigner: false, isWritable: true }, //fund State Account
      { pubkey: mangoGroup.mangoCache, isSigner: false, isWritable: true },
      { pubkey: mangoGroup.dexProgramId, isSigner: false, isWritable: true },
      { pubkey: new PublicKey(ids.spotMarkets[perpIndex].publicKey), isSigner: false, isWritable: true }, //root_bank_ai
      { pubkey: new PublicKey(ids.spotMarkets[perpIndex].bidsKey), isSigner: false, isWritable: true }, //node_bank_ai
      { pubkey: new PublicKey(ids.spotMarkets[perpIndex].asksKey), isSigner: false, isWritable: true }, //node_bank_ai
      { pubkey: new PublicKey(ids.spotMarkets[perpIndex].), isSigner: false, isWritable: true }, //node_bank_ai
      { pubkey: new PublicKey(ids.spotMarkets[perpIndex].eventsKey), isSigner: false, isWritable: true }, //node_bank_ai
      { pubkey: fundState.mango_account, isSigner: false, isWritable: true },
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
    
  const handleGetInvestors = async () => {

    const fundPDA = (await PublicKey.findProgramAddress([walletProvider?.publicKey.toBuffer()], programId))[0];
    console.log("fundPDA::",fundPDA.toBase58())

    let investments = await connection.getProgramAccounts(programId, { 
      filters: [
        {
          memcmp : { offset : INVESTOR_DATA.offsetOf('fund') , bytes : fundPDA.toString()},
          memcmp : { offset : INVESTOR_DATA.offsetOf('investment_status') , bytes : bs58.encode((new BN(3, 'le')).toArray())}
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


  return (
    <div className="form-div">
      <h4>Init Force Settle</h4>

      Fund  ::: {' '}
        <input type="text" value={fundAddress} onChange={(event) => setFundAddress(event.target.value)} />
        <br />
        <input type="number" value={perpIndex} onChange={(event) => setPerpIndex(event.target.value)} />
        <br />
      
      <button onClick={handInitForceSettle}>Init</button>
    </div>
  )
}
