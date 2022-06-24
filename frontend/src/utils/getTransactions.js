export class TransactionWithSignature {
  constructor(
    signature,
    confirmedTransaction
  ) { }
}

export async function getTransactions(
  connection,
  address
) {
  const transSignatures = await connection.getConfirmedSignaturesForAddress2(
    address
  );

  const transactions = [];
  for (let i = 0; i < transSignatures.length; i++) {
    const signature = transSignatures[i].signature;
    const confirmedTransaction = await connection.getConfirmedTransaction(
      signature
    );
    console.log(`confirmedTransaction ::: `, confirmedTransaction)
    if (confirmedTransaction) {
      const transWithSignature = {
        signature,
        confirmedTransaction
      };
      transactions.push(transWithSignature);
    }
  }
  return transactions;
}
