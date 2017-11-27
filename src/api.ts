import * as _ from 'lodash'
import {EventEmitter} from 'events'
import {Connection, errors, validate} from './common'
import * as server from './server/server'
const connect = server.connect
const disconnect = server.disconnect
const getServerInfo = server.getServerInfo
const getFee = server.getFee
const isConnected = server.isConnected
const getLedgerVersion = server.getLedgerVersion
import getTransaction from './ledger/transaction'
import getTransactions from './ledger/transactions'
import getTrustlines from './ledger/trustlines'
import getBalances from './ledger/balances'
import getBalanceSheet from './ledger/balance-sheet'
import getPaths from './ledger/pathfind'
import getOrders from './ledger/orders'
import getOrderbook from './ledger/orderbook'
import getSettings from './ledger/settings'
import getAccountInfo from './ledger/accountinfo'
import getPaymentChannel from './ledger/payment-channel'
import preparePayment from './transaction/payment'
import prepareTrustline from './transaction/trustline'
import prepareOrder from './transaction/order'
import prepareOrderCancellation from './transaction/ordercancellation'
import prepareEscrowCreation from './transaction/escrow-creation'
import prepareEscrowExecution from './transaction/escrow-execution'
import prepareEscrowCancellation from './transaction/escrow-cancellation'
import preparePaymentChannelCreate from './transaction/payment-channel-create'
import preparePaymentChannelFund from './transaction/payment-channel-fund'
import preparePaymentChannelClaim from './transaction/payment-channel-claim'
import prepareSettings from './transaction/settings'
import sign from './transaction/sign'
import combine from './transaction/combine'
import submit from './transaction/submit'
import {generateAddressAPI} from './offline/generate-address'
import computeLedgerHash from './offline/ledgerhash'
import signPaymentChannelClaim from './offline/sign-payment-channel-claim'
import verifyPaymentChannelClaim from './offline/verify-payment-channel-claim'
import getLedger from './ledger/ledger'


import RangeSet from './common/rangeset'
import * as ledgerUtils from './ledger/utils'
import * as schemaValidator from './common/schema-validator'
import {
  RippledCommandMap, RippledCommand,
  RippledCommandReturnManyMap, RippledCommandReturnMany
} from './common/types/commands'

type APIOptions = {
  server?: string,
  feeCushion?: number,
  trace?: boolean,
  proxy?: string,
  timeout?: number
}

/**
 * Get the response key / property name that contains the listed data for a
 * command. This varies from command to command, but we need to know it to
 * properly count across many requests.
 */
function getCollectKeyFromCommand(command: string): string|undefined {
  switch (command) {
    case 'account_offers':
    case 'book_offers':
      return 'offers';
    default:
      return undefined;
  }
}

// prevent access to non-validated ledger versions
class RestrictedConnection extends Connection {
  request(request: any, timeout?: number) {
    const ledger_index = request.ledger_index
    if (ledger_index !== undefined && ledger_index !== 'validated') {
      if (!_.isNumber(ledger_index) || ledger_index > this._ledgerVersion) {
        return Promise.reject(new errors.LedgerVersionError(
          `ledgerVersion ${ledger_index} is greater than server\'s ` +
          `most recent validated ledger: ${this._ledgerVersion}`))
      }
    }
    return super.request(request, timeout)
  }
}

class RippleAPI extends EventEmitter {

  _feeCushion: number
  connection: RestrictedConnection

  // these are exposed only for use by unit tests; they are not part of the API.
  static _PRIVATE = {
    validate: validate,
    RangeSet,
    ledgerUtils,
    schemaValidator
  }

  constructor(options: APIOptions = {}) {
    super()
    validate.apiOptions(options)
    this._feeCushion = options.feeCushion || 1.2
    const serverURL = options.server
    if (serverURL !== undefined) {
      this.connection = new RestrictedConnection(serverURL, options)
      this.connection.on('ledgerClosed', message => {
        this.emit('ledger', server.formatLedgerClose(message))
      })
      this.connection.on('error', (errorCode, errorMessage, data) => {
        this.emit('error', errorCode, errorMessage, data)
      })
      this.connection.on('connected', () => {
        this.emit('connected')
      })
      this.connection.on('disconnected', code => {
        this.emit('disconnected', code)
      })
    } else {
      // use null object pattern to provide better error message if user
      // tries to call a method that requires a connection
      this.connection = new RestrictedConnection(null, options)
    }
  }

  async request<K extends RippledCommand>(command: K, params: RippledCommandMap[K][0]): Promise<RippledCommandMap[K][1]>
  async request(command: RippledCommand, params: Object) {
    return this.connection.request({
      ...params,
      command
    })
  }

  async requestAll<K extends RippledCommandReturnMany>(command: K, params: RippledCommandReturnManyMap[K][0]): Promise<RippledCommandReturnManyMap[K][1][]>
  async requestAll(command: RippledCommandReturnMany, params: any, options: {collect?: string} = {}): Promise<any> {
    // If limit wasn't provided, return a single request in the requestAll
    // array format.
    if (params.limit === undefined) {
      return [await this.request(<any>command, params)]
    }
    // The data under collection is keyed based on the command. Fail if command
    // not recognized and collection key not provided.
    let collectKey = options.collect || getCollectKeyFromCommand(command)
    console.log(command, collectKey);
    if (!collectKey) {
      throw new errors.ValidationError(`no collect key for command ${command}`)
    }
    const results = []
    let count = 0
    let countTo = params.limit
    let marker = params.marker
    let lastBatchLength
    do {
      const countRemaining = countTo - count
      const repeatProps = {
        ...params,
        limit: countRemaining,
        marker
      }
      const singleResult = await this.request(command, repeatProps)
      marker = singleResult.marker
      count += singleResult[collectKey].length
      lastBatchLength = singleResult[collectKey].length
      results.push(singleResult)
    } while(!!marker && count < countTo && lastBatchLength !== 0)
    return results
  }

  connect = connect
  disconnect = disconnect
  isConnected = isConnected
  getServerInfo = getServerInfo
  getFee = getFee
  getLedgerVersion = getLedgerVersion

  getTransaction = getTransaction
  getTransactions = getTransactions
  getTrustlines = getTrustlines
  getBalances = getBalances
  getBalanceSheet = getBalanceSheet
  getPaths = getPaths
  getOrders = getOrders
  getOrderbook = getOrderbook
  getSettings = getSettings
  getAccountInfo = getAccountInfo
  getPaymentChannel = getPaymentChannel
  getLedger = getLedger

  preparePayment = preparePayment
  prepareTrustline = prepareTrustline
  prepareOrder = prepareOrder
  prepareOrderCancellation = prepareOrderCancellation
  prepareEscrowCreation = prepareEscrowCreation
  prepareEscrowExecution = prepareEscrowExecution
  prepareEscrowCancellation = prepareEscrowCancellation
  preparePaymentChannelCreate = preparePaymentChannelCreate
  preparePaymentChannelFund = preparePaymentChannelFund
  preparePaymentChannelClaim = preparePaymentChannelClaim
  prepareSettings = prepareSettings
  sign = sign
  combine = combine
  submit = submit

  generateAddress = generateAddressAPI
  computeLedgerHash = computeLedgerHash
  signPaymentChannelClaim = signPaymentChannelClaim
  verifyPaymentChannelClaim = verifyPaymentChannelClaim
  errors = errors
}

export {
  RippleAPI
}
