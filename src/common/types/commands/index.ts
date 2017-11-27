import {AccountOffersRequest, AccountOffersResponse} from './account_offers';
export {AccountOffersRequest, AccountOffersResponse};
import {AccountInfoRequest, AccountInfoResponse} from './account_info';
export {AccountInfoRequest, AccountInfoResponse};
import {BookOffersRequest, BookOffersResponse} from './book_offers';
export {BookOffersRequest, BookOffersResponse};

export interface RippledCommandReturnManyMap {
  'account_offers': [AccountOffersRequest, AccountOffersResponse],
  'book_offers': [BookOffersRequest, BookOffersResponse]
}

export interface RippledCommandMap extends RippledCommandReturnManyMap {
  'account_info': [AccountInfoRequest, AccountInfoResponse],
}


export type RippledCommandReturnMany = keyof RippledCommandReturnManyMap;
export type RippledCommand = keyof RippledCommandMap;
