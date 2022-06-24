

import { toast } from 'react-toastify';
import React from 'react';
import { getUnixTs } from '@blockworks-foundation/mango-client';

export const TRX_URL = 'https://explorer.solana.com/tx/';

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const doSomething = async ({connection, transaction, wallet, enableSigning = true}) => {
 
  if(!transaction.recentBlockhash) {
    let hash = await connection.getRecentBlockhash();
    transaction.recentBlockhash = hash.blockhash;
  }
  if(enableSigning) {
    transaction = await wallet.signTransaction(transaction);
  }
  const rawTransaction = transaction.serialize();

  const txid = await connection.sendRawTransaction(
    rawTransaction,
    {
      skipPreflight: true,
    },
  );
  return {txid, rawTransaction};
}

export const sendRawTransaction = async ({ connection, txid, rawTransaction }, confirmLevel="confirmed") => {
  const timeout = 120000;
  const startTime = getUnixTs();
  let done = false;
  (async () => {
    await sleep(1000);
    while (!done && getUnixTs() - startTime < timeout) {
      console.log("resending trx...")
      connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
      });
      await sleep(1000);
    }
  })();
  try {
    await awaitTransactionSignatureConfirmation2(
      connection,
      txid,
      timeout,
      confirmLevel,
    );
    // notify(successMessage);
  } catch (err) {
    if (err.timeout) {
      throw new Error("Transaction timed out");
      // notify(txid+" "+ " - Timed out", "error");
    }
    throw new Error("Transaction Failed");
    // notify(txid+" "+failMessage, "error");
  } finally {
    done = true;
  }
}

export const sendSignedTransactionAndNotify = async ({ connection, transaction, successMessage, failMessage, wallet, signature, confirmLevel = 'confirmed', enableSigning = true}) => {
  const {txid, rawTransaction} = await doSomething({connection, transaction, wallet, enableSigning});
  // const txid = '5hQVbhaG5Ybv7GvVSUrzXnSzyVZihQ6ZZZvQj1DFbbABN8cE9mnaxi4ngzFF48FpMDK623rWSeyFmt47zs4pietL';
  // await notifyTrx(txid);
  // const resolveWithSomeData = new Promise(resolve => setTimeout(() => resolve("world"), 5000));
  console.log("trx :", `${TRX_URL}${txid}`)
  await new Promise(function (resolve, reject) {
    toast.promise(
      (async () => {
       try {
          await sendRawTransaction({connection, txid, rawTransaction}, confirmLevel)
          // await resolveWithSomeData;
          resolve(true)
       } catch (error) {
         reject(error)
         throw error
       }
      })(),
      {
        pending: {
          render(){
            return <div className="processing-transaction">
              <div>
                <h2>Processing transction ...{`  `}</h2>
                <a target="_blank" rel="noopener noreferrer" href={`${TRX_URL}${txid}`}> View on explorer</a>
              </div>
            </div>
          },
        },
        success: {
          render({ data }) {
            return <div className="processing-transaction">
              <div>
                <span className="icon green">
                <span className="iconify" data-icon="teenyicons:tick-circle-solid"></span>
                </span>
              </div>
              <div>
                <h2>{successMessage}</h2>
                <a target="_blank" rel="noopener noreferrer" href={`${TRX_URL}${txid}`}> View on explorer</a>
              </div>
            </div>
          },
          icon: false
        },
        error: {
          render({data}){
            // When the promise reject, data will contains the error
            return <div className="processing-transaction">
              <div>
                <span className="icon red">
                <span className="iconify" data-icon="akar-icons:circle-x-fill"></span>
                </span>
              </div>
              <div>
                <h2>{JSON.stringify(data?.message ?? {}).includes('timed') ? data.message : failMessage}</h2>
                <a target="_blank" rel="noopener noreferrer" href={`${TRX_URL}${txid}`}> View on explorer</a>
              </div>
            </div>
          },
          icon: false
        }
      },
      {
        position: "bottom-left",
        autoClose: 4000,
        className: 'processing-transaction'
      }
    )
  })
  // console.log('Latency', txid, getUnixTs() - startTime);
  return txid;
}


export async function awaitTransactionSignatureConfirmation2(connection, txid, timeout, confirmLevel = 'confirmed') {
  let done = false;

  const confirmLevels = ['finalized'];

  if (confirmLevel === 'confirmed') {
    confirmLevels.push('confirmed');
  } else if (confirmLevel === 'processed') {
    confirmLevels.push('confirmed');
    confirmLevels.push('processed');
  }
  const result = await new Promise((resolve, reject) => {
    (async () => {
      setTimeout(() => {
        if (done) {
          return;
        }
        done = true;
        // console.log('Timed out for txid', txid);
        reject({ timeout: true });
      }, timeout);
      try {
        connection.onSignature(
          txid,
          (result) => {
            // console.log('WS confirmed', txid, result);
            done = true;
            if (result.err) {
              reject(result.err);
            } else {
              resolve(result);
            }
          },
          'processed',
        );
        // console.log('Set up WS connection', txid);
      } catch (e) {
        done = true;
        // console.log('WS error in setup', txid, e);
      }
      while (!done) {
        // eslint-disable-next-line no-loop-func
        (async () => {
          try {
            const signatureStatuses = await connection.getSignatureStatuses([txid]);
            const result = signatureStatuses && signatureStatuses.value[0];
            if (!done) {
              if (!result) {
                // console.log('REST null result for', txid, result);
              } else if (result.err) {
                // console.log('REST error for', txid, result);
                done = true;
                reject(result.err);
              } else if (!(result.confirmations || confirmLevels.includes(result.confirmationStatus))) {
                // console.log('REST not confirmed', txid, result);
              } else {
                // console.log('REST confirmed', txid, result);
                done = true;
                resolve(result);
              }
            }
          } catch (e) {
            if (!done) {
              console.log('REST connection error: txid', txid, e);
            }
          }
        })();
        await sleep(1000);
      }
    })();
  });

  done = true;
  return result;
}