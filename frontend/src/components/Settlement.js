import React, { useEffect, useState } from 'react'
import { createAssociatedTokenAccount, createAssociatedTokenAccountIfNotExist, createKeyIfNotExists, createTokenAccountIfNotExist, findAssociatedTokenAddress, setWalletTransaction, signAndSendTransaction } from '../utils/web3'
import { connection, delegate, FUND_ACCOUNT_KEY, MARGIN_ACCOUNT_KEY_1, platformStateAccount, PLATFORM_ACCOUNT_KEY, programId, SYSTEM_PROGRAM_ID } from '../utils/constants'
import { GlobalState } from '../store/globalState';
import { nu64, struct, u8, u32} from 'buffer-layout';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@project-serum/serum/lib/token-instructions';
import { FUND_DATA, PLATFORM_DATA, u64, U64F64 } from '../utils/programLayouts';
import { Badge } from 'reactstrap';
import { IDS, MangoAccountLayout, MangoClient } from '@blockworks-foundation/mango-client'
import BN from 'bn.js';
import { sendSignedTransactionAndNotify } from '../utils/solanaWeb3';

export const Settlement = () => {

   const [fundAddress, setFundAddress] = useState('')


  
  const walletProvider = GlobalState.useState(s => s.walletProvider);

  const handlePauseForSettlement = async () => {

    const transaction = new Transaction()
    let ids = IDS['groups'][0]


    const fundPDA = await new PublicKey(fundAddress);

    const mango_group_ai = new PublicKey(ids.publicKey);
    let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))

    let mangoGroup = await client.getMangoGroup(new PublicKey(ids.publicKey))

   
    console.log(`FUND_DATA.span :::: `, FUND_DATA.span) 
    console.log(`fundPDA::: `, fundPDA.toBase58())

    const accountNumBN = new BN(0);

    const mango_account_ai = await PublicKey.findProgramAddress([
      mango_group_ai.toBytes(),
      fundPDA.toBytes(),
      accountNumBN.toArrayLike(Buffer, 'le', 8),
    ],
    new PublicKey(ids.mangoProgramId))


      const dataLayout = struct([u32('instruction')])

      const data = Buffer.alloc(dataLayout.span)
      dataLayout.encode(
        {
          instruction: 8,
        },
        data
      )


      console.log('data', data)
        const keys = [
          { pubkey: fundPDA, isSigner: false, isWritable: true },
          { pubkey: new PublicKey(ids.mangoProgramId), isSigner: false, isWritable: false },
          { pubkey: new PublicKey(ids.publicKey), isSigner: false, isWritable: true },
          { pubkey: mango_account_ai[0], isSigner: false, isWritable: true },
          { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false},
          { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false}
        ]

        for(let i = 0; i<keys.length; i++){
          console.log('>>', keys[i].pubkey.toBase58())
        }

      console.log("IDS:: ", ids)
      const instruction = new TransactionInstruction({
        keys,
        programId,
        data
      });
      console.log("programId::",programId.toBase58())
      transaction.add(instruction)
      transaction.feePayer = walletProvider?.publicKey;
      let hash = await connection.getRecentBlockhash();
      console.log("blockhash", hash);
      transaction.recentBlockhash = hash.blockhash;

      // const sign = await signAndSendTransaction(walletProvider, transaction);
      // console.log("signature tx:: ", sign)
      try {
        await sendSignedTransactionAndNotify({
            connection,
            transaction: transaction,
            successMessage: "Pause successful",
            failMessage: "Pause unsuccessful",
            wallet: walletProvider
        })
      } catch (error) {
          console.error('init e: ', error);
      }
  


    GlobalState.update(s => {
      s.createFundPublicKey = fundPDA;
    })
  }

  



  const [min_amount, setMin_amount] = useState(0);
  const [platform_fee_percentage, setPlatform_fee_percentage] = useState(0);

  return (
    <div className="form-div">
      <h4>Pause Fund</h4>

      Fund  ::: {' '}
        <input type="text" value={fundAddress} onChange={(event) => setFundAddress(event.target.value)} />
        <br />
      <br />
      <button onClick={handlePauseForSettlement}>Pause</button>
    </div>
  )
}

