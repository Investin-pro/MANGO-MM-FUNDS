import React from 'react';
import {
  Button
} from 'reactstrap';
import { ConnectWalletModal } from './ConnectWalletModal';

export const CustomNavbar = (props) => {

  return (
    <div className="d-flex flex-row-reverse p-2">
      <ConnectWalletModal buttonLabel="Connect Wallet"/>
    </div>
  );
}