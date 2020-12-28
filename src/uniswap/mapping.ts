/* eslint-disable prefer-const */
import {Address, BigDecimal, BigInt} from '@graphprotocol/graph-ts'
import {Burn, Mint, Transfer} from '../../generated/templates/UniswapPair/Pair'
import {ERC20} from '../../generated/templates/UniswapPair/ERC20'
import {
  ADDRESS_ZERO,
  createException, createOrUpdate,
  updateDayData,
} from "../util";

let PROVIDER_NAME = "Uniswap";

export function handleTransfer(event: Transfer): void {
  let uniV2TokenAddrs = event.address;
  let contract = ERC20.bind(uniV2TokenAddrs);

  let to = event.params.to as Address;
  let from = event.params.from as Address;

  if (to == uniV2TokenAddrs || from == uniV2TokenAddrs) {
    createException(uniV2TokenAddrs, event.transaction.hash, "Saw a transfer event going to or from itself. Please check!!!")
    return;
  }

  if (to.toHexString() == ADDRESS_ZERO) { // BURN
    let amt = event.params.value
    let userAddrs = event.transaction.from;
    let lp = createOrUpdate(PROVIDER_NAME, uniV2TokenAddrs, userAddrs, amt, 'burn');
    updateDayData(lp, userAddrs, event);
  } else if (from.toHexString() == ADDRESS_ZERO) { // MINT
    let amt = event.params.value
    let userAddrs = event.transaction.from;
    let lp = createOrUpdate(PROVIDER_NAME, uniV2TokenAddrs, userAddrs, amt, 'mint');
    updateDayData(lp, userAddrs, event);
  } else { // TRANSFER
    let lp = createOrUpdate(PROVIDER_NAME, uniV2TokenAddrs, to, contract.balanceOf(to), 'transfer');
    updateDayData(lp, to, event);
    let lpFrom = createOrUpdate(PROVIDER_NAME, uniV2TokenAddrs, from, contract.balanceOf(from), 'transfer');
    updateDayData(lpFrom, from, event);
  }

}

