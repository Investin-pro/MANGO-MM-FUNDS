import EventEmitter from 'eventemitter3'

export class PhantomWalletAdapter extends EventEmitter {
  constructor() {
    super()
    this.connect = this.connect.bind(this)
  }

  get _provider() {
    if ((window)?.solana?.isPhantom) {
      return (window).solana
    }
    return undefined
  }

  _handleConnect = (...args) => {
    this.emit('connect', this.publicKey)
  }

  _handleDisconnect = (...args) => {
    this.emit('disconnect', ...args)
  }

  get connected() {
    return this._provider?.isConnected || false
  }

  get autoApprove() {
    return this._provider?.autoApprove || false
  }

  // eslint-disable-next-line
  async signAllTransactions(transactions) {
    if (!this._provider) {
      return transactions
    }

    return this._provider.signAllTransactions(transactions)
  }

  get publicKey() {
    return this._provider?.publicKey
  }

  // eslint-disable-next-line
  async signTransaction(transaction) {
    if (!this._provider) {
      return transaction
    }

    return this._provider.signTransaction(transaction)
  }

  connect() {
    if (!this._provider) {
      return
    }
    if (!this._provider.listeners('connect').length) {
      this._provider.on('connect', () => this._handleConnect())
    }
    if (!this._provider.listeners('disconnect').length) {
      this._provider.on('disconnect', () => this._handleDisconnect())
    }
    return this._provider?.connect()
    //  this.emit('')
  }

  disconnect() {
    if (this._provider) {
      this._provider.disconnect()
    }
  }
}
