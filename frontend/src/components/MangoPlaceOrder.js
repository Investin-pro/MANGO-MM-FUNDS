// import { Account, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
// import React, { useState } from 'react'
// import { GlobalState } from '../store/globalState';
// import { connection, FUND_ACCOUNT_KEY, programId, SYSTEM_PROGRAM_ID, TOKEN_PROGRAM_ID } from '../utils/constants';
// import { struct, u32, u8, u16, ns64, nu64 } from 'buffer-layout';
// import { createAssociatedTokenAccountIfNotExist, signAndSendTransaction } from '../utils/web3';
// import { FUND_DATA } from '../utils/programLayouts';


// import { IDS, MangoClient, I80F48, NodeBankLayout, PerpAccountLayout, PerpMarketLayout } from '@blockworks-foundation/mango-client';

// export const MangoPlaceOrder = () => {
//     const [size, setSize] = useState(0);
//     const [price, setPrice] = useState(0);
//     const [index, setIndex] = useState(0);
//     const [side, setSide] = useState('');
    
//     const walletProvider = GlobalState.useState(s => s.walletProvider);
//     const ids = IDS['groups'][0]

    

//     const handleMangoDeposit = async () => {
    
//     const key = walletProvider?.publicKey;

//     if (!key ) {
//       alert("connect wallet")
//       return;
//     };
//     const transaction = new Transaction()



//     let fundStateInfo = await connection.getAccountInfo((fundPDA))
//     let fundState = FUND_DATA.decode(fundStateInfo.data)
//     console.log("fundState:: ", fundState)

//     let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))
//       let mangoGroup = await client.getMangoGroup(new PublicKey(ids.publicKey))
//       console.log("mango group:: ", mangoGroup)

//       let mangoAcc = await client.getMangoAccount(new PublicKey('7BLzTNvjNjaCnZ2Nnpu1aFYqTBsL8Lz2FUxknSAZ8tDX'), ids.serumProgramId)
//       console.log("manogACc:: ", mangoAcc)
//       let nodeBankInfo = await connection.getAccountInfo(new PublicKey(ids.tokens[0].nodeKeys[0]))
//       let nodeBank = NodeBankLayout.decode(nodeBankInfo.data)
//       console.log("nodebank:: ", nodeBank)

//     const dataLayout = struct([u32('instruction'), nu64('quantity')])
//     const data = Buffer.alloc(dataLayout.span)
//     dataLayout.encode(
//       {
//         instruction: 6,
//         quantity: size * 10** ids.tokens[0].decimals
//       },
//       data
//     )

//     const instruction = new TransactionInstruction({
//       keys: [
//         { pubkey: fundPDA, isSigner: false, isWritable: true },
//         { pubkey: key, isSigner: true, isWritable: true },
//         { pubkey: new PublicKey(ids.mangoProgramId), isSigner: false, isWritable: false },

//         { pubkey: new PublicKey(ids.publicKey), isSigner: false, isWritable: false },
//         { pubkey: fundState.mango_account, isSigner: false, isWritable: true },
//         { pubkey: fundState.fund_pda, isSigner: false, isWritable: false },
//         { pubkey: mangoGroup.mangoCache , isSigner: false, isWritable: false },
//         { pubkey: new PublicKey(ids.tokens[0].rootKey), isSigner: false, isWritable: false },
//         { pubkey: new PublicKey(ids.tokens[0].nodeKeys[0]), isSigner: false, isWritable: true },
//         { pubkey: nodeBank.vault, isSigner: false, isWritable: true },
//         { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: true },
//         { pubkey: fundState.vault_key, isSigner: false, isWritable: true },
//       ],
//       programId,
//       data
//     });

//     transaction.add(instruction);
//     console.log(`transaction ::: `, transaction)
//     console.log(`walletProvider?.publicKey ::: `, walletProvider?.publicKey.toBase58())
//     transaction.feePayer = key;
//     let hash = await connection.getRecentBlockhash("finalized");
//     console.log("blockhash", hash);
//     transaction.recentBlockhash = hash.blockhash;

//     const sign = await signAndSendTransaction(walletProvider, transaction);
//     console.log("tx::: ", sign)
    
//   }

//     const handleMangoPlace = async () => {
        
    
//         const key = walletProvider?.publicKey;

