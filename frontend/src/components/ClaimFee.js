import { PublicKey, SYSVAR_CLOCK_PUBKEY, Transaction, TransactionInstruction } from '@solana/web3.js';
import React, { useState } from 'react'
import { GlobalState } from '../store/globalState';
import { adminAccount, priceStateAccount, connection, programId, TOKEN_PROGRAM_ID, FUND_ACCOUNT_KEY } from '../utils/constants';
import { nu64, struct, u8 } from 'buffer-layout';
import { findAssociatedTokenAddress, signAndSendTransaction, createAssociatedTokenAccountIfNotExist } from '../utils/web3';
import { TEST_TOKENS } from '../utils/tokens'
import { FUND_DATA } from '../utils/programLayouts';
import { devnet_pools } from '../utils/pools'
import { updatePoolPrices } from './updatePrices';


export const Claim = () => {
    const [fundPDA, setFundPDA] = useState('');
    const [performanceFee, setPerformanceFee] = useState(0)

    const walletProvider = GlobalState.useState(s => s.walletProvider);

    const handleClaim = async () => {
    
        const key = walletProvider?.publicKey;
        const ids = IDS['groups'][0]
                
    
        let fundStateInfo = await connection.getAccountInfo((fundPDA))
        let fundState = FUND_DATA.decode(fundStateInfo.data)
        console.log("fundState:: ", fundState)
    
        let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))
        let mangoGroup = await client.getMangoGroup(new PublicKey(ids.publicKey))
        console.log("mango group:: ", mangoGroup)

        const transaction = new Transaction()

        const fundBaseVault = await createAssociatedTokenAccountIfNotExist(walletProvider, new PublicKey(ids.tokens[0].mintKey), fundState.fund_pda, transaction);
        const managerBaseTokenAccount = await createAssociatedTokenAccountIfNotExist(walletProvider, new PublicKey(ids.tokens[0].mintKey), key, transaction);

        const dataLayout = struct([u8('instruction')])
        const data = Buffer.alloc(dataLayout.span)
        dataLayout.encode(
            {
            instruction: 5,
            },
            data
        )
        
        const claim_instruction = new TransactionInstruction({
        keys: [
        {pubkey: fundPDA, isSigner: false, isWritable: true},
        {pubkey: key, isSigner: true, isWritable: true },
        {pubkey: managerBaseTokenAccount, isSigner: false, isWritable:true},
        {pubkey: fundBaseVault, isSigner: false, isWritable:true},
        { pubkey: new PublicKey(ids.mangoProgramId), isSigner: false, isWritable: false },
         { pubkey: new PublicKey(ids.publicKey), isSigner: false, isWritable: false },
         { pubkey: mangoGroup.mangoCache , isSigner: false, isWritable: false },
        { pubkey: fundState.mango_account, isSigner: false, isWritable: true },
        { pubkey: fundState.fund_pda, isSigner: false, isWritable: false },

        {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: true},

    ],
    programId,
    data
    });
    
    transaction.add(claim_instruction);
    transaction.feePayer = key;
    let hash = await connection.getRecentBlockhash();
    console.log("blockhash", hash);
    transaction.recentBlockhash = hash.blockhash;

    const sign = await signAndSendTransaction(walletProvider, transaction);
    console.log("tx perf: ", sign)
  }
    


    return (
        <div className="form-div">
            <h4>Claim Performance Fee</h4>
         
          <br />
          <button onClick={handleClaim}>Claim Performance Fee</button>
          <button onClick={handleGetFee}>Get Claimable Fee</button>
          <br />
          Fees to claim:: {performanceFee}

        </div>
      )
}

    