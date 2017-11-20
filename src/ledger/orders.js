/* @flow */
'use strict' // eslint-disable-line strict
const _ = require('lodash')
const utils = require('./utils')
const {validate} = utils.common
const parseAccountOrder = require('./parse/account-order')
import type {Connection} from '../common/connection.js'
import type {OrdersOptions, Order} from './types.js'

type GetOrders = Array<Order>

function formatResponse(address: string, responses: Object[]): Object[] {
  let orders = []
  for (const response of responses) {
    const offers = response.offers.map(offer => parseAccountOrder(address, offer));
    orders = orders.concat(offers)
  }
  return _.sortBy(orders, order => order.properties.sequence);
}

async function getOrders(address: string, options: OrdersOptions = {}
): Promise<GetOrders> {
  // 1. Validate:
  validate.getOrders({address, options})
  // 2. Setup Requst:
  const hasLimit = (options.limit !== undefined)
  const limitOptions = hasLimit && {
    max: utils.clamp(options.limit, 10, 400),
    collect: 'offers'
  }
  // 3. Make Request:
  const responses = await this.requestAll('account_offers', {
    account: address,
    ledger_index: options.ledgerVersion || await this.getLedgerVersion()
  }, limitOptions)
  // 4. Return Formatted Response:
  return formatResponse(address, responses)
}

module.exports = getOrders