//       if (!key ) {
//         alert("connect wallet")
//         return;
//       };
//       const fundPDA = await PublicKey.findProgramAddress([walletProvider?.publicKey.toBuffer()], programId)[0];
  
//       let fundStateInfo = await connection.getAccountInfo(fundPDA)
//     let fundState = FUND_DATA.decode(fundStateInfo.data)
//     console.log("fundState:: ", fundState)

//     console.log("vault_balance:: ", fundState.vault_balance.toNumber()/ 10 ** ids.tokens[0].decimals)
//     let nodeBankInfo = await connection.getAccountInfo(new PublicKey(ids.tokens[0].nodeKeys[0]))
//     let nodeBank = NodeBankLayout.decode(nodeBankInfo.data)
//     console.log("nodebank:: ", nodeBank)

//     let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))
//     let mangoGroup = await client.getMangoGroup(new PublicKey(ids.publicKey))
//     let mangoAcc = await client.getMangoAccount(fundState.mango_account, ids.serumProgramId)
//     // let mangoAcc = await client.getMangoAccount(new PublicKey('9rzuDYREjQ1UoiXgU2gJmixik5J2vSn5DoWitzKAmeJm'), ids.serumProgramId)

//     console.log("mangoAcc:: ", mangoAcc)
//     console.log("mangogroup:: ", mangoGroup)
//     let mangoCache = await mangoGroup.loadCache(connection)

//     let perpMarket = await client.getPerpMarket( mangoGroup.perpMarkets[1].perpMarket,  mangoGroup.tokens[1].decimals, mangoGroup.tokens[15].decimals )

//     console.log("perpmarket:: ", perpMarket)

//     console.log("wallet account:: ", walletProvider)
    
//     let rootBanks = await mangoGroup.loadRootBanks(connection)
//     // try {
//     //   let tx = await client.settlePnl(mangoGroup, mangoCache, mangoAcc, perpMarket, rootBanks[15], mangoCache.priceCache[1].price, walletProvider)
//     // }
//     // catch (e) {
//     //   console.error("yooo", e)
//     // }
//     // //console.log("tx:: ", tx)



//     console.log("mangocache:: ", mangoCache)

//     const transaction = new Transaction()
  
//     const dataLayout = struct([u32('instruction'), ns64('price'), ns64('quantity'), nu64('client_order_id'), u8('side'), u8('order_type')])
//     const data = Buffer.alloc(dataLayout.span)
//     dataLayout.encode(
//       {
//         instruction: 8,
//         price: price,
//         quantity: size * 10**4,
//         client_order_id: 333,
//         side: 0,
//         order_type: 0
//       },
//       data
//     )

//     const instruction = new TransactionInstruction({
//       keys: [
//         { pubkey: key, isSigner: true, isWritable: true },
        
//         { pubkey: new PublicKey(ids.mangoProgramId), isSigner: false, isWritable: false },
//         { pubkey: new PublicKey(ids.publicKey), isSigner: false, isWritable: true },
//         { pubkey: fundState.mango_account, isSigner: false, isWritable: true },
//         { pubkey: fundPDA, isSigner: false, isWritable: true },
//         { pubkey: mangoGroup.mangoCache , isSigner: false, isWritable: true },

//         { pubkey: new PublicKey(ids.perpMarkets[0].publicKey) , isSigner: false, isWritable: true },
//         { pubkey: new PublicKey(ids.perpMarkets[0].bidsKey) , isSigner: false, isWritable: true },
//         { pubkey: new PublicKey(ids.perpMarkets[0].asksKey) , isSigner: false, isWritable: true },
//         { pubkey: new PublicKey(ids.perpMarkets[0].eventsKey) , isSigner: false, isWritable: true },

//         { pubkey: SYSTEM_PROGRAM_ID , isSigner: false, isWritable: false },

//       ],
//       programId,
//       data
//     });

//     transaction.add(instruction);
//     console.log(`transaction ::: `, transaction)
//     console.log(`walletProvider?.publicKey ::: `, walletProvider?.publicKey.toBase58())
//     transaction.feePayer = key;
//     let hash = await connection.getRecentBlockhash("finalized");
//     console.log("blockhash", hash);
//     transaction.recentBlockhash = hash.blockhash;

//     const sign = await signAndSendTransaction(walletProvider, transaction);
//     console.log("tx::: ", sign)

