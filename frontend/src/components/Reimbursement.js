import { PublicKey, Transaction, TransactionInstruction, create, Account, SystemProgram, Keypair, SYSVAR_RENT_PUBKEY} from '@solana/web3.js';
import React, { useState, useEffect } from 'react'
import { GlobalState } from '../store/globalState';
import { connection, programId, platformStateAccount, FUND_ACCOUNT_KEY, TOKEN_PROGRAM_ID, MANGO_RE_IMBURSEMENT_PROG_ID, SYSTEM_PROGRAM_ID } from '../utils/constants';
import { nu64, struct, u32 } from 'buffer-layout';
import { createKeyIfNotExists, findAssociatedTokenAddress, signAndSendTransaction, createAssociatedTokenAccountIfNotExist, createAccountInstruction } from '../utils/web3';
import { FUND_DATA, INVESTOR_DATA } from '../utils/programLayouts';
import { awaitTransactionSignatureConfirmation, IDS, MangoClient, u64 } from '@blockworks-foundation/mango-client';
import { sendSignedTransactionAndNotify } from '../utils/solanaWeb3';
import { MangoV3ReimbursementClient } from "@blockworks-foundation/mango-v3-reimbursement-lib/dist";
import { AnchorProvider } from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { initializeAccount } from '@project-serum/serum/lib/token-instructions';
import { Config } from "@blockworks-foundation/mango-client";
import { Table } from 'reactstrap';

const GROUP_NUM = 1

export async function tryDecodeTable(reimbursementClient, group) {
  try {
    const table = await reimbursementClient.decodeTable(group.account);
    return table;
  } catch (e) {
    return null;
    //silent error
  }
}

