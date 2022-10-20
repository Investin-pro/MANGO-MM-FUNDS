import React, { useEffect, useState } from 'react'
import { createAssociatedTokenAccount, createAssociatedTokenAccountIfNotExist, createKeyIfNotExists, createTokenAccountIfNotExist, findAssociatedTokenAddress, setWalletTransaction, signAndSendTransaction } from '../utils/web3'
import { connection, FUND_ACCOUNT_KEY, platformStateAccount, PLATFORM_ACCOUNT_KEY, programId } from '../utils/constants'
import { GlobalState } from '../store/globalState';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@project-serum/serum/lib/token-instructions';
import { FUND_DATA, INVESTOR_DATA, PLATFORM_DATA, SPL_TOKEN_MINT_DATA, U64F64 } from '../utils/programLayouts';
import { Badge } from 'reactstrap';
import BN from 'bn.js';
import { Card, Col, Row, Table } from 'reactstrap';
import { Blob, seq, struct, u32, u8, u16, ns64, nu64 } from 'buffer-layout';
import { MangoClient } from '@blockworks-foundation/mango-client';
import bs58 from 'bs58';

export const AllFundsInvestors = () => {

  const [investments, setInvestments] = useState([])
  const [funds, setFunds] = useState([])

  const handleGetAllInvestments = async () => {

    //  const userkey = new PublicKey('zRzdC1b2zJte4rMjfaSFZwbnBfL1kNYaTAF4UC4bqpx');
    //  const key = walletProvider?.publicKey;
    let investments = await connection.getProgramAccounts(programId, {
      filters: [
        { dataSize: INVESTOR_DATA.span },
        {
          // memcmp: { offset: INVESTOR_DATA.offsetOf('owner'), bytes: userkey.toBase58() },
        memcmp : { offset : INVESTOR_DATA.offsetOf('investment_status') , bytes : bs58.encode((new BN(1, 'le')).toArray())}
        }
      ]
    });
    // console.log("investments::",investments)
    const newInvestors = []
    for (const investment of investments) {
      const invStateData = INVESTOR_DATA.decode(investment.account.data)
      invStateData['ivnStatePubKey'] = investment.pubkey;
      if (invStateData.is_initialized) {
        newInvestors.push(invStateData)
      }
    }
    console.log("newInvestors::", newInvestors)
    setInvestments(newInvestors);
  }

  const handleGetAllFunds = async () => {
    const managers = []
    const allFunds = await connection.getProgramAccounts(programId, { filters: [{ dataSize: FUND_DATA.span }] });
    console.log("allFunds len",allFunds.length);
    const MANGO_PROGRAM_ID_V3 = new PublicKey('mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68');
    const SERUM_PROGRAM_ID_V3 = new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin');
    const MANGO_GROUP_ACCOUNT_V3 = new PublicKey('98pjRuQjK3qA6gXts96PqZT4Ze5QmnCmt3QYjhbUSPue');

    const client = new MangoClient(connection, MANGO_PROGRAM_ID_V3)
    let mangoGroup = await client.getMangoGroup(MANGO_GROUP_ACCOUNT_V3)
    const mangoCache = await mangoGroup.loadCache(connection);
    const rootBanks = await mangoGroup.loadRootBanks(connection) // necessay for loading deposit rates

    for (const data of allFunds) {
      const decodedData = FUND_DATA.decode(data.account.data);
      let mangoAccount = await client.getMangoAccount(decodedData.mango_account, SERUM_PROGRAM_ID_V3)

      if (decodedData.is_initialized) {
        managers.push({
          fundState: decodedData,
          fundPDA: data.pubkey.toBase58(),
          no_of_investments: decodedData.no_of_investments,
          min_amount: decodedData.min_amount.toString(),
          performance_fee_percentage: decodedData.performance_fee_percentage.toString(),
          total_amount: decodedData.total_amount.toString(),

          current_index: decodedData.current_index.toString(),

          pending_deposits: decodedData.pending_deposits.toString(),
          pending_withdrawals: decodedData.pending_withdrawals.toString(),


          manager_account: decodedData.manager_account.toBase58(),
          usdc_vault_key: decodedData.usdc_vault_key.toBase58(),
          mango_account: decodedData.mango_account.toBase58(),
          delegate: decodedData.delegate.toBase58(),

          index0: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[0], mangoGroup, 0)).toFixed(6),
          index1: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[1], mangoGroup, 1)).toFixed(6),
          index2: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[2], mangoGroup, 2)).toFixed(6),
          index3: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[3], mangoGroup, 3)).toFixed(6),
          index4: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[4], mangoGroup, 4)).toFixed(6),
          index5: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[5], mangoGroup, 5)).toFixed(6),
          index6: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[6], mangoGroup, 6)).toFixed(6),
          // index7: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[7], mangoGroup, 7)).toFixed(6),
          index8: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[8], mangoGroup, 8)).toFixed(6),
          // index9: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[9], mangoGroup, 9)).toFixed(6),
          index10: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[10], mangoGroup, 10)).toFixed(6),
          index11: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[11], mangoGroup, 11)).toFixed(6),
          index12: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[12], mangoGroup, 12)).toFixed(6),
          // index13: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[13], mangoGroup, 13)).toFixed(6),
          index14: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[14], mangoGroup, 14)).toFixed(6),
          index15: (mangoAccount.getUiDeposit(mangoCache.rootBankCache[15], mangoGroup, 15)).toFixed(6),

        });
      } else {
        console.log("not init fund :",data.pubkey.toBase58())
      }
    }
    console.log("managers:", managers);
    setFunds(managers);
  }

  return (
    <div className="form-div">
      <Card className="justify-content-center">
        <Row className="justify-content-between">
          <Col lg="12" xs="12">
            <h4>Investments</h4>
            <button onClick={handleGetAllInvestments}> get All Investments</button>

            <Table
              className="tablesorter"
              responsive
              width="100%"
              style={{ overflow: 'hidden !important', textAlign: 'center' }}
            >
              <thead className="text-primary">
                <tr>
                  <th style={{ width: "15%" }}>index</th>
                  <th style={{ width: "15%" }}>ivnStatePubKey</th>
                  <th style={{ width: "15%" }}>fund</th>
                  <th style={{ width: "15%" }}>owner</th>
                  <th style={{ width: "15%" }}>investment_status</th>
                  <th style={{ width: "15%" }}>amount</th>
                  <th style={{ width: "15%" }}>start_index</th>

                

                
                </tr>
              </thead>
              <tbody>
                {
                  investments &&

                  investments.map((i, x) => {
                    return <tr key={i?.ivnStatePubKey?.toBase58()}>
                      <td >{x}</td>
                      <td >{i?.ivnStatePubKey?.toBase58()}</td>
                      <td >{i?.fund?.toBase58()}</td>
                      <td >{i?.owner?.toBase58()}</td>
                      <td>{i?.investment_status}</td>
                      <td>{i?.amount?.toString() / 10 ** 6}</td>
                      <td>{i?.start_index?.toString()}</td>

                  

                    </tr>
                  })
                }
              </tbody>
            </Table>


          </Col>
        </Row>
        <Row className="justify-content-between">
          <Col lg="12" xs="12">
            <h4>Funds</h4>

            <button onClick={handleGetAllFunds}> get All Funds</button>

            <Table
              className="tablesorter"
              responsive
              width="100%"
              style={{ overflow: 'hidden !important', textAlign: 'center' }}
            >
              <thead className="text-primary">
                <tr>
                  <th style={{ width: "15%" }}>index</th>
                  <th style={{ width: "15%" }}>fundManager</th>
                  <th style={{ width: "15%" }}>fundPDA</th>

                  <th style={{ width: "15%" }}>min_amount</th>
                  <th style={{ width: "15%" }}>performance_fee_percentage</th>
                  <th style={{ width: "15%" }}>total_amount</th>

                  <th style={{ width: "15%" }}>current_index</th>
                  <th style={{ width: "15%" }}>mango_account</th>

                  <th style={{ width: "15%" }}>0</th>
                  <th style={{ width: "15%" }}>1</th>
                  <th style={{ width: "15%" }}>2</th>
                  <th style={{ width: "15%" }}>3</th>
                  <th style={{ width: "15%" }}>4</th>
                  <th style={{ width: "15%" }}>5</th>
                  <th style={{ width: "15%" }}>6</th>
                  {/* <th style={{ width: "15%" }}>7</th> */}
                  <th style={{ width: "15%" }}>8</th>
                  {/* <th style={{ width: "15%" }}>9</th> */}
                  <th style={{ width: "15%" }}>10</th>
                  <th style={{ width: "15%" }}>11</th>
                  <th style={{ width: "15%" }}>12</th>
                  {/* <th style={{ width: "15%" }}>13</th> */}
                  <th style={{ width: "15%" }}>14</th>
                  <th style={{ width: "15%" }}>15</th>

                </tr>
              </thead>


              <tbody>
                {
                  funds &&

                  funds.map((i, x) => {
                    return <tr key={x}>
                      <td >{x}</td>
                      <td >{i?.manager_account}</td>
                      <td >{i?.fundPDA}</td>

                      <td >{i?.min_amount}</td>
                      <td >{i?.performance_fee_percentage}</td>
                      <td >{i?.total_amount}</td>
                      <td >{i?.current_index}</td>
                      <td >{i?.mango_account}</td>

                      <td >{i?.index0}</td>
                      <td >{i?.index1}</td>
                      <td >{i?.index2}</td>
                      <td >{i?.index3}</td>
                      <td >{i?.index4}</td>
                      <td >{i?.index5}</td>
                      <td >{i?.index6}</td>
                      {/* <td >{i?.index7}</td> */}
                      <td >{i?.index8}</td>
                      {/* <td >{i?.index9}</td> */}
                      <td >{i?.index10}</td>
                      <td >{i?.index11}</td>
                      <td >{i?.index12}</td>
                      {/* <td >{i?.index13}</td> */}
                      <td >{i?.index14}</td>
                      <td >{i?.index15}</td>

                    </tr>
                  })
                }
              </tbody>
            </Table>

          </Col>
        </Row>
      </Card>
    </div>
  )
}

