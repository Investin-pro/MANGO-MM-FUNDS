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

export const InitialisedFund = () => {

  const walletProvider = GlobalState.useState(s => s.walletProvider);

  const handleInitializeFund = async () => {

    const transaction = new Transaction()
    let ids = IDS['groups'][0]


    const fundPDA = await PublicKey.findProgramAddress([walletProvider?.publicKey.toBuffer()], programId);

    const mango_group_ai = new PublicKey(ids.publicKey);
    let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))

    let mangoGroup = await client.getMangoGroup(new PublicKey(ids.publicKey))

   
    console.log(`FUND_DATA.span :::: `, FUND_DATA.span) 
    console.log(`fundPDA::: `, fundPDA[0].toBase58())

    const accountNumBN = new BN(0);

    const mango_account_ai = await PublicKey.findProgramAddress([
      mango_group_ai.toBytes(),
      fundPDA[0].toBytes(),
      accountNumBN.toArrayLike(Buffer, 'le', 8),
    ],
    new PublicKey(ids.mangoProgramId))


      const dataLayout = struct([u32('instruction'), nu64('min_amount'), nu64('performance_fee_percentage')])

      const data = Buffer.alloc(dataLayout.span)
      console.log("min_amount * (10 ** ids.tokens[0].decimals::",min_amount * (10 ** ids.tokens[0].decimals));
      console.log("platform_fee_percentage * 100::",platform_fee_percentage * 100)
      dataLayout.encode(
        {
          instruction: 0,
          min_amount: min_amount * (10 ** ids.tokens[0].decimals),
          performance_fee_percentage: platform_fee_percentage * 100,
        },
        data
      )

      const fundBaseVault = await createAssociatedTokenAccountIfNotExist(walletProvider, new PublicKey(ids.tokens[0].mintKey), fundPDA[0], transaction);
      
      // const fundBaseVault = await findAssociatedTokenAddress(fundPDA[0], new PublicKey(ids.tokens[0].mintKey));

      console.log("fundBaseVault:",fundBaseVault.toBase58())

      console.log('data', data)
        const keys = [
          { pubkey: walletProvider?.publicKey, isSigner: true, isWritable: true },
          { pubkey: fundPDA[0], isSigner: false, isWritable: true },

          { pubkey: fundBaseVault, isSigner: false, isWritable: true },
          { pubkey: new PublicKey(ids.mangoProgramId), isSigner: false, isWritable: false },
          { pubkey: new PublicKey(ids.publicKey), isSigner: false, isWritable: true },
          { pubkey: mango_account_ai[0], isSigner: false, isWritable: true },
          { pubkey: delegate, isSigner: false, isWritable: false},
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
            successMessage: "Investment successful",
            failMessage: "Investment unsuccessful",
            wallet: walletProvider
        })
      } catch (error) {
          console.error('init e: ', error);
      }
  


    GlobalState.update(s => {
      s.createFundPublicKey = fundPDA[0];
    })
  }

  



  const [min_amount, setMin_amount] = useState(0);
  const [platform_fee_percentage, setPlatform_fee_percentage] = useState(0);

  return (
    <div className="form-div">
      <h4>Initialise Fund</h4>
      min_amount ::: {' '}
      <input type="number" value={min_amount} onChange={(event) => setMin_amount(event.target.value)} />
      <br />
      platform_fee_percentage ::: {' '}
      <input type="number" value={platform_fee_percentage} onChange={(event) => setPlatform_fee_percentage(event.target.value)} />
      <br />
      <button onClick={handleInitializeFund}>initialise fund</button>
    </div>
  )
}