export const Reimbursement = () => {

  const [amount, setAmount] = useState(0);
  const [fundPDA, setFundPDA] = useState('');
  const [funds, setFunds] = useState([]);
  const [claimTokensTable, setClaimTokensTable] = useState([]);
  const [table, setTable] = useState([])
  const [tableIndex, setTableIndex] = useState(0);
  const [row, setRow] = useState({})
  const [mangoV3ReimbursementClient, setMangoV3ReimbursementClient] = useState({})

  const [vault, setVault] = useState('11111111111111111');
  const [USDCBAL, setUSDCBAL] = useState(-1)


  const walletProvider = GlobalState.useState(s => s.walletProvider);
  const ids = IDS['groups'][0]

  const fetchTable = async () => {

    console.log("----------fetchTable")
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

    const result = await mangoV3ReimbursementClient.program.account.group.all()
    console.log('result ::: ', result)
    const group = result.find((group) => group.account.groupNum === GROUP_NUM);
    console.log("group:",group.publicKey.toBase58())

    // const config = Config.ids();
    // const groupIds = IDS.groups.find(f => f.name === 'mainnet.1');
    // console.log('groupIds :: ', groupIds)
    // console.log('config :>> ', config);

      setMangoV3ReimbursementClient(mangoV3ReimbursementClient);



    const table = await tryDecodeTable(mangoV3ReimbursementClient, group);
    console.log('table :>> ', table);
    setTable(table);
  }

  const fetchTableIndexForFund = async () => {

    console.log("----------fetchTableIndexForFund")

    const key = walletProvider?.publicKey;

    if(fundPDA === '') return

    if (!key) {
      alert("connect wallet")
      return;
    };

    const tableIndex = table.findIndex((row) => row.owner.equals(new PublicKey(fundPDA)))
    setTableIndex(tableIndex)
    console.log('table :>> ', table);

    const result = await mangoV3ReimbursementClient.program.account.group.all()
    console.log('result ::: ', result)
    const group = result.find((group) => group.account.groupNum === GROUP_NUM);
    console.log("group:",group.publicKey.toBase58())

    const config = Config.ids();
    const groupIds = IDS.groups.find(f => f.name === 'mainnet.1');
    
    const balancesForUser = table.find((row) =>
        row.owner.equals(new PublicKey(fundPDA))
      )?.balances;
      console.log('balancesForUser :>> ', balancesForUser);
      if (balancesForUser) {
        const indexesToUse = [];
        for (let i in balancesForUser) {
          const isZero = balancesForUser[i].isZero();
          if (!isZero) {
            indexesToUse.push(Number(i));
          }
        }
        const tableInfo = [
          ...indexesToUse.map((idx) => {
            return {
              nativeAmount: balancesForUser[idx],
              mintPubKey: group.account.mints[idx],
              index: idx,
              tableIndex
            };
          }),
        ];
        const mintPks = tableInfo.map((x) => x.mintPubKey);
        const mints = await Promise.all(
          mintPks.map((x) => connection.getParsedAccountInfo(x))
        );
        const mintInfos = {};
        for (let i = 0; i < mintPks.length; i++) {
          const mintPk = mintPks[i];
          mintInfos[mintPk.toBase58()] = {
            decimals: (mints[i].value?.data).parsed.info.decimals,
            symbol: groupIds.tokens.find(
              (x) => x.mintKey === mintPk.toBase58()
            )?.symbol,
          };
        }
        console.log('mintInfos ::: ', mintInfos)
        console.log('tableInfo :>> ', tableInfo);
        setClaimTokensTable(tableInfo)
        console.log('group ::: ', group)
      } else {
        // resetAmountState();
        setClaimTokensTable([])
        console.error("errrrr>>>>>")
      }

  }

  // useEffect(() => {
  //   fetchTable()
  // }, [walletProvider])
  


  const handleInit = async () => {

    try {
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
  
    let signers = [];
    const newAccount = new Account()
    const USDCReimburseVaultTokenAccount = newAccount.publicKey;
    console.log("USDCReimburseVaultTokenAccount:",USDCReimburseVaultTokenAccount.toBase58())
      const somelaps = (await connection.getMinimumBalanceForRentExemption(390));
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: key,
        newAccountPubkey: USDCReimburseVaultTokenAccount,
        lamports: somelaps ,
        space: 165,
        programId : TOKEN_PROGRAM_ID
      })
    )
    transaction.add(
        initializeAccount({
        account: USDCReimburseVaultTokenAccount,
        mint: new PublicKey(ids.tokens[0].mintKey),
        owner : new PublicKey(fundPDA)
      }));
    signers.push(newAccount);

  
    const result = await mangoV3ReimbursementClient.program.account.group.all()
    console.log('result ::: ', result)
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
      { pubkey: group.publicKey, isSigner: false, isWritable: true },
      
      { pubkey: reimbursementAccount, isSigner: false, isWritable: true },

      { pubkey: key, isSigner: true, isWritable: true },
      { pubkey: USDCReimburseVaultTokenAccount, isSigner: false, isWritable: true }, // Investor Base Token Account
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
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
    console.log('signers :>> ', signers);
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

    } catch (error) {
      console.log("errorLLL::",error);
    }
  }

  const handleReimburse = async () => {

    console.log("handleReimburse-------");
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

    const USDCReimburseVaultTokenAccount = fundState.reimbursement_vault_key;
    const result = await mangoV3ReimbursementClient.program.account.group.all()
    console.log('result ::: ', result)
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

    console.log("tableIndex----:",tableIndex)
    const dataLayout = struct([u32('instruction'),nu64('tokenIndex'),nu64('tableIndex')])
    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 19,
        tokenIndex : 15,
        tableIndex : tableIndex,
      },
      data
    )
    const keys =  [
      { pubkey: new PublicKey(fundPDA), isSigner: false, isWritable: true }, //fund State Account
      { pubkey: MANGO_RE_IMBURSEMENT_PROG_ID, isSigner: false, isWritable: false },
      { pubkey: group.publicKey, isSigner: false, isWritable: false },
      { pubkey: new PublicKey('2c9x2g7VUwCd9ppHDV6LxJ1YDb1799MXwvp9SKJe8YXm'), isSigner: false, isWritable: true },
      { pubkey: USDCReimburseVaultTokenAccount, isSigner: false, isWritable: true }, // Investor Base Token Account
      { pubkey: reimbursementAccount, isSigner: false, isWritable: true },

      { pubkey: new PublicKey('4ZNm6giak4pBL9vo5cnGpYDm8MzPwE5fAdaWpAp2boHW'), isSigner: false, isWritable: true },
      { pubkey: new PublicKey('2u3wLVR6EY2P3Pkvcy7uDXdb6gjq5ks9AwrfJ2z6tB2t'), isSigner: false, isWritable: true },
      { pubkey: group?.account.table, isSigner: false, isWritable: false },

      // { pubkey: key, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
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
    console.log(`setting fundPDA :::: `,event.target.value);
    console.log(`setting fundPDA :::: `,fundPDA);
    
    if(!event.target.value){
       console.log(`bk setting fundPDA :::: `,event.target.value, fundPDA);
      return;
    }
    let fundStateInfo = await connection.getAccountInfo(new PublicKey(event.target.value))
    let fundState = FUND_DATA.decode(fundStateInfo.data)
    console.log("fundState:: ", fundState)
    
    const vault = fundState.reimbursement_vault_key;
    console.log("reimbursement_vault_key vault :",vault.toBase58())
    setVault(vault.toBase58());
    
    // const accounts = await findAssociatedTokenAddress(walletProvider?.publicKey, vault)
    if(vault.toBase58() !== '11111111111111111111111111111111'){
      const walletBalance = await connection.getTokenAccountBalance(vault, 'processed')
      const USDCBalance = walletBalance.value.uiAmountString;
      setUSDCBAL(USDCBalance);
    }
  }

  return (
    <div className="form-div">
       <h4>Investor Reimbursement</h4>
      {/*amount ::: {' '}
      <input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /> */}
      <br />
      <label htmlFor="funds">Select Fund Address:</label>

      <select name="funds" width = "100px" onChange={handleFundSelect}>
        {
          funds.map((fund) => {
            return (<option key={fund.fundPDA} value={fund.fundPDA}>{fund.fundPDA}</option>)
          })
        }
      </select>    
      <br /><br />    
      <button onClick={handleInit}>Init </button>
      <button onClick={handleReimburse}>Reimburse </button>
      <br />
      <b>Selected TableIndex  : {tableIndex} </b><br />

      <br /><br />
      <button onClick={handleFunds}>Load Funds</button>
      <button onClick={fetchTable}>Fetch Table</button>
      <button onClick={fetchTableIndexForFund}>Fetch TableIndex for Fund</button>

      <br /><br />

      <b>Selected Fund  : {fundPDA} </b><br />

      <b>Table Len  : {table.length} </b><br />

      <Table>
            <tbody>
              <tr>
                <th>Amount</th>
                <th>mint</th>
                <th>tableIndex</th>
                <th>tokenIndex</th>
              </tr>
              {
                claimTokensTable.length && claimTokensTable.map(t => <>
                <tr>
                <td>{t.nativeAmount.toNumber()}</td>
                <td>{t.mintPubKey.toBase58()}</td>
                <td>{t.tableIndex}</td>
                <td>{t.index}</td>
              </tr>
                </>)
              }
            </tbody>
          </Table>

              {/* selected row : {JSON.stringify(row)} */}
      <br />

      <b>Vault : {vault} </b>
      <br />

      <b>balance USDC : {USDCBAL} </b>
    </div>
  )
}
