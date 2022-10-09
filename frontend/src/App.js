import { Container } from 'reactstrap';
import { CustomNavbar } from './components/CustomNavbar';
import './App.css';
import { useEffect, useState } from 'react';

import { GlobalState } from './store/globalState'
import { InitialisedFund } from './components/InitialisedFund';
import { Deposit } from './components/Deposit';
import { ProcessDeposits } from './components/ProcessDeposits';

import { Withdraw } from './components/Withdraw';
// import { Claim } from './components/ClaimFee';
import { DisplayInfo } from './components/DisplayInfo';
import { AllFundsInvestors } from './components/AllFundsInvestors';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ProcessWithdraws } from './components/ProcessWithdraws';
import { Settlement } from './components/Settlement';
import { InitForceSettle } from './components/InitForceSettle';
import { ForceUpdatePerp } from './components/ForceUpdatePerp';
import { ForceProcessWithdraws } from './components/ForceProcessWithdraws';
import { ForceUpdateSpot } from './components/ForceUpdateSpot';

function App() {
  const walletProvider = GlobalState.useState(s => s.walletProvider);
  const address = GlobalState.useState(s => s.address);
  const [transactions, setTransactions] = useState([]);

  // useEffect(() => {
  //   if (walletProvider?.publicKey) {
  //     console.log(`walletProvider?.publicKey ::: `, walletProvider?.publicKey)
  //     getTransactions(connection, walletProvider.publicKey).then((trans) => {
  //       console.log(`trans ::: `, trans)
  //       setTransactions(trans);
  //     });
  //   }
  // }, [walletProvider])

  return (
    <div>
      <Container>

      <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />

        <CustomNavbar />
        {
          address &&
          <p>Connected to {address}</p>
        }
        {/* {
          transactions && <TransactionsView transactions={transactions} />
        } */}
        <InitialisedFund />
        <Deposit />
        <Withdraw />
        <ProcessDeposits />
        <ProcessWithdraws />
        <Settlement />
        <InitForceSettle />
        <ForceProcessWithdraws/>
        {/* <Claim /> */}
        <ForceUpdatePerp/>
        <ForceUpdateSpot/>
        <AllFundsInvestors/>
        <DisplayInfo/>
      </Container>
    </div>
  );
}

export default App;