//     }

//     const handleMangoClosePosition = async () => {
        
    
//       const key = walletProvider?.publicKey;

//     if (!key ) {
//       alert("connect wallet")
//       return;
//     };
//     const fundPDA = await PublicKey.findProgramAddress([walletProvider?.publicKey.toBuffer()], programId)[0];

//     let fundStateInfo = await connection.getAccountInfo(fundPDA)
//   let fundState = FUND_DATA.decode(fundStateInfo.data)
//   console.log("fundState:: ", fundState)

//   let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))
//   let mangoGroup = await client.getMangoGroup(new PublicKey(ids.publicKey))
//   let mangoAcc = await client.getMangoAccount(fundState.mango_account, ids.serumProgramId)
//   // let mangoAcc = await client.getMangoAccount(new PublicKey('9rzuDYREjQ1UoiXgU2gJmixik5J2vSn5DoWitzKAmeJm'), ids.serumProgramId)

//   let mangoCache = await mangoGroup.loadCache(connection)
//   let price = (mangoCache.priceCache[1].price * 10)
//   let price_adj = mangoAcc.perpAccounts[1].basePosition > 0 ? price * 0.95 : price * 1.05
//   console.log("mangoCAche:: ", mangoCache)

//   console.log("mangoAcc:: ", mangoAcc)
//   console.log("mangogroup:: ", mangoGroup)
 
//   const transaction = new Transaction()

//   const dataLayout = struct([u32('instruction'), ns64('price'), ns64('quantity'), nu64('client_order_id'), u8('side'), u8('order_type')])
//   const data = Buffer.alloc(dataLayout.span)
//   dataLayout.encode(
//     {
//       instruction: 8,
//       price: price_adj,
//       quantity: Math.abs(mangoAcc.perpAccounts[1].basePosition),
//       client_order_id: 333,
//       side: mangoAcc.perpAccounts[1].basePosition < 0 ? 0: 1,
//       order_type: 0
//     },
//     data
//   )

//   const instruction = new TransactionInstruction({
//     keys: [
//       { pubkey: key, isSigner: true, isWritable: true },
      
//       { pubkey: new PublicKey(ids.mangoProgramId), isSigner: false, isWritable: false },
//       { pubkey: new PublicKey(ids.publicKey), isSigner: false, isWritable: true },
//       { pubkey: fundState.mango_account, isSigner: false, isWritable: true },
//       { pubkey: fundPDA[0], isSigner: false, isWritable: true },
//       { pubkey: mangoGroup.mangoCache , isSigner: false, isWritable: true },

//       { pubkey: new PublicKey(ids.perpMarkets[0].publicKey) , isSigner: false, isWritable: true },
//       { pubkey: new PublicKey(ids.perpMarkets[0].bidsKey) , isSigner: false, isWritable: true },
//       { pubkey: new PublicKey(ids.perpMarkets[0].asksKey) , isSigner: false, isWritable: true },
//       { pubkey: new PublicKey(ids.perpMarkets[0].eventsKey) , isSigner: false, isWritable: true },

//       { pubkey: SYSTEM_PROGRAM_ID , isSigner: false, isWritable: false },

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

//   const sign = await signAndSendTransaction(walletProvider, transaction);
//   console.log("tx::: ", sign)

//   }

//     const handleMangoWithdraw = async () => {
        
    
//       const key = walletProvider?.publicKey;

//     if (!key ) {
//       alert("connect wallet")
//       return;
//     };
//     const fundPDA = await PublicKey.findProgramAddress([walletProvider?.publicKey.toBuffer()], programId)[0];
//     let fundStateInfo = await connection.getAccountInfo(fundPDA)
//     let fundState = FUND_DATA.decode(fundStateInfo.data)
//     console.log("fundState:: ", fundState)

//     let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))
//     let mangoGroup = await client.getMangoGroup(new PublicKey(ids.publicKey))
//     console.log("mango group:: ", mangoGroup)

//     let nodeBankInfo = await connection.getAccountInfo(new PublicKey(ids.tokens[0].nodeKeys[0]))
//     let nodeBank = NodeBankLayout.decode(nodeBankInfo.data)
//     console.log("nodebank:: ", nodeBank)

//     const transaction = new Transaction()

