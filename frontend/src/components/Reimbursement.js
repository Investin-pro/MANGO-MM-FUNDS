import { PublicKey, Transaction, TransactionInstruction, create, Account, SystemProgram} from '@solana/web3.js';
import React, { useState } from 'react'
import { GlobalState } from '../store/globalState';
import { connection, programId, platformStateAccount, FUND_ACCOUNT_KEY, TOKEN_PROGRAM_ID, MANGO_RE_IMBURSEMENT_PROG_ID, SYSTEM_PROGRAM_ID } from '../utils/constants';
import { nu64, struct, u32 } from 'buffer-layout';
import { createKeyIfNotExists, findAssociatedTokenAddress, signAndSendTransaction, createAssociatedTokenAccountIfNotExist, createAccountInstruction } from '../utils/web3';
import { FUND_DATA, INVESTOR_DATA } from '../utils/programLayouts';
import { awaitTransactionSignatureConfirmation, IDS, MangoClient } from '@blockworks-foundation/mango-client';
import { sendSignedTransactionAndNotify } from '../utils/solanaWeb3';
import { MangoV3ReimbursementClient } from "@blockworks-foundation/mango-v3-reimbursement-lib/dist";
import { AnchorProvider } from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { initializeAccount } from '@project-serum/serum/lib/token-instructions';

export const Reimbursement = () => {

  const [amount, setAmount] = useState(0);
  const [fundPDA, setFundPDA] = useState('');
  const [funds, setFunds] = useState([]);


  const walletProvider = GlobalState.useState(s => s.walletProvider);
  const ids = IDS['groups'][0]


  const handleInit = async () => {

    const key = walletProvider?.publicKey;

    if (!key) {
      alert("connect wallet")
      return;
    };

    // MangoV3ReimbursementClient
    const options = AnchorProvider.defaultOptions();
    const provider = new AnchorProvider(
      connection,
      walletProvider,
      options
    );
    const mangoV3ReimbursementClient = new MangoV3ReimbursementClient(provider);


    console.log('selected FundPDA::', fundPDA)
  
    let fundStateInfo = await connection.getAccountInfo(new PublicKey(fundPDA))
    let fundState = FUND_DATA.decode(fundStateInfo.data)
    console.log("fundState:: ", fundState)

    const transaction = new Transaction();
  
    // const openOrdersLamports = await connection.getMinimumBalanceForRentExemption(
    //       INVESTOR_DATA.span,
    //       'singleGossip'
    //     )
    // const investerStateAccount = await createAccountInstruction(connection, key, INVESTOR_DATA.span, programId, openOrdersLamports, transaction, signers);
    let signers = [];
    const newAccount = new Account()
    const USDCReimburseVaultTokenAccount = newAccount.publicKey;
    console.log("USDCReimburseVaultTokenAccount:",USDCReimburseVaultTokenAccount.toBase58())

    // transaction.add(
    //   SystemProgram.createAccount({
    //     fromPubkey: key,
    //     newAccountPubkey: USDCReimburseVaultTokenAccount,
    //     lamports: (await connection.getMinimumBalanceForRentExemption(390)),
    //     space: 390,
    //     programId : TOKEN_PROGRAM_ID
    //   })
    // )
    // transaction.add(
    //     initializeAccount({
    //     account: USDCReimburseVaultTokenAccount,
    //     mint: new PublicKey(ids.tokens[0].mintKey),
    //     owner : new PublicKey(fundPDA)
    //   }));
    // signers.push(newAccount);

    const GROUP_NUM = 1
    const result = await mangoV3ReimbursementClient.program.account.group.all()
    const group = result.find((group) => group.account.groupNum === GROUP_NUM);
    console.log("group:",group.publicKey.toBase58())

    const reimbursementAccount = (
      await PublicKey.findProgramAddress(
        [
          Buffer.from("ReimbursementAccount"),
          group.publicKey.toBuffer(),
          (new PublicKey(fundPDA)).toBuffer(),
        ],
        mangoV3ReimbursementClient.program.programId
      )
    )[0]
    console.log("reimbursementAccount:",reimbursementAccount.toBase58())



    const dataLayout = struct([u32('instruction')])
    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 18,
      },
      data
    )
    const keys =  [
      { pubkey: new PublicKey(fundPDA), isSigner: false, isWritable: true }, //fund State Account
      { pubkey: MANGO_RE_IMBURSEMENT_PROG_ID, isSigner: false, isWritable: false },
      { pubkey: group.publicKey, isSigner: true, isWritable: true },
      
      { pubkey: reimbursementAccount, isSigner: false, isWritable: true },

      { pubkey: key, isSigner: true, isWritable: true },
      { pubkey: USDCReimburseVaultTokenAccount, isSigner: false, isWritable: true }, // Investor Base Token Account
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false }
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
    transaction.recentBlockhash = hash.blockhash;
    console.log("tx", transaction);
    // transaction.setSigners(key);
    // transaction.partialSign(...signers)

    const sign = await signAndSendTransaction(walletProvider, transaction);
    console.log("signature tx:: ", sign)
    await awaitTransactionSignatureConfirmation(sign, 120000, connection, 'finalized')
   

      // try {
      //     await sendSignedTransactionAndNotify({
      //         connection,
      //         transaction: transaction,
      //         successMessage: "Investment successful",
      //         failMessage: "Investment unsuccessful",
      //         wallet: walletProvider
      //     })
      // } catch (error) {
      //     console.error('handleMakeInvestment: ', error);
      // }

  }

  const handleReimburse = async () => {

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
    // transaction.setSigners(key);
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
      // console.log(`PDA[0]`, PDA)
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
      {/* <h4>Investor Reimbursement</h4>
      amount ::: {' '}
      <input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /> */}
      <br />
      <label htmlFor="funds">Select Fund Address:</label>

      <select name="funds" width = "100px" onClick={handleFundSelect}>
        {
          funds.map((fund) => {
            return (<option key={fund.fundPDA} value={fund.fundPDA}>{fund.fundPDA}</option>)
          })
        }
      </select>
      <button onClick={handleInit}>Init </button>
      <button onClick={handleReimburse}>Reimburse </button>

      <button onClick={handleFunds}>Load Funds</button>
    </div>
  )
}
