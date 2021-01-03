/* eslint-disable prefer-const */
import {Address, log} from '@graphprotocol/graph-ts'
import {Transfer} from '../../generated/templates/UniswapPair/Pair'
import {ERC20} from '../../generated/templates/UniswapPair/ERC20'
import {ADDRESS_ZERO, createException, createOrUpdate, updateDayData,} from "../util";

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

  let initiator = event.transaction.from;
  if (to.toHexString() == ADDRESS_ZERO) { // BURN
    let amt = event.params.value
    log.warning("BURN event for tx {} for user {} with amount {}", [event.transaction.hash.toHexString(), initiator.toHexString(), amt])
    let lp = createOrUpdate(PROVIDER_NAME, uniV2TokenAddrs, initiator, amt, 'burn');
    updateDayData(lp, initiator, event);
  } else if (from.toHexString() == ADDRESS_ZERO) { // MINT
    let amt = event.params.value
    log.warning("MINT event for tx {} for user {}", [event.transaction.hash.toHexString(), initiator.toHexString(), amt])
    let lp = createOrUpdate(PROVIDER_NAME, uniV2TokenAddrs, initiator, amt, 'mint');
    updateDayData(lp, initiator, event);
  } else { // TRANSFER

    if (initiator == to) {
      let lp = createOrUpdate(PROVIDER_NAME, uniV2TokenAddrs, to, contract.balanceOf(to), 'transfer');
      updateDayData(lp, to, event);
    }
    if (initiator == from) {
      let lpFrom = createOrUpdate(PROVIDER_NAME, uniV2TokenAddrs, from, contract.balanceOf(from), 'transfer');
      updateDayData(lpFrom, from, event);
    }
  }

}

