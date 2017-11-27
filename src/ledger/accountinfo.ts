import {validate, removeUndefined, dropsToXrp} from '../common'
import {AccountInfoResponse} from '../common/types/commands';
import {RippleAPI} from '../api';

type GetAccountInfoOptions = {
  ledgerVersion?: number
}

type GetAccountInfoFormattedResponse = {
  sequence: number,
  xrpBalance: string,
  ownerCount: number,
  previousInitiatedTransactionID: string,
  previousAffectingTransactionID: string,
  previousAffectingTransactionLedgerVersion: number
}

function formatAccountInfo(
  response: AccountInfoResponse
): GetAccountInfoFormattedResponse {
  const data = response.account_data
  return removeUndefined({
    sequence: data.Sequence,
    xrpBalance: dropsToXrp(data.Balance),
    ownerCount: data.OwnerCount,
    previousInitiatedTransactionID: data.AccountTxnID,
    previousAffectingTransactionID: data.PreviousTxnID,
    previousAffectingTransactionLedgerVersion: data.PreviousTxnLgrSeq
  })
}

export default async function getAccountInfo(
  this: RippleAPI, address: string, options: GetAccountInfoOptions = {}
): Promise<GetAccountInfoFormattedResponse> {
  // 1. Validate:
  validate.getAccountInfo({address, options})
  // 2. Make Request:
  const response = await this.request('account_info', {
    account: address,
    ledger_index: options.ledgerVersion || 'validated'
  })
  // 3. Return Formatted Response:
  return formatAccountInfo(response)
}
