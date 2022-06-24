import React from "react";

// import "./TransactionView.css";



const TransactionsView = ({ transactions }) => {
  const getTransactions = () => {
    return transactions?.map((trans) => {
      return <TransactionItemView key={trans.signature} transaction={trans} />;
    });
  };

  return <div>{getTransactions()}</div>;
};


const TransactionItemView = ({ transaction }) => {
  const getTransactionItems = () => {
    const signature = transaction.signature?.toString();
    const meta = transaction.confirmedTransaction.meta;
    const trans = transaction.confirmedTransaction.transaction;
    let amount = 0;
    if (meta) {
      amount = meta.preBalances[0] - meta.postBalances[0];
    }
    return (
      <>
        <li key={signature + "signature"}>
          <label>Tx:</label> &nbsp;
          {signature}
        </li>
      </>
    );
  };

  return (
    <div className="trans-item">
      <ul className="trans-meta">{getTransactionItems()}</ul>
    </div>
  );
};

export default TransactionsView;
