import { Store } from "pullstate";

export const GlobalState = new Store({
  walletProvider: {},
  address: '',
  createFundPublicKey: ''
});