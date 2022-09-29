import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import React, { useEffect, useState } from 'react'
import { GlobalState } from '../store/globalState';

import { adminAccount, connection, FUND_ACCOUNT_KEY, programId } from '../utils/constants';
import { blob, nu64, struct, u32, u8 } from 'buffer-layout';
import { FUND_DATA, SPL_TOKEN_MINT_DATA } from '../utils/programLayouts';

import { Card, Col, Row ,Table} from 'reactstrap';
import { IDS, MangoClient, I80F48, NodeBankLayout, PerpAccountLayout, PerpMarketLayout ,RootBankCacheLayout, RootBankLayout} from '@blockworks-foundation/mango-client';


export const DisplayInfo = (props) => {

   const ids = IDS['groups'][0]
   const [fundAddress, setFundAddress] = useState('')
   const [fundData, setFundData] = useState("");
   const [mangoGroup, setMangoGroup] = useState({})
   const [mangoAccount, setMangoAccount] = useState('7BLzTNvjNjaCnZ2Nnpu1aFYqTBsL8Lz2FUxknSAZ8tDX')
   const [mangoAccountData, setMangoAccountData] = useState({})
   const [nodeBank, setNodeBank] = useState({})
   const [rootBank, setRootBank] = useState({})
   const walletProvider = GlobalState.useState(s => s.walletProvider);
  
const programIdX = programId.toBase58();
const adminAccountX = adminAccount.toBase58();
// const platformStateAccountX = platformStateAccount.toBase58();
// const priceStateAccountX = priceStateAccount.toBase58();

const handleGetFundData = async () => {

  if(!walletProvider) {
    alert("connect wallet ")
    return;
  }
  
  // const key = new PublicKey('zRzdC1b2zJte4rMjfaSFZwbnBfL1kNYaTAF4UC4bqpx');
  const key = walletProvider?.publicKey;  
  if (!key ) {
    alert("connect wallet ")
    return;
  }
  const fundPDA = (await PublicKey.findProgramAddress([walletProvider?.publicKey.toBuffer()], programId))[0];
  console.log("fundPDA::",fundPDA.toBase58())
  setFundAddress(fundPDA.toBase58())


    const fundDataAcc = await connection.getAccountInfo(fundPDA);
    console.log("fundDataAcc::",fundDataAcc);
    if (fundDataAcc == null)
    {
       alert("fundDataAcc info not found")
      return;
    }
    const fundData = FUND_DATA.decode(fundDataAcc.data)
    console.error("fundData::",fundData);
    setFundData(fundData);
}

const getAllDecodeMangoData = async () => {
    let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))
    let mangoGroup = await client.getMangoGroup(new PublicKey(ids.publicKey))
    console.log("mango group:: ", mangoGroup)
    let mangoGroupDecoded = {};
    mangoGroupDecoded.admin = mangoGroup.admin.toBase58();
    mangoGroupDecoded.dexProgramId = mangoGroup.dexProgramId.toBase58();
    mangoGroupDecoded.insuranceVault = mangoGroup.insuranceVault.toBase58();
    mangoGroupDecoded.mangoCache = mangoGroup.mangoCache.toBase58();

    mangoGroupDecoded.msrmVault = mangoGroup.msrmVault.toBase58();
    mangoGroupDecoded.numOracles = mangoGroup.numOracles.toString();

    mangoGroupDecoded.oracles =  mangoGroup.oracles.map( i => i.toBase58());

    mangoGroupDecoded.perpMarkets =  mangoGroup.perpMarkets.map( i => {
      return {
        baseLotSize: i.baseLotSize.toString(),
        initAssetWeight: i.initAssetWeight.toString(),
        initLiabWeight: i.initLiabWeight.toString(),
        liquidationFee: i.liquidationFee.toString(),
        maintAssetWeight: i.maintAssetWeight.toString(),
        maintLiabWeight: i.maintLiabWeight.toString(),
        makerFee: i.makerFee.toString(),
        perpMarket:  i.perpMarket.toBase58(),
        quoteLotSize: i.quoteLotSize.toString(),
        takerFee:  i.takerFee.toString(),
      }
    });

    mangoGroupDecoded.spotMarkets =  mangoGroup.spotMarkets.map( i => {
      return {
        initAssetWeight: i.initAssetWeight.toString(),
        initLiabWeight: i.initLiabWeight.toString(),
        liquidationFee: i.liquidationFee.toString(),
        maintAssetWeight: i.maintAssetWeight.toString(),
        maintLiabWeight: i.maintLiabWeight.toString(),
        spotMarket:  i.spotMarket.toBase58(),
      }
    });

    mangoGroupDecoded.tokens =  mangoGroup.tokens.map( i => {
      return {
        decimals: i.decimals,
        mint: i.mint.toBase58(),
        rootBank: i.rootBank.toBase58(),
      }
    });
    setMangoGroup(mangoGroupDecoded)
    console.error("mango group DECODED**:: ", mangoGroupDecoded)


    let nodeBankInfo = await connection.getAccountInfo(new PublicKey(ids.tokens[0].nodeKeys[0]))
    let nodeBank = NodeBankLayout.decode(nodeBankInfo.data)
    console.log("nodebank:: ", nodeBank)
    let nodeBankDecode = {
      borrows:  nodeBank.borrows.toString(),
      deposits: nodeBank.deposits.toString(),
      vault: nodeBank.vault.toBase58()
    }
    setNodeBank(nodeBankDecode)
    console.error("nodeBankDecode:: ", nodeBankDecode)

    let rootBankInfo = await connection.getAccountInfo(new PublicKey(ids.tokens[0].rootKey))
    let rootBank = RootBankLayout.decode(rootBankInfo.data)
    console.log("rootBank:: ", rootBank)
    let rootBankDecode = {
      optimalUtil:  rootBank.optimalUtil.toString(),
      optimalRate: rootBank.optimalRate.toString(),
      maxRate: rootBank.maxRate.toString(),
      depositIndex:  rootBank.depositIndex.toString(),
      borrowIndex: rootBank.borrowIndex.toString(),
      lastUpdated: rootBank.lastUpdated.toString(),
    }
    setRootBank(rootBankDecode)
    console.error("rootBankDecode:: ", rootBankDecode)

    return;
}

const getMangoAccountData = async () => {
  let client = new MangoClient(connection, new PublicKey(ids.mangoProgramId))
  console.log("Fetched Client")
  let mangoAcc = await client.getMangoAccount(new PublicKey(mangoAccount), new PublicKey(ids.serumProgramId))
  console.log("mangoAccount:: ", mangoAccount)

  let mangoAccountDecoded = {};
  mangoAccountDecoded.mangoGroup = mangoAcc.mangoGroup.toBase58();
  mangoAccountDecoded.borrows = mangoAcc.borrows.map( i => i.toString());
  mangoAccountDecoded.clientOrderIds = mangoAcc.clientOrderIds.map( i => i.toString());
  mangoAccountDecoded.deposits = mangoAcc.deposits.map( i => i.toString());
  mangoAccountDecoded.orders = mangoAcc.orders.map( i => i.toString());

  mangoAccountDecoded.perpAccounts =  mangoAcc.perpAccounts.map( i => {
    return {
      asksQuantity: i.asksQuantity.toString(),
      basePosition: i.basePosition.toString(),
      bidsQuantity: i.bidsQuantity.toString(),
      longSettledFunding: i.longSettledFunding.toString(),
      mngoAccrued: i.mngoAccrued.toString(),
      quotePosition: i.quotePosition.toString(),
      shortSettledFunding: i.shortSettledFunding.toString(),
      takerBase: i.takerBase.toString(),
      takerQuote: i.takerQuote.toString(),
    }
  });
  mangoAccountDecoded.spotOpenOrders = mangoAcc.spotOpenOrders.map( i => i.toBase58());
  setMangoAccountData(mangoAccountDecoded)
  console.error("mangoAccountDecoded DECODED**:: ", mangoAccountDecoded)

}


  return (
    <div className="form-div">
    <h4>Accounts</h4>
      <p> programID : {programIdX}</p>
      <p> adminAccount : {adminAccountX}</p>
      <p> fundAddress : {fundAddress}</p>


   
     <hr/>
     <h4>FUND DATA </h4>
     <button onClick={handleGetFundData}>GET FUND STATE</button>
      {
        fundData &&
          <>
            <p> signer_nonce  : {fundData.signer_nonce}</p>
          
            <p> no_of_investments : {fundData.no_of_investments}</p>
           <br/>

            <p> min_amount  : {fundData.min_amount.toString()}</p>
            <p> performance_fee_percentage  : {fundData.performance_fee_percentage.toString()}</p>
         
            <p> total_amount in fund USDC  : {fundData.total_amount.toString()}</p>
            <p> current_index  : {fundData.current_index.toString()}</p>
            <br/>

            <p> pending_deposits  : {fundData.pending_deposits.toString()}</p>
            <p> pending_withdrawals  : {fundData.pending_withdrawals.toString()}</p>

            <p> manager_account  : {fundData.manager_account.toBase58()}</p>
            <p> usdc_vault_key  : {fundData.usdc_vault_key.toBase58()}</p>
            <p> mango_account  : {fundData.mango_account.toBase58()}</p>
            <p> delegate  : {fundData.delegate.toBase58()}</p>
            <p> Lockup  : {fundData.lockup.toString()}</p>

            <br/>
           
          </>
      }






      <hr/>
        Mango account  ::: {' '}
        <input type="text" value={mangoAccount} onChange={(event) => setMangoAccount(event.target.value)} />
        <button onClick={getMangoAccountData}>GET  MANGO ACC DATA </button>
        <br />
      {
        mangoAccount && mangoAccountData &&
        <>
         <h4>MANGO ACC :{mangoAccount} </h4>
            <p> mangoGroup : {mangoAccountData.admin}</p>
            <b> borrows :</b>
            <p>
             { 
             mangoAccountData?.borrows?.length &&
             mangoAccountData.borrows.map((i,x)=> <> {x} = {i} <b>_||_</b></>  )
                }
            </p>
           <b> clientOrderIds :</b>
           { mangoAccountData?.clientOrderIds && mangoAccountData?.clientOrderIds.map((i,x)=> <>{x} = {i} <b>_||_</b></>  )}
           <br/>
           <b> deposits :</b>
           { mangoAccountData?.deposits && mangoAccountData?.deposits.map((i,x)=> <>{x} = {i} <b>_||_</b></>  )}
           <br/>
  
           <b> orders :</b>
           { mangoAccountData?.orders && mangoAccountData?.orders.map((i,x)=> <>{x} = {i} <b>_||_</b></>  )}
           <br/>
          
           <b> spotOpenOrders :</b>
           { mangoAccountData?.spotOpenOrders && mangoAccountData?.spotOpenOrders.map((i,x)=> <>{x} = {i} <b>_||_</b></>  )}
           <br/>

           <b>perpAccounts</b>
            {
                 mangoAccountData.perpAccounts?.length &&
                 <Table  className="tablesorter" responsive width="100%" style={{ overflow: 'hidden !important', textAlign: 'center' }}
                    >
                        <thead className="text-primary">
                                        <tr>
                                        <th style={{ width: "15%" }}>index</th>

                                        <th style={{ width: "15%" }}>asksQuantity</th>
                                          <th style={{ width: "15%" }}>basePosition</th>
                                          <th style={{ width: "15%" }}>bidsQuantity</th>
                                          <th style={{ width: "15%" }}>longSettledFunding</th>
                                          <th style={{ width: "15%" }}>mngoAccrued</th>
                                          <th style={{ width: "15%" }}>quotePosition</th>

                                          <th style={{ width: "15%" }}>shortSettledFunding</th>
                                          <th style={{ width: "15%" }}>takerBase</th>
                                          <th style={{ width: "15%" }}>takerQuote</th>

                                        </tr>
                        </thead>
                        <tbody>
                          {
                            mangoAccountData.perpAccounts && 
                            mangoAccountData.perpAccounts.map((i,x)=>{
                              return <tr key={x}>
                                <td >{x}</td>

                                <td >{i?.asksQuantity}</td>
                                <td >{i?.basePosition}</td>
                                <td >{i?.bidsQuantity}</td>
                                <td >{i?.longSettledFunding}</td>
                                <td >{i?.mngoAccrued}</td>
                                <td >{i?.quotePosition}</td>

                                <td >{i?.shortSettledFunding}</td>
                                <td >{i?.takerBase}</td>
                                <td >{i?.takerQuote}</td>
                               
                              </tr>
                            })
                          }
                        </tbody>
                </Table>
            }
  
        
        </>
      }





      <hr/>
      <h4>MANGO GRP </h4>
      <button onClick={getAllDecodeMangoData}>GET ALL MANGO DATA </button>
      {
        mangoGroup &&
          <>
           
            <p> admin : {mangoGroup.admin}</p>
            <p> dexProgramId : {mangoGroup.dexProgramId}</p>
            <p> insuranceVault : {mangoGroup.insuranceVault}</p>
            <p> mangoCache : {mangoGroup.mangoCache}</p>
            <p> msrmVault : {mangoGroup.msrmVault}</p>

            <p> numOracles : {mangoGroup.numOracles}</p>
            <b>mangoGroup-oracles</b>
            <ul>
            {
              mangoGroup.oracles &&
              mangoGroup.oracles.map((i,x)=> <li key={x}> <b>{x}</b> {i}</li> )
            }
            </ul>

            <b>spotMarkets</b>
            {
                 mangoGroup.spotMarkets?.length &&
                 <Table  className="tablesorter" responsive width="100%" style={{ overflow: 'hidden !important', textAlign: 'center' }}
                    >
                        <thead className="text-primary">
                                        <tr>
                                        <th style={{ width: "15%" }}>initAssetWeight</th>
                                          <th style={{ width: "15%" }}>initLiabWeight</th>
                                          <th style={{ width: "15%" }}>liquidationFee</th>
                                          <th style={{ width: "15%" }}>maintAssetWeight</th>
                                          <th style={{ width: "15%" }}>maintLiabWeight</th>
                                          <th style={{ width: "15%" }}>spotMarket</th>
                                        </tr>
                        </thead>
                        <tbody>
                          {
                            mangoGroup.spotMarkets && 
                            mangoGroup.spotMarkets.map((i,x)=>{
                              return <tr key={x}>
                                <td >{i?.initAssetWeight}</td>
                                <td >{i?.initLiabWeight}</td>
                                <td >{i?.liquidationFee}</td>
                                <td >{i?.maintAssetWeight}</td>
                                <td >{i?.maintLiabWeight}</td>
                                <td >{i?.spotMarket}</td>
                               
                              </tr>
                            })
                          }
                        </tbody>
                </Table>
            }
            <b>TOKENS</b>
             {
                 mangoGroup.tokens?.length &&
                 <Table  className="tablesorter" responsive width="100%" style={{ overflow: 'hidden !important', textAlign: 'center' }}
                    >
                        <thead className="text-primary">
                                        <tr>
                                          <th style={{ width: "15%" }}>mint</th>
                                          <th style={{ width: "15%" }}>rootBank</th>
                                          <th style={{ width: "15%" }}>decimals</th>
                                        </tr>
                        </thead>
                        <tbody>
                          {
                            mangoGroup.tokens && 
                            mangoGroup.tokens.map((i,x)=>{
                              return <tr key={x}>
                                <td >{i?.mint}</td>
                                <td >{i?.rootBank}</td>
                                <td >{i?.decimals}</td>
                              </tr>
                            })
                          }
                        </tbody>
                </Table>
            }

           </> 
      }
      <h4>USDC NODE BANK {ids.tokens[0].nodeKeys[0]}</h4>
      {nodeBank && 
        <>
            <p> borrows : {nodeBank.borrows}</p>
            <p> deposits : {nodeBank.deposits}</p>
            <p> vault : {nodeBank.vault}</p>
        </>
      }
      <h4>USDC ROOT BANK {ids.tokens[0].rootKey}</h4>
      {rootBank && 
        <>
            <p> depositIndex : {rootBank.depositIndex}</p>
            <p> borrowIndex : {rootBank.borrowIndex}</p>
            <p> lastUpdated : {rootBank.lastUpdated}</p>
            <p> maxRate : {rootBank.maxRate}</p>
            <p> optimalUtil : {rootBank.optimalUtil}</p>
            <p> optimalRate : {rootBank.optimalRate}</p>

        </>
      }

      
   
  </div>
  )
}