//     const dataLayout = struct([u32('instruction'), nu64('quantity')])
//     const data = Buffer.alloc(dataLayout.span)
//     dataLayout.encode(
//       {
//         instruction: 7,
//         quantity: size * 10**ids.tokens[0].decimals
//       },
//       data
//     )

//     const instruction = new TransactionInstruction({
//       keys: [
//         { pubkey: key, isSigner: true, isWritable: true },
//         { pubkey: new PublicKey(ids.mangoProgramId), isSigner: false, isWritable: false },

//         { pubkey: new PublicKey(ids.publicKey), isSigner: false, isWritable: true },
//         { pubkey: fundState.mango_account, isSigner: false, isWritable: true },
//         { pubkey: fundPDA[0], isSigner: false, isWritable: false },
//         { pubkey: mangoGroup.mangoCache , isSigner: false, isWritable: false },
//         { pubkey: new PublicKey(ids.tokens[0].rootKey), isSigner: false, isWritable: false },
//         { pubkey: new PublicKey(ids.tokens[0].nodeKeys[0]), isSigner: false, isWritable: true },
//         { pubkey: nodeBank.vault, isSigner: false, isWritable: true },
//         { pubkey: fundState.vault_key, isSigner: false, isWritable: true }, // Fund Vault
//         { pubkey: mangoGroup.signerKey, isSigner: false, isWritable: true },
//         { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: true },
//         { pubkey: PublicKey.default, isSigner: false, isWritable: true },
//       ],
//       programId,
//       data
//     });

//     transaction.add(instruction);
//     console.log(`transaction ::: `, transaction)
//     console.log(`walletProvider?.publicKey ::: `, walletProvider?.publicKey.toBase58())
//     transaction.feePayer = key;
//     let hash = await connection.getRecentBlockhash("finalized");
//     console.log("blockhash", hash);
//     transaction.recentBlockhash = hash.blockhash;

//     const sign = await signAndSendTransaction(walletProvider, transaction);
//     console.log("tx::: ", sign)

//   }

//   const handleMangoCancelPerp = async () => {
        
    
//     const key = walletProvider?.publicKey;

//   if (!key ) {
//     alert("connect wallet")
//     return;
//   };
//   const fundPDA = await PublicKey.findProgramAddress([walletProvider?.publicKey.toBuffer()], programId)[0];
//   let fundStateInfo = await connection.getAccountInfo(fundPDA)
//   let fundState = FUND_DATA.decode(fundStateInfo.data)
//   console.log("fundState:: ", fundState)

//   let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))
//   let mangoGroup = await client.getMangoGroup(new PublicKey(ids.publicKey))
//   console.log("mango group:: ", mangoGroup)

//   let nodeBankInfo = await connection.getAccountInfo(new PublicKey(ids.tokens[0].nodeKeys[0]))
//   let nodeBank = NodeBankLayout.decode(nodeBankInfo.data)
//   console.log("nodebank:: ", nodeBank)

//   const transaction = new Transaction()

//   const dataLayout = struct([u32('instruction'), nu64('client_order_id'), u8('invalid_ok')])
//   const data = Buffer.alloc(dataLayout.span)
//   dataLayout.encode(
//     {
//       instruction: 9,
//       client_order_id: 333,
//       invalid_ok: 0,
//     },
//     data
//   )

//   const instruction = new TransactionInstruction({
//     keys: [
//       { pubkey: fundPDA, isSigner: false, isWritable: true },
//       { pubkey: key, isSigner: true, isWritable: true },
//       { pubkey: new PublicKey(ids.mangoProgramId), isSigner: false, isWritable: false },

//       { pubkey: new PublicKey(ids.publicKey), isSigner: false, isWritable: true },
//       { pubkey: fundState.mango_account, isSigner: false, isWritable: true },
//       { pubkey: fundPDA[0], isSigner: false, isWritable: false },

//       { pubkey: new PublicKey(ids.perpMarkets[0].publicKey) , isSigner: false, isWritable: true },
//       { pubkey: new PublicKey(ids.perpMarkets[0].bidsKey) , isSigner: false, isWritable: true },
//       { pubkey: new PublicKey(ids.perpMarkets[0].asksKey) , isSigner: false, isWritable: true },
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

//   const sign = await signAndSendTransaction(walletProvider, transaction);
//   console.log("tx::: ", sign)

// }

