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

export const AllFundsInvestors = () => {

  const [investments, setInvestments] = useState([])
  const [funds, setFunds] = useState([])

  const handleGetAllInvestments = async () => {

    //  const userkey = new PublicKey('zRzdC1b2zJte4rMjfaSFZwbnBfL1kNYaTAF4UC4bqpx');
    //  const key = walletProvider?.publicKey;
    let investments = await connection.getProgramAccounts(programId, {
      filters: [
        { dataSize: INVESTOR_DATA.span },
        // {
        //   memcmp: { offset: INVESTOR_DATA.offsetOf('owner'), bytes: userkey.toBase58() }
        // }
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

    for (const data of allFunds) {
      const decodedData = FUND_DATA.decode(data.account.data);

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

        });
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