//   const handleMangoRedeem = async () => {
        
    
//     const key = walletProvider?.publicKey;

//   if (!key ) {
//     alert("connect wallet")
//     return;
//   };
//   const fundPDA = await PublicKey.findProgramAddress([walletProvider?.publicKey.toBuffer()], programId)[0];
//   let fundStateInfo = await connection.getAccountInfo(fundPDA)
//   let fundState = FUND_DATA.decode(fundStateInfo.data)
//   console.log("fundState:: ", fundState)

//   let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))
//   let mangoGroup = await client.getMangoGroup(new PublicKey(ids.publicKey))
//   console.log("mango group:: ", mangoGroup)

//   let perpAcc = await connection.getAccountInfo(new PublicKey(ids.perpMarkets[0].publicKey))
//   let perpMkt = PerpMarketLayout.decode(perpAcc.data)
//   console.log("perpmkt:: ", perpMkt)

//   let nodeBankInfo = await connection.getAccountInfo(new PublicKey(ids.tokens[1].nodeKeys[0]))
//   let nodeBank = NodeBankLayout.decode(nodeBankInfo.data)
//   console.log("nodebank:: ", nodeBank)

//   const transaction = new Transaction()

//   const managerMngoAccount = await createAssociatedTokenAccountIfNotExist(walletProvider, new PublicKey(ids.tokens[1].mintKey), key, transaction);

//   const dataLayout = struct([u32('instruction')])
//   const data = Buffer.alloc(dataLayout.span)
//   dataLayout.encode(
//     {
//       instruction: 4
//     },
//     data
//   )

//   const instruction = new TransactionInstruction({
//     keys: [
//       { pubkey: key, isSigner: true, isWritable: true },
//       { pubkey: new PublicKey(ids.mangoProgramId), isSigner: false, isWritable: false },
//       { pubkey: fundState.mngo_vault_key, isSigner: false, isWritable: true },
//       { pubkey: managerMngoAccount , isSigner: false, isWritable: true },

//       { pubkey: new PublicKey(ids.publicKey), isSigner: false, isWritable: true },
//       { pubkey: mangoGroup.mangoCache , isSigner: false, isWritable: false },
//       { pubkey: fundState.mango_account, isSigner: false, isWritable: true },
//       { pubkey: fundPDA[0], isSigner: false, isWritable: false },
//       { pubkey: new PublicKey(ids.perpMarkets[0].publicKey), isSigner: false, isWritable: false },
//       { pubkey: perpMkt.mngoVault, isSigner: false, isWritable: true },
//       { pubkey: new PublicKey(ids.tokens[1].rootKey), isSigner: false, isWritable: true },
//       { pubkey: new PublicKey(ids.tokens[1].nodeKeys[0]), isSigner: false, isWritable: true },
//       { pubkey: nodeBank.vault, isSigner: false, isWritable: true },
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

//   const sign = await signAndSendTransaction(walletProvider, transaction);
//   console.log("tx::: ", sign)

// }


//     return (
//         <div className="form-div">
//             <h4>Mango Place</h4>
//             Size ::: {' '}
//             <input type="number" value={size} onChange={(event) => setSize(event.target.value)} />
//             <br />
//             Price ::: {' '}
//             <input type="number" value={price} onChange={(event) => setPrice(event.target.value)} />
//             <br />
//             <label htmlFor="side">Buy/Sell</label>

//             <select name="side" width = "100px" onClick={(event) => setSide(event.target.value)}>
//             <option value="buy">Buy</option>
//             <option value="sell">Sell</option>
//             </select>

//             <select name="side" width = "100px" onClick={(event) => setIndex(event.target.value)}>
//             <option value={0}>BTC</option>
//             <option value={1}>ETH</option>
//             <option value={2}>SOL</option>
//             <option value={3}>SRM</option>

//             </select>

//           <button onClick={handleMangoPlace}>Mango Open Position</button>

//           <br />
//           <button onClick={handleMangoDeposit}>Deposit </button>
//           <button onClick={handleMangoWithdraw}>Withdraw </button>

//           <br />
//           <button onClick={handleMangoClosePosition}>Mango Close </button>

//           <br />
//           <button onClick={handleMangoRedeem}>Redeem Mngo </button>

//           <br />
//           <button onClick={handleMangoCancelPerp}>Mango Cancel perp </button>


//         </div>
//     )
// }